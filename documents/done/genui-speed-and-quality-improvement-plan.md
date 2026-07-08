# GenUI Speed and Quality Improvement Plan

## Problem

GenUI responses are the core user experience of the chat, but today they feel
slow and frozen in several places. The slowness is not in one spot — it is
spread across the backend prompt, the streaming protocol, the chat store
batching layer, the per-token chat-message character queue, and the
`AiFormat` renderer.

User-visible issues:

- LLM `time-to-first-token` is high because the system prompt template ships
  the full GenUI spec constant on every request, even for queries that
  produce plain markdown or tool calls.
- During a long GenUI stream, the user sees a flat skeleton until the closing
  ```component``` fence arrives. Long answers feel frozen.
- After the closing fence lands, `AiFormat` throws away the entire DOM and
  re-parses the whole message from scratch, causing a visible layout jump.
- The chat-message component buffers every token in a per-character queue
  with 18–35 ms delays, even for streaming GenUI HTML where the user wants
  to see content as fast as possible.
- The CSS/HTML the LLM emits is verbose: every card duplicates the same
  design system boilerplate, every component uses inline `onmouseover`
  handlers, and the prompt asks the LLM to write rich CSS keyframes even
  when the final output is a small status card.
- `ChatService.sendMessageStream` parses one JSON line per token, which is
  fine, but `Chat.ts` writes every token into a signal that re-renders the
  whole `Chat` subtree. Heavy re-render cost per token.
- The architecture diagram does not show the streaming event flow
  (`step` / `token` / `done`), so the rendering path is hard to reason about
  when something goes wrong.

## Goal

Make GenUI responses feel fast and stable end-to-end without weakening the
existing security guarantees, the LLM-driven design system, or the chat
cancellation flow.

Target behavior:

- Time-to-first-token drops for prompts that do not need a GenUI template
  (small talk, tool calls, follow-up questions).
- While a ` ```component ` block is open, the user sees a stable, safe,
  progressively improving preview instead of a flat skeleton.
- When the closing fence arrives, the final component replaces the preview
  with no visible layout jump.
- Tokens for a component block flush faster than tokens for prose so the
  user feels the stream is responsive.
- GenUI HTML/CSS emitted by the LLM is smaller and more consistent, so
  prompt size, network size, and DOM size all shrink.
- The architecture diagram and the chat event flow are documented in one
  place so future GenUI work does not have to rediscover the pipeline.

## Non-Goals

- Do not change the chat backend REST contract in version 1
  (`POST /admin-agent/query-stream` still emits `step` / `token` lines).
- Do not execute scripts, allow `javascript:` URLs, or relax the existing
  `AiFormat` CSS/HTML sanitization.
- Do not redesign the chat UI, the message bubble, or the action bar.
- Do not switch LLM providers or change the active model selection logic.
- Do not migrate to a streaming SSE-only protocol in this plan; keep the
  current newline-delimited JSON line protocol.
- Do not add a new GenUI component framework; the LLM still emits raw HTML
  inside ` ```component ` fences.

## Existing Context

Files this plan touches or references:

```txt
backend/src/modules/admin-agent/constants/system-context.constant.ts
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
backend/src/modules/admin-agent/admin-agent.service.ts
backend/src/modules/admin-agent/admin-agent.controller.ts
backend/src/modules/llm/services/llm-client.service.ts
backend/src/modules/llm/services/llm-tasks.service.ts
frontend/src/app/core/directives/ai-format.directive.ts
frontend/src/app/core/directives/ai-format.directive.spec.ts
frontend/src/app/core/services/chat.service.ts
frontend/src/app/core/store/chat.store.ts
frontend/src/app/features/chat/chat/chat.ts
frontend/src/app/features/chat/chat/chat.html
frontend/src/app/features/chat/chat-message/chat-message.ts
frontend/src/app/features/chat/chat-message/chat-message.html
documents/architecture-diagram.md
```

Important current behavior that this plan preserves:

- `AiFormat` already sanitizes the closed component HTML: it removes
  `script` / `iframe` / `object` / `embed`, blocks `:root` / `html` / `body`
  / unscoped `table` / `button` / `h1` / `h2` / `.btn` selectors, and
  strips CSS custom-property declarations from CSS rule bodies.
- `AiFormat` already detects a ` ```component ` fence open during streaming
  and renders a skeleton until the closing fence arrives.
- `ChatMessage` already has a per-character queue
  (`BASE_CHARACTER_DELAY_MS = 18`, `CHARACTER_DELAY_JITTER_MS = 17`) and
  the queue is bypassed for non-active streams.
- `Chat` already cancels the active stream via `AbortController` and
  preserves partial content.
- `LlmClientService.generateStream` already retries on 429 / 503 / 502 and
  yields the raw `delta.content` token text.

## Recommended Design

Treat the GenUI speed problem as five layered improvements, each one
independently shippable and individually reversible.

```txt
Phase 1 - Frontend progressive streaming rendering
  Replace the skeleton-only streaming path with a safe partial HTML/CSS
  preview, and replace the closed-fence DOM-thrash with a stable
  finalization pass.

Phase 2 - Smarter chat message flushing
  Flush tokens faster when a component block is open or just closed, and
  flush slower for prose so the typing animation stays readable.

Phase 3 - Backend prompt trimming
  Split the system context so plain tool calls and short prose do not pay
  for the full GenUI spec, and tighten the GenUI template to reduce
  per-component HTML/CSS verbosity.

Phase 4 - Streaming and store efficiency
  Avoid per-token signal writes in `Chat`, batch token events, and add a
  tiny cache for the parsed GenUI preview so a re-render after a tiny
  token does not re-parse the whole message.

Phase 5 - Documentation and observability
  Document the streaming event flow in the architecture diagram and add
  one lightweight log line in the admin-agent service that records
  time-to-first-token, total tokens, and component count.
```

Each phase has its own Definition of Done. The plan can be closed when all
five phases pass their own DoD.

## Phase 1 - Frontend Progressive Streaming Rendering

This phase replaces the older
`documents/features/todo/genui-progressive-streaming-rendering-plan.md`
in place. That older plan is a subset of this phase, and any open
questions there are answered here.

### Phase 1 Problems

- During streaming, the user sees a flat skeleton until the closing
  ```component``` fence arrives.
- When the fence closes, `AiFormat` rebuilds the entire message body
  from scratch, which causes a visible layout jump.

### Phase 1 Goals

- A safe partial preview appears as soon as there is renderable HTML.
- The preview keeps the markdown text before the component stable.
- The final component replaces the preview without a layout jump.
- The skeleton remains only when the partial component is not yet
  safely renderable.

### Phase 1 Implementation Steps

#### Step 1.1 - Add a Progressive Parser

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Add a small internal type and extractor:

```ts
type ProgressiveComponentParts = {
  before: string;
  partialComponentHtml: string;
  after: string;
  complete: boolean;
};

private extractProgressiveComponentParts(
  raw: string,
): ProgressiveComponentParts | null
```

Responsibilities:

- Find the first ` ```component ` fence marker.
- If the fence is closed (` ... ``` ` follows), return
  `complete: true` and let the existing final path handle it.
- If the fence is open, return the text before the fence, the partial
  content after the fence marker, and an empty `after`.
- Reject generic code fences such as ` ```css `, ` ```html `, and
  ` ```ts ` exactly the way the existing detector does.

Tag guard:

- If the partial HTML ends inside an open tag (between `<` and `>`) or
  inside an unclosed attribute quote, backtrack the string to the last
  stable completed element and return that trimmed prefix instead.
- A "stable completed element" means the partial ends at `>` and the
  element either has a closing tag in the partial or is a known
  self-closing element (`<img>`, `<br>`, `<hr>`, `<input>`, `<span ... />`).

#### Step 1.2 - Add Partial CSS Sanitization

Add:

```ts
private sanitizePartialComponentCss(css: string): string
```

Responsibilities:

- Reuse the existing `splitCssRules`, `sanitizeCssRule`,
  `sanitizeSelectorList`, `isUnsafeSelector`, and
  `removeCssCustomPropertyDeclarations` helpers from the closed-fence
  path.
- Keep only complete rules (matching `{` / `}` pairs).
- Drop an incomplete trailing rule instead of blocking the preview.
- Keep balanced `@keyframes` only.
- Reject `:root`, `html`, `body`, unscoped `table` / `button` / `h1` /
  `h2` / `.btn` selectors.

#### Step 1.3 - Add Partial HTML Sanitization

Add:

```ts
private sanitizeProgressiveComponentHtml(
  partialHtml: string,
): string
```

Responsibilities:

- Extract any complete or safely usable `<style>` content.
- Parse the partial body with `DOMParser`.
- Remove `script`, `iframe`, `object`, `embed`.
- Require at least one renderable root candidate
  (`div`, `section`, `article`).
- If the partial only contains a broken tag opener such as
  `<section class=`, return an empty string so the skeleton stays.
- Return the sanitized partial HTML for the preview host to render.

#### Step 1.4 - Throttle Preview Updates

The existing `ngOnChanges` runs once per token, which means the parser
and sanitizer can run dozens of times per second. That is wasted CPU
during heavy streams.

Add:

```ts
private previewRafHandle: number | null = null;

private scheduleProgressivePreview(
  raw: string,
  beforeMarkdown: string,
): void
```

Responsibilities:

- Coalesce token-driven previews into one update per
  `requestAnimationFrame`.
- Always use the latest raw text, never a stale one.
- Do not coalesce the closed-fence final path.

Verification:

- Under simulated high-frequency token emission, the directive performs
  at most one preview update per frame.

#### Step 1.5 - Replace the Skeleton-Only Streaming Path

Change `renderStreamingComponent(raw)` so it:

- Clears the host.
- Appends the markdown before the component (stable for the lifetime of
  the partial).
- Calls `scheduleProgressivePreview(raw, beforeMarkdown)` instead of
  immediately calling `renderSkeletonOnce()`.
- The progressive path renders the preview if and only if
  `sanitizeProgressiveComponentHtml(...)` returns non-empty HTML.
- Otherwise it calls `renderSkeletonOnce()`.

Behavior contract:

```txt
if safe progressive HTML exists:
  render preview into a stable host
else:
  render skeleton once
```

The stable preview host is a single child element that the directive
keeps for the entire partial lifecycle. Its `innerHTML` is replaced on
each rAF tick. This avoids creating a new DOM tree per token.

#### Step 1.6 - Replace DOM-Thrash Finalization

Today `renderComponentResponse(parts)` calls
`this.el.nativeElement.innerHTML = ''` and rebuilds the markdown
before / component / markdown-after sections from scratch.

Change it to:

- Keep the existing host children where they already exist.
- Replace the preview host (if any) with the final sanitized component
  node.
- Append `parts.after` markdown only if it is non-empty and not already
  rendered.

This avoids a full re-parse of the markdown before the component and
removes the visible jump.

#### Step 1.7 - Tests

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.spec.ts
```

Add tests for:

- Partial component block renders a sanitized preview once a root
  element exists.
- Very incomplete HTML keeps skeleton behavior.
- A partial `<section class=` does not render a preview and keeps the
  skeleton.
- Partial CSS keeps complete local rules and drops incomplete trailing
  rules.
- Unsafe CSS selectors are blocked during progressive rendering.
- Dangerous tags are removed during progressive rendering.
- Closed ` ```component ` fences still use the final sanitizer path.
- Generic code fences (` ```css `, ` ```ts `, ` ```html `) are not
  misdetected as GenUI.
- The closed-fence final path does not re-parse the markdown before the
  component when the preview host already contains the same content.
- rAF coalescing: calling the directive N times within the same frame
  results in exactly one preview render.

Verification command:

```txt
npx ng test --watch=false
```

Run from:

```txt
frontend/
```

### Phase 1 Definition of Done

- A safe partial preview replaces the skeleton as soon as there is
  renderable HTML.
- The skeleton remains only while the partial component is not safely
  renderable.
- The closed-fence final render does not re-parse the markdown before
  the component.
- The existing CSS/HTML sanitization rules apply identically to the
  progressive path and the final path.
- All AiFormat tests pass and the spec file has no stale assertions.
- `npx ng build` from `frontend/` passes with no new warnings.

## Phase 2 - Smarter Chat Message Flushing

### Phase 2 Problems

- The per-character queue in `ChatMessage` adds 18–35 ms per chunk for
  every active stream, including GenUI streams where the user wants
  content to land as fast as possible.
- The queue is the same for prose and GenUI HTML, so a 4-second
  GenUI response spends ~2 of those seconds waiting in the queue.

### Phase 2 Goals

- Prose still feels typed, but component HTML lands within a few
  frames of arriving.
- The typing-cursor visual still appears for prose, never for
  GenUI HTML.

### Phase 2 Implementation Steps

#### Step 2.1 - Detect "Inside Component" Mode

Update:

```txt
frontend/src/app/features/chat/chat-message/chat-message.ts
```

Replace the existing `isInsideCodeBlock()` helper with two helpers:

- `isInsideProseStream()` — true while the stream is active and the
  latest chunk is not inside a ` ```component ` block.
- `isInsideComponentStream()` — true while the stream is active and
  the canonical content contains an open or just-closed
  ` ```component ` block.

Use `isInsideComponentStream()` in the per-character queue to choose
between:

- Prose: 1–2 character chunks with 18–35 ms delays.
- Component: 12–24 character chunks with a 0 ms `setTimeout(..., 0)`,
  capped at one rAF tick.

#### Step 2.2 - Keep the Cursor Hidden in Component Mode

In the same file, update `showCursor()` so it returns `false` when
`isInsideComponentStream()` is true, even if `hasQueuedText()` is
true. The cursor should not blink inside a streamed component.

#### Step 2.3 - Tests

Add focused unit tests in the same file using a small
`MessageQueueFlusher` helper extracted from the per-character queue.

Verification:

- Prose chunks honor the existing 18–35 ms delay profile.
- Component chunks flush within 1–2 rAF ticks.
- The cursor is never shown inside a component stream.

### Phase 2 Definition of Done

- A 4-second GenUI stream lands in under 1 second of perceived
  per-character delay overhead.
- Prose streams keep the existing visual typing rhythm.
- The cursor never blinks inside a streamed component.

## Phase 3 - Backend Prompt Trimming

### Phase 3 Problems

- `SYSTEM_CONTEXT` ships `GenUiSpec` values on every request, but most
  short tool calls and prose responses never render a GenUI component.
- The GenUI spec constant is verbose: every template repeats the same
  visual-standard paragraph, the same DESIGN SYSTEM list, the same
  HOVER/ANIMATIONS sections, and the same closing paragraph.
- A weather template includes the full design-system paragraph even
  though the LLM is only asked to render a single card.

### Phase 3 Goals

- Short prose / pure tool-call requests stop paying for GenUI spec
  tokens.
- The GenUI templates shrink by 20–40% without losing the visual
  standards.
- The split between `SYSTEM_CONTEXT` and `GenUiSpec` is explicit so
  future templates can opt in or out.

### Phase 3 Implementation Steps

#### Step 3.1 - Split the System Context

Update:

```txt
backend/src/modules/admin-agent/constants/system-context.constant.ts
```

Split the constant into two exports:

```ts
export const SYSTEM_CONTEXT_BASE = `...`; // tool rules, security, anti-hallucination
export const SYSTEM_CONTEXT_GENUI = `...`; // visual standard, design system, hover, animations
```

Keep `SYSTEM_CONTEXT` as the base for backward compatibility inside the
backend tests. Add a helper:

```ts
export function buildSystemContext(opts: {
  includeGenui: boolean;
}): string;
```

#### Step 3.2 - Decide When to Include GenUI

In `AdminAgentService.getDynamicSystemContext(...)`, decide whether to
include `SYSTEM_CONTEXT_GENUI` based on:

- The user's prompt contains a Hebrew/English word that suggests a
  visual response (e.g. `הצג`, `תראה לי`, `רשימה`, `show`, `list`,
  `display`).
- OR the prompt does not contain any tool-name keywords and the LLM
  has not been instructed to call a tool.
- Default: include GenUI only for prompts that have at least one
  visual-trigger keyword.

This is intentionally simple in version 1. A future phase can move
the trigger list to a per-tool `AGENT_INSTRUCTION` field so each tool
declares its own visual style.

#### Step 3.3 - Trim the GenUI Template Verbosity

Update:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

- Extract the shared visual-standard / design-system / hover /
  animation rules into `SYSTEM_CONTEXT_GENUI`.
- Keep only the tool-specific instructions inside each
  `GENUI_HTML(hint)` template.
- The result: each template becomes a short `hint` plus a single
  reference to the shared rules.
- Add a small comment in the file explaining that the shared rules
  are part of `SYSTEM_CONTEXT_GENUI` and should not be repeated.

#### Step 3.4 - Add a Test for Prompt Size

Add a unit test that asserts:

- The trimmed `SYSTEM_CONTEXT_GENUI` is shorter than the current
  `SYSTEM_CONTEXT`.
- A specific GenUI template (e.g. `WEATHER_CURRENT`) is shorter than
  before the trim.

Verification:

- Run the test suite for the admin-agent module.
- Confirm the trimmed system context still satisfies the existing
  flow tests.

### Phase 3 Definition of Done

- A pure tool-call prompt without a visual trigger does not pay for
  the GenUI spec tokens.
- Each GenUI template is shorter, measured by `template.length`.
- The trimmed system context still passes all backend tests.
- `npm.cmd run build` from `backend/` passes.
- `npm.cmd run test -w backend` passes (excluding the pre-existing
  `app.controller.spec.ts` failure documented in STATUS.md).

## Phase 4 - Streaming and Store Efficiency

### Phase 4 Problems

- `Chat.sendMessage` writes every token into a `signal<IChatMessage[]>`
  via `messages.update(...)`, which causes Angular change detection on
  the whole chat subtree per token.
- `AiFormat` reparses the full message on every `ngOnChanges` call,
  which is also once per token.
- The chat store has no event coalescing, so a fast model can flood
  signal updates faster than the browser can paint.

### Phase 4 Goals

- Token updates are coalesced into rAF-sized batches.
- `AiFormat` does not redo the full markdown parse when only a small
  suffix changed.
- The chat store re-renders less often while keeping the final
  response identical.

### Phase 4 Implementation Steps

#### Step 4.1 - Coalesce Token Updates in `Chat`

Update:

```txt
frontend/src/app/features/chat/chat/chat.ts
```

Add:

- A `tokenFlushHandle: number | null` field.
- A `private scheduleTokenFlush(): void` method that coalesces pending
  token appends into one `messages.update(...)` per rAF tick.
- A `private flushPendingTokens(): void` method that applies all
  pending token appends at once.

Replace the `event.type === 'token'` branch so it appends to a small
`pendingTokenBuffer: string[]` and calls `scheduleTokenFlush()`
instead of `messages.update(...)`.

Replace the closed-stream `complete` branch so it calls
`flushPendingTokens()` before doing any other state change.

#### Step 4.2 - Cache the Parsed Markdown Before the Component

Update:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

In the streaming path, cache the markdown text before the
` ```component ` fence as a stable string. When the next token arrives:

- If the cached `beforeMarkdown` is still a prefix of the new
  `beforeMarkdown`, reuse the existing rendered markdown host and only
  append the new suffix.
- If the cached `beforeMarkdown` differs at a non-suffix position
  (e.g. the LLM sent a tool call description), fall back to the
  existing full re-parse.

This avoids re-parsing the entire markdown on every token.

#### Step 4.3 - Avoid the Double-Parse at the Closing Fence

In `renderComponentResponse(parts)`:

- If the preview host already exists and its sanitized content equals
  the new final sanitized content, do nothing.
- Otherwise, replace the preview host's children in place rather than
  re-creating the host element.

This avoids a layout jump and saves a full `DOMParser` round trip at
the end of every GenUI stream.

#### Step 4.4 - Tests

- Add a focused unit test that simulates 100 rapid token events and
  asserts `messages.update` is called at most a small number of
  times (target: at most the rAF budget, e.g. 5–10 times for 100
  tokens over 1 second).
- Add an `AiFormat` test that asserts the markdown-before host is
  reused when only a suffix is appended.

### Phase 4 Definition of Done

- 100 rapid token events result in at most rAF-budget updates to the
  chat messages signal.
- `AiFormat` does not re-parse the entire markdown on every token
  when only a suffix changed.
- The final component render does not re-create the preview host.
- `npx ng test --watch=false` from `frontend/` passes.

## Phase 5 - Documentation and Observability

### Phase 5 Problems

- The architecture diagram does not show the streaming event flow
  (`step` / `token` / `done`).
- The backend has no easy way to see how long GenUI responses take.
- The streaming protocol is documented only in the controller's
  Swagger description and inside scattered comments.

### Phase 5 Implementation Steps

#### Step 5.1 - Update the Architecture Diagram

Update:

```txt
documents/architecture-diagram.md
```

Add a new subgraph or sub-diagram that shows:

- `ChatService` (frontend) → `AdminAgentController.queryStream` (backend).
- `AdminAgentService.queryDatabaseStream` → `LlmClientService.generateStream`.
- The flow of `step` and `token` JSON lines back through the
  controller to the client.
- The `AiFormat` directive and the `ChatMessage` queue as the
  frontend renderers.

#### Step 5.2 - Add Lightweight Streaming Metrics

Update:

```txt
backend/src/modules/admin-agent/admin-agent.service.ts
```

In `queryDatabaseStream(...)`, capture:

- `start = Date.now()` before the first LLM call.
- `firstTokenAt = Date.now()` when the first `token` event is yielded.
- `end = Date.now()` after the final `token` event.
- `componentCount`: number of closed ` ```component ` fences in the
  accumulated response.

Log one line at the end of each stream:

```txt
[AdminAgentStream] userId=... sessionId=... provider=... model=... firstTokenMs=... totalMs=... tokens=... components=...
```

This is a one-line log, not a full metrics system. It is enough to
verify the speed wins of Phases 1–4 from the backend logs.

#### Step 5.3 - Streaming Protocol Reference

Create a new file:

```txt
documents/architecture/genui-streaming-protocol.md
```

Contents:

- One short table describing each event type (`step`, `token`, `done`)
  with the JSON shape and a one-line meaning.
- A short diagram showing the producer/consumer flow.
- A short "what each event triggers in the frontend" section.

Reference this file from the architecture diagram.

### Phase 5 Definition of Done

- The architecture diagram has a streaming-event sub-diagram.
- The backend log line shows up in a real dev-server run and the
  numbers look reasonable.
- `documents/architecture/genui-streaming-protocol.md` exists and is
  referenced from the architecture diagram.

## Risks and Decisions

### Risk: Progressive Parser Drift

A separate partial sanitizer could become less strict than the final
sanitizer.

Decision:

- The partial sanitizer reuses the existing `splitCssRules`,
  `sanitizeCssRule`, `sanitizeSelectorList`, `isUnsafeSelector`, and
  `removeCssCustomPropertyDeclarations` helpers.
- New tests cover unsafe selectors and dangerous tags in progressive
  mode.
- A regression test compares the partial sanitizer output to the
  final sanitizer output for a wide set of inputs and asserts the
  same set of safe rules is allowed.

### Risk: Backend Prompt Regression

Trimming the system context could make the LLM emit a worse GenUI
response.

Decision:

- The split is conservative in version 1: GenUI rules are still
  included by default unless the prompt has no visual-trigger
  keyword and no tool keywords.
- A future phase can move the trigger list to per-tool metadata.
- The visual-standard rules live in `SYSTEM_CONTEXT_GENUI` and are
  not changed, only deduplicated.

### Risk: rAF Throttling on Slow Machines

rAF-based throttling on the frontend is fine on a desktop, but
mobile browsers can drop frames. If the rAF cadence becomes the
bottleneck, the partial preview would still feel slow.

Decision:

- Phase 1 rAF coalescing is opt-in per directive instance and falls
  back to immediate render if `requestAnimationFrame` is unavailable.
- Phase 4 keeps the existing `setTimeout(..., 0)` fallback in
  `ChatMessage` for the per-character queue.

### Risk: Stream Cancellation Race

Coalescing tokens with rAF can cause the user to see one or two
extra tokens after clicking "Stop".

Decision:

- `Chat.cancelActiveStream()` calls `flushPendingTokens()` before
  `loading.set(false)` so any coalesced tokens are visible.
- The closed-stream `complete` branch and the cancellation branch
  share the same `flushPendingTokens()` helper, so the visible
  result is identical.

### Risk: Architecture Diagram Maintenance

A new sub-diagram and a new protocol doc can drift from the code.

Decision:

- The protocol doc is the single source of truth for the event
  shape; the diagram references it instead of duplicating the
  table.

## Suggested Implementation Order

1. Phase 1.1 + 1.2 + 1.3 + 1.7 — add the parser, sanitizers, and
   tests behind a flag or a feature toggle (e.g. a directive
   `input` or an environment flag). Verify that the existing
   skeleton path is unchanged when the flag is off.
2. Phase 1.4 + 1.5 + 1.6 — wire the new path into the directive and
   turn the flag on by default. Run the full frontend test suite
   and build.
3. Phase 2 — switch the chat-message flusher. Test in the browser
   with a long GenUI response.
4. Phase 3 — trim the backend prompt. Run the backend tests and
   build, then run a single real GenUI request to confirm the LLM
   still emits the same visual quality.
5. Phase 4 — coalesce token updates and add the parsed-markdown
   cache. Run the frontend test suite and build.
6. Phase 5 — update the architecture diagram, add the streaming log
   line, and write the protocol doc.

Each step is reversible. The flag-based rollout for Phase 1 means
the plan can be paused or rolled back without leaving the codebase
in a half-migrated state.

## Definition of Done

- All five phases pass their own DoD sections.
- A long GenUI response in a real browser feels progressive, with
  the preview replacing the skeleton before the closing fence.
- The closed-fence final render does not cause a visible layout
  jump.
- The backend log line records time-to-first-token and component
  count for each stream.
- The architecture diagram and the new protocol doc reflect the
  current streaming flow.
- `npx ng test --watch=false` from `frontend/` passes.
- `npx ng build` from `frontend/` passes with no new warnings.
- `npm.cmd run test -w backend` passes (excluding the pre-existing
  `app.controller.spec.ts` failure).
- `npm.cmd run build` from `backend/` passes.
- No corrupted-character scan failures on touched files.

## Verification Commands

Run from `frontend/`:

```txt
npx ng test --watch=false
npx ng build
```

Run from `backend/`:

```txt
npm.cmd run test
npm.cmd run build
```

Optional targeted mojibake scan after implementation: use the exact
project scan pattern from `AGENTS.md` against any touched Hebrew
files.

## Architecture Diagram Impact

This plan changes the streaming event flow only at the documentation
level (Phase 5) and at the rendering level (Phase 1 + Phase 4). It
does not change the backend streaming protocol, the event shapes,
or the GenUI generation contract.

The architecture diagram must be updated in Phase 5 to:

- Show the streaming event flow.
- Reference the new protocol doc.

## Open Decisions

- Should the partial sanitizer also reject inline `onmouseover` /
  `onmouseout` attributes during streaming, or only at the final
  render? Current behavior keeps them because the closed-fence path
  already does. Phase 1 keeps that behavior.
- Should the per-character queue be turned off entirely for GenUI
  streams, or just slowed down? Phase 2 slows it down to keep the
  cursor visual hidden but does not break the existing test
  surface.
- Should the visual-trigger keyword list live in code or in a config
  file? Phase 3 keeps it in code to make the first version easy to
  revert.
- Should the backend log line include a session id and a user id, or
  only a request id? Phase 5 includes both because they already
  exist in the request scope and are useful for tracing.
