# GenUI Progressive Streaming Rendering Plan

## Problem

Today `AiFormat` renders a GenUI `component` block only after the server closes the full code fence.

Current behavior:

- The chat stream appends tokens into the active assistant message.
- `AiFormat` detects an unfinished ` ```component ` block.
- While the block is open, the directive renders the markdown text before the component plus a skeleton.
- The actual GenUI HTML/CSS is rendered only after the closing fence arrives.

User-visible issue:

- Long GenUI answers feel frozen.
- The user sees only a skeleton even when useful partial HTML/CSS has already arrived.
- Large dashboard/table responses lose the benefit of token streaming.

## Goal

Add progressive GenUI rendering for streamed `component` blocks.

Target behavior:

- As the LLM streams partial HTML/CSS, the frontend parses and sanitizes the partial component.
- The user sees a stable, progressively improving GenUI preview instead of only a skeleton.
- When the closing fence arrives, the final sanitized component replaces or reconciles the preview without visual jumping.
- Existing markdown rendering, skeleton fallback, cancellation, and completed-component sanitizer behavior remain intact.

## Non-Goals

- Do not change backend streaming protocol in version 1 unless frontend-only parsing proves insufficient.
- Do not execute scripts or support interactive JavaScript inside GenUI.
- Do not loosen existing GenUI sanitization rules.
- Do not add a new GenUI component framework.
- Do not redesign the chat UI.
- Do not support arbitrary malformed HTML perfectly; support safe, useful partial rendering.

## Existing Context

Relevant files:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
frontend/src/app/core/directives/ai-format.directive.spec.ts
frontend/src/app/features/chat/chat/chat.ts
frontend/src/app/features/chat/chat-message/chat-message.ts
frontend/src/app/core/services/chat.service.ts
backend/src/modules/admin-agent/constants/system-context.constant.ts
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

Current important behavior:

- `AiFormat.extractComponentParts(...)` renders only closed `component` fences.
- `AiFormat.isStreamingComponent(...)` detects unfinished component blocks.
- `AiFormat.renderStreamingComponent(...)` currently renders markdown before the component and then calls `renderSkeletonOnce()`.
- `AiFormat.sanitizeComponentHtml(...)` already removes dangerous tags and sanitizes CSS.
- Chat stream cancellation already works by unsubscribing from `sendMessageStream(...)`.

## Recommended Design

Introduce a small progressive parser inside the frontend directive.

The parser should:

- Extract the partial `component` block content from the current streamed message.
- Split partial content into candidate `<style>` blocks and HTML body content.
- Sanitize CSS and HTML with the existing rules.
- Repair only the minimum structure required for browser parsing.
- Render a preview when there is enough safe content.
- Fall back to the skeleton when the partial content is too incomplete or unsafe.

Recommended new internal type:

```ts
type ProgressiveComponentParts = {
  before: string;
  partialComponentHtml: string;
  after: string;
  complete: boolean;
};
```

Recommended internal render path:

```txt
ngOnChanges()
  -> extractComponentParts(raw)
  -> render final component when complete
  -> extractProgressiveComponentParts(raw)
  -> render progressive component when partial is renderable
  -> render markdown fallback/skeleton when not renderable
```

## Progressive Parsing Rules

### Component Fence Extraction

Support these stream states:

````txt
text before
```component
<style>
...
```
````

````txt
text before
```component
<style>...</style>
<section class="...">
...
```
````

````txt
text before
```component
<style>...</style>
<section class="...">...</section>
```
````

Do not treat generic code fences as GenUI. Keep the current strict `component` fence requirement.

### CSS Handling

For partial CSS:

- Render CSS only after a full `</style>` exists, or after complete `{ ... }` rule pairs can be parsed safely.
- Reuse `sanitizeComponentCss(...)`.
- Continue stripping CSS custom property declarations.
- Continue blocking `:root`, `html`, `body`, global table/button/header overrides, and unsafe `.btn` selectors.
- If the `<style>` tag is open and the CSS rule is incomplete, omit the partial trailing rule instead of blocking the whole preview.

### HTML Handling

For partial HTML:

- Use `DOMParser` for candidate content.
- Remove `script`, `iframe`, `object`, and `embed`.
- Require at least one renderable root candidate: `div`, `section`, or `article`.
- Allow browser auto-closing for incomplete child elements.
- Do not invent missing data values or fallback text.
- Do not render if the partial body only contains a broken tag opener such as `<section class=`.

### Preview Stability

Avoid replacing the whole message more often than needed.

Recommended first version:

- Keep one preview host element for the active partial component.
- Replace only that preview host's `innerHTML` with sanitized progressive HTML.
- Keep markdown before the component stable.
- Once the component is complete, call the existing final render path.

Future optimization:

- Add DOM diffing inside the preview host if full replacement causes visible flicker.

## Implementation Steps

### Step 1 - Add Progressive Extraction

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Add:

```ts
private extractProgressiveComponentParts(raw: string): ProgressiveComponentParts | null
```

Responsibilities:

- Find ` ```component `.
- Return text before the component.
- Return the current partial component content after the fence marker.
- Treat a closed fence as complete and leave final rendering to `extractComponentParts(...)`.

Verification:

- Generic ` ```css `, ` ```html `, and ` ```ts ` fences are not treated as GenUI.
- Markdown before the component is preserved.

### Step 2 - Add Partial CSS Sanitization

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Add a helper that keeps only complete CSS rules from open style text:

```ts
private sanitizePartialComponentCss(css: string): string
```

Responsibilities:

- Preserve complete rules.
- Drop incomplete trailing rules.
- Reuse the same selector/declaration safety rules.
- Preserve complete `@keyframes` blocks only when balanced.

Verification:

- Incomplete CSS does not leak unsafe selectors.
- Complete local CSS rules render during streaming.
- CSS variable overrides remain stripped.

### Step 3 - Add Partial HTML Sanitization

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Add:

```ts
private sanitizeProgressiveComponentHtml(partialHtml: string): string
```

Responsibilities:

- Extract any complete or safely usable style content.
- Parse the partial body with `DOMParser`.
- Remove dangerous elements.
- Require a renderable root.
- Return an empty string when the partial is not renderable yet.

Verification:

- A partial `<section><h2>Title` can render.
- A partial `<section class=` does not render and keeps the skeleton.
- Dangerous tags are removed before preview rendering.

### Step 4 - Replace Skeleton-Only Streaming Path

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Change `renderStreamingComponent(...)` so it:

- Clears the host.
- Appends markdown before the component.
- Attempts progressive component rendering.
- Renders the skeleton only when no safe preview is available.

Suggested behavior:

```txt
if safe progressive HTML exists:
  append preview host
else:
  render skeleton once
```

Verification:

- Existing skeleton still appears for very early stream chunks.
- Preview replaces skeleton as soon as there is renderable safe HTML.
- Final closed component still uses the existing final sanitizer path.

### Step 5 - Add Focused Directive Tests

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.spec.ts
```

Add tests for:

- Partial component block renders a sanitized preview once a root element exists.
- Very incomplete HTML keeps skeleton behavior.
- Partial CSS keeps complete local rules and drops incomplete trailing rules.
- Unsafe CSS selectors are blocked during progressive rendering.
- Dangerous tags are removed during progressive rendering.
- Closed `component` fences still use final rendering.
- Generic code fences are still rendered as markdown/code, not GenUI.

Verification command:

```txt
npx ng test --watch=false
```

Run from:

```txt
frontend/
```

### Step 6 - Browser Smoke Test

Use a mocked or manually forced streamed assistant message that emits these chunks:

````txt
```component
<style>.demo-card { color: var(--color-text); }</style>
<section class="demo-card">
  <h2>
```
````

Then:

```txt
Streaming title
```

Then:

````txt
  </h2>
</section>
```
````

Expected:

- Skeleton appears only for the earliest unusable chunk.
- The card appears before the closing fence.
- The title text updates while streaming.
- Final render does not introduce a large layout jump.

## Risks And Decisions

### Risk: Broken Partial HTML Causes Flicker

Progressive parsing may produce different DOM shapes as tags arrive.

Decision:

- Version 1 accepts minor preview reconciliation.
- Use skeleton until a root element is parseable.
- Keep full DOM diffing as a future optimization only if flicker is visible.

### Risk: Sanitizer Drift

Adding a separate partial sanitizer can accidentally become less strict than final rendering.

Decision:

- Partial sanitizer must call the same CSS selector/declaration guards.
- Tests must cover unsafe selectors and dangerous tags in partial mode.

### Risk: Style Flicker

Rendering CSS before enough rules exist can create visual jumps.

Decision:

- Render only complete CSS rules.
- Drop incomplete trailing rules.
- Prefer no CSS over unsafe or unstable CSS.

### Risk: Backend Prompt Still Emits Style Late

If the LLM emits body HTML before CSS, early preview may be unstyled.

Decision:

- Accept this in version 1.
- Optionally update GenUI prompt later to ask for `<style>` first, which is already expected by current system context.

### Risk: Multiple GenUI Components

System context allows multiple sequential GenUI components for multi-tool results.

Decision:

- Version 1 supports progressive rendering for the first currently open component block.
- Already closed previous components should render through the final path.
- If multiple open blocks become possible in one message, add parser support later.

## Definition Of Done

- Unfinished `component` blocks render safe partial GenUI when possible.
- Skeleton remains only while the partial component is not yet safely renderable.
- Final closed components still render exactly through the existing final sanitizer flow.
- Markdown before and after completed components remains preserved.
- Generic code fences are not misdetected as GenUI.
- Unsafe tags, unsafe selectors, and CSS variable overrides are blocked in progressive mode.
- Frontend tests pass.
- Frontend build passes.
- If code is changed, run the corrupted-character scan on touched Hebrew files if any Hebrew is edited.

## Verification Commands

Run from:

```txt
frontend/
```

Commands:

```txt
npx ng test --watch=false
npx ng build
```

Optional targeted mojibake scan after implementation: use the exact project scan pattern from `AGENTS.md` against any touched Hebrew files.

## Architecture Diagram Impact

This plan is frontend rendering behavior only.

No architecture diagram update is needed for the plan itself. If implementation later changes the streaming protocol, backend event shape, or GenUI generation contract, update:

```txt
documents/architecture-diagram.md
```

## Open Decisions

- Is frontend-only progressive parsing enough for version 1, or should the backend stream structured GenUI chunks later?
- Should partial CSS render from balanced rules inside an open `<style>`, or only after `</style>` arrives?
- Should preview updates be throttled to animation frames if frequent DOM replacement becomes expensive?
- Should multiple sequential GenUI components stream progressively in version 1, or only the active open component?

## Suggested Implementation Order

1. Add tests that capture the current skeleton-only streaming limitation.
2. Add progressive extraction.
3. Add partial CSS/HTML sanitization using existing sanitizer helpers.
4. Replace the skeleton-only streaming render path.
5. Run frontend tests and build.
6. Smoke-test the chat stream with a long GenUI response.

## Update v.1

Role: Senior Angular Developer & Architectural Assistant
Task: Implement GenUI Progressive Streaming Rendering
Context:
We are upgrading our frontend GenUI rendering mechanism. Currently, `AiFormat` in `ai-format.directive.ts` waits for the full ```component code fence to close before rendering the HTML/CSS component. This causes frozen states during streaming. We want to enable progressive streaming rendering of safe, partial HTML/CSS components while maintaining strict isolation, performance, and security.

Please implement this feature by strictly following the instructions, constraints, and architecture outlined below.

---

### Core Engineering Requirements

#### 1. Robust Partial HTML Extraction & Safety (Tag Guard)

- Implement `extractProgressiveComponentParts(raw: string): ProgressiveComponentParts | null`.
- Avoid rendering incomplete or malformed HTML that cuts off mid-tag (e.g., `<div class="glass-pa` or `<section class=`).
- Implement a helper to scan the trailing edge of the partial HTML stream. If the stream ends inside an open tag (between `<` and `>`) or inside an unclosed attribute quote (`"` or `'` after an `=` sign), backtrack the string to the last stable completed element or delay rendering until the token containing the closing tag/quote is received.

#### 2. Strict CSS Scope Isolation & Incomplete Rule Drop

- Ensure that during streaming, style rules inside `<style>` do not leak into the global document scope.
- Scrape and sanitize the streaming CSS rules dynamically.
- Render _only_ fully complete CSS rules (rules with matching `{` and `}`). Drop any trailing incomplete CSS rule in the streaming chunk until it is fully formed.
- Re-use existing sanitization rules to block `:root`, `html`, `body`, global table/button/header overrides, and custom CSS property declarations (`--variable`).
- Keyframes and animations must only be rendered once their opening and closing braces are balanced.

#### 3. DOM Thrashing & Render Throttling

- Updating the DOM (`.innerHTML` of the preview host) on every incoming token (every ~15-20ms) causes severe layout thrashing and micro-stutters.
- Throttle the progressive rendering updates to `requestAnimationFrame` or a micro-delay (30ms-50ms) to ensure smooth browser painting and prevent blocking the Main Thread during rapid token reception.

#### 4. Multi-Component and Sequential Support

- If a message contains multiple separate ` ```component ` blocks or a mix of text and tools, render them sequentially and handle state transitions correctly.
- Ensure that the last-block stability checks (`isLastBlockStable`) correctly distinguish between active, open components and completed ones.

#### 5. Strict Code Quality & Formatting Rules

You must strictly adhere to the following formatting standards in any code you produce. If your generated code violates these rules, it must be rewritten immediately:

- EVERY function/method must be fully structured on separate lines — never collapsed into single-line formats.
- Opening curly braces `{` for functions, classes, and control flow blocks (`if`, `for`, `while`, `switch`) must be placed on the SAME line as the declaration/condition.
- Correct spacing after commas and around operators is mandatory.
- Lines must not exceed 120 characters.
- Every `if`/`for`/`while` block must be wrapped in curly braces `{}` and structured on new lines.
- NO placeholders or comments such as `// ... rest of code` or `// existing code` are allowed. All files must be written in full.

---

### Implementation Steps

#### Step 1: Update the Extraction and Parsing logic

Modify `frontend/src/app/core/directives/ai-format.directive.ts`.

- Introduce `ProgressiveComponentParts` interface:

```typescript
export interface ProgressiveComponentParts {
  before: string;
  partialComponentHtml: string;
  after: string;
  complete: boolean;
}
```

- Implement `extractProgressiveComponentParts(raw: string): ProgressiveComponentParts | null` using safe regex/string indexing.

#### Step 2: Implement Partial CSS/HTML Sanitization

- Implement `sanitizePartialComponentCss(css: string): string` to extract balanced blocks and drop trailing partials.
- Implement `sanitizeProgressiveComponentHtml(partialHtml: string): string` utilizing the tag guard rules and DOMParser. Require a valid, renderable root candidate (`div`, `section`, `article`) before swapping out the skeleton loader.

#### Step 3: Integrate with Streaming Rendering Path

- Refactor `renderStreamingComponent(...)` in `ai-format.directive.ts` to dynamically swap the skeleton loader with the progressive component preview once safe, renderable elements exist. Ensure the markdown text preceding the component remains completely stable and does not flicker.

#### Step 4: Write Focused Unit Tests

Update `frontend/src/app/core/directives/ai-format.directive.spec.ts`.

- Test that partial components with valid root elements render previews progressively.
- Test that incomplete tags or missing root elements maintain the skeleton loader state safely.
- Test that partial, unsafe CSS selectors or dangerous tags (`script`, `iframe`, etc.) are stripped immediately during progressive streams.
- Ensure generic code fences (e.g. ` ```ts ` or ` ```html `) are never erroneously parsed as GenUI.

---

### Verification and Done Criteria

1. Run `npx ng test --watch=false` from `frontend/` to verify all tests pass.
2. Run `npx ng build` from `frontend/` to ensure no compilation issues.
3. No corrupted encoding characters are introduced.

```

```
