# AiFormat Directive Improvement Plan

## Goal

Improve `frontend/src/app/core/directives/ai-format.directive.ts` so it can safely render streamed GenUI and markdown without letting generated components damage global app styles, break CSS tokens, or show unstable loading states.

The directive currently does three jobs:

- Detects and renders GenUI component blocks.
- Shows a skeleton while a component block is still streaming.
- Parses normal markdown/table text into HTML.

The implementation works, but the responsibilities are mixed together and there are safety gaps around raw component HTML.

## Current Problems

### 1. Raw GenUI Can Override Global CSS

`renderComponentHtml()` writes raw HTML with `innerHTML`.

That allows GenUI `<style>` blocks to include unsafe global CSS such as:

```css
:root {
  --color-surface: #ffffff;
}

table {
  width: 100%;
}
```

This can override the application design system and affect content outside the generated component.

### 2. Component Detection Is Too Broad

The open-block detector includes:

```ts
raw.match(/```c/i)
```

This can treat normal code fences such as ` ```css ` or ` ```csharp ` as an unfinished GenUI component.

### 3. Skeleton Logic Is Inline And Hard To Reuse

The skeleton HTML and global `@keyframes pulse` injection are embedded inside `ngOnChanges()`.

This makes the directive harder to reason about and test.

### 4. Hebrew Role Parsing Contains Corrupted Text

The markdown role badge parser includes corrupted Hebrew strings. This can break role detection and makes the file unsafe to edit.

### 5. Markdown Parsing And GenUI Rendering Are Mixed

`parse()`, `parseTable()`, component extraction, skeleton rendering, DOM diffing, and animation marking all live in one directive.

The first implementation can stay in one file, but each concern should be separated into small private methods before extracting services later.

## Desired Behavior

### GenUI Component Rendering

When a complete component block arrives:

- Extract only the content inside ` ```component ... ``` `.
- Sanitize dangerous GenUI CSS before rendering.
- Keep `<style>` support because GenUI needs local component styling.
- Remove or neutralize global selectors and token overrides.
- Render the component without changing the public API of the directive.

### CSS Safety

The directive should remove or block:

- `:root { ... }`
- `html { ... }`
- `body { ... }`
- CSS custom property declarations such as `--color-surface: ...`
- Global element selectors such as `table`, `th`, `td`, `h1`, `h2`, `button`, `.btn` when they are not scoped to a GenUI root class.

The directive should allow:

- Local classes such as `.genui-card`, `.weather-card`, `.analytics-chart`.
- `@keyframes`.
- `var(--existing-token)` usage.
- Inline styles that use existing CSS variables.

### Skeleton Behavior

The skeleton should show only while a GenUI component is incomplete.

It should not show for normal code fences like:

```txt
```css
...
```
```

### Markdown Behavior

Normal assistant text should continue to support:

- Headings.
- Bold/italic.
- Inline code and fenced code.
- Tables.
- Lists.
- Role badges.

## Target Implementation

Keep the directive public usage unchanged:

```html
<div [aiFormat]="message.content"></div>
```

Recommended internal shape:

```ts
ngOnChanges() {
  const raw = this.aiFormat() ?? '';

  const componentHtml = this.extractComponentHtml(raw);
  if (componentHtml) {
    this.renderComponentHtml(this.sanitizeComponentHtml(componentHtml));
    return;
  }

  if (this.isStreamingComponent(raw)) {
    this.renderSkeletonOnce();
    return;
  }

  this.renderMarkdown(raw);
}
```

## Implementation Phases

### Phase 1 - Tighten GenUI Detection

Steps:

1. Replace broad `raw.match(/```c/i)` with a stricter incomplete component detector.
2. Treat only these as component starts:
   - ` ```component `
   - raw HTML beginning with `<style>`, `<div>`, `<section>`, or `<article>` and not yet closed.
3. Do not treat ` ```css `, ` ```csharp `, or generic code fences as GenUI.

Verification:

- A streaming ` ```component ` block shows skeleton.
- A normal ` ```css ` block renders as code, not skeleton.
- A complete ` ```component ... ``` ` renders as GenUI.

### Phase 2 - Add Component HTML Sanitizer

Steps:

1. Add `sanitizeComponentHtml(html: string): string`.
2. Parse the HTML using `DOMParser`.
3. For every `<style>` tag, clean unsafe CSS.
4. Remove CSS variable declarations:

```txt
--anything: value;
```

5. Remove full blocks for:

```txt
:root { ... }
html { ... }
body { ... }
```

6. Consider removing dangerous script-like tags if they ever appear:

```txt
script, iframe, object, embed
```

Verification:

- Input with `:root { --color-surface: red; }` renders without the `:root` block.
- Input with `.weather-card { color: var(--color-text-primary); }` remains.
- Input with `@keyframes` remains.

### Phase 3 - Scope CSS Selectors

Steps:

1. Decide on a required root class convention for GenUI components:
   - preferred: `.genui-root`
   - accepted: domain root classes such as `.weather-card`, `.analytics-card`
2. Add a sanitizer rule that removes unscoped global element selectors:
   - `table { ... }`
   - `th { ... }`
   - `td { ... }`
   - `h1 { ... }`
   - `h2 { ... }`
   - `button { ... }`
   - `.btn { ... }`
3. Keep scoped selectors:
   - `.genui-root table { ... }`
   - `.weather-card .btn { ... }`

Verification:

- Global `table { ... }` is removed.
- `.genui-root table { ... }` stays.

### Phase 4 - Extract Skeleton Helpers

Steps:

1. Move skeleton style injection into `ensureSkeletonStyle()`.
2. Move skeleton DOM write into `renderSkeletonOnce()`.
3. Keep current visual skeleton unchanged unless a design update is requested.

Verification:

- Skeleton appears once while component is streaming.
- Skeleton disappears when completed component arrives.

### Phase 5 - Fix Corrupted Hebrew Role Handling

Steps:

1. Replace corrupted role strings with valid Hebrew:
   - `מנהל`
   - `משתמש`
   - `תפקיד`
2. Keep English role support:
   - `admin`
   - `user`
3. Search for corrupted text after editing.

Verification:

```txt
rg -n "׳|ג€�|ג†|ג€|�" frontend/src/app/core/directives/ai-format.directive.ts
```

Expected:

- No corrupted characters remain.
- Role badge parsing still works for Hebrew and English values.

### Phase 6 - Manual UI Verification

Manual checks:

1. Ask the agent for a users table.
2. Confirm no CSS variables are redefined in rendered output.
3. Ask for weather GenUI.
4. Confirm `<style>` local animations still work.
5. Send a markdown code block with ` ```css `.
6. Confirm it renders as code, not skeleton.
7. Confirm normal markdown/table rendering still works.

## Suggested Agent Split

### Agent 1 - GenUI Detection

Owner:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Checklist:

- [ ] Tighten `openMatch` logic.
- [ ] Add `isStreamingComponent(raw)`.
- [ ] Verify normal code fences do not trigger skeleton.

### Agent 2 - Component Sanitizer

Owner:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Checklist:

- [ ] Add `sanitizeComponentHtml(html)`.
- [ ] Remove `:root`, `html`, and `body` style blocks.
- [ ] Remove CSS variable declarations.
- [ ] Remove dangerous tags if present.
- [ ] Preserve local component classes and `@keyframes`.

### Agent 3 - Skeleton Cleanup

Owner:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Checklist:

- [ ] Extract `ensureSkeletonStyle()`.
- [ ] Extract `renderSkeletonOnce()`.
- [ ] Keep visual behavior stable.

### Agent 4 - Markdown / Hebrew Cleanup

Owner:

```txt
frontend/src/app/core/directives/ai-format.directive.ts
```

Checklist:

- [ ] Fix corrupted Hebrew role strings.
- [ ] Keep English role support.
- [ ] Run corrupted-character search.

### Agent 5 - Verification

Owner:

```txt
frontend runtime verification
```

Checklist:

- [ ] Run frontend build.
- [ ] Run backend build only if GenUI prompt behavior is changed too.
- [ ] Verify GenUI rendering manually in chat.
- [ ] Verify CSS override protection manually.
- [ ] Verify markdown code fences manually.

## Risks

### Risk: Sanitizer Removes Too Much CSS

If the sanitizer is too aggressive, GenUI components may lose local styling.

Mitigation:

- Start by removing only obvious unsafe blocks and declarations.
- Preserve local classes and `@keyframes`.
- Add manual examples before broadening selector cleanup.

### Risk: Raw HTML Safety vs. GenUI Capability

GenUI needs raw `<style>` and interactive `onclick="window.agentPrompt(...)"`.

Mitigation:

- Do not route complete GenUI through Angular's normal HTML sanitizer unless it preserves required behavior.
- Apply a custom narrow sanitizer specifically for known unsafe CSS patterns.

### Risk: Streaming UX Regression

Changing detection can affect when skeleton appears.

Mitigation:

- Test incomplete ` ```component ` and normal ` ```css ` separately.

## Definition Of Done

- GenUI cannot redefine `:root` or CSS variables.
- Global CSS selectors from GenUI are blocked or scoped.
- Complete GenUI still renders with local styles and animations.
- Normal code fences no longer trigger the component skeleton.
- Skeleton behavior remains stable for actual component streaming.
- Corrupted Hebrew text is removed from the directive.
- Frontend build passes.

