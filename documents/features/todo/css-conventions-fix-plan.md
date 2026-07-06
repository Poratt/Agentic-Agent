# CSS Conventions Fix Plan

## Goal

Fix the 7 findings from `documents/audit/css-conventions-component-audit.md` to improve CSS maintainability and enforce project conventions.

## Scope

Changes are limited to:

- `frontend/src/app/assets/styles/_*.css` (global patterns only — do not add component-specific rules here)
- `frontend/src/app/features/**/*.css` (component CSS)
- `frontend/src/app/features/**/*.html` (template if class changes require it)

## Definitions

### Low
Cosmetic or low-risk — no visual change, only better CSS practice.

### Medium
A shared product primitive is currently implemented in 3+ places with local one-off classes. Refactoring to a global pattern reduces future maintenance cost and makes global visual tuning possible.

## Non-Goals

- Do not change component behavior or add new features.
- Do not rewrite component HTML unless a class rename is required for the CSS fix.
- Do not touch global design-system showcase files (`_design-system-tokens.css`, `_design-system-showcase.css`) unless explicitly listed.
- Do not address the 2 known out-of-scope `rgba(0, 0, 0, ...)` literals in `_utilities.css:273` and `_buttons.css:173` — those are covered by a separate follow-up ticket.

---

## Finding 1 — Session / List Row Pattern

**Severity:** Medium  
**Files:** `chat-history.css`, `all-sessions-dialog.css`, `main-sidebar.css`

Three local implementations of a session list item:

- `.sessions-list .session-row`
- `.sessions-archive-list .archive-item`
- `.nested-sessions-list .session-sub-item`

They repeat the same structural concerns: row layout, active state, hover state, icon/title/date grouping, ellipsis behavior, and delete/secondary action placement.

### Step 1.1 — Add Global List Row Pattern

Add to `frontend/src/app/assets/styles/_layout.css` or a new `_list-layout.css` (loaded from `styles.css`):

```css
.list-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background: var(--surface-hover);
  }

  &.active {
    background: var(--primary-30);
    color: var(--color-primary);
  }

  &.danger {
    &:hover {
      background: var(--danger-20);
      color: var(--color-danger);
    }
  }

  .list-row-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--color-muted);
  }

  .list-row-title {
    flex: 1;
    min-width: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .list-row-meta {
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    color: var(--color-muted);
  }

  .list-row-actions {
    flex-shrink: 0;
    display: flex;
    gap: var(--space-2);
    opacity: 0;
    transition: opacity var(--transition-fast);

    .list-row:hover & {
      opacity: 1;
    }
  }
}
```

### Step 1.2 — Update Chat History

Update `frontend/src/app/features/chat/chat-history/chat-history.css`:

- Replace `.sessions-list .session-row` with `.list-row`.
- Replace `.session-icon` with `.list-row-icon`.
- Replace `.session-title` with `.list-row-title`.
- Replace `.session-date` with `.list-row-meta`.
- Keep `.session-delete-btn` as a child of `.list-row-actions`.
- Remove the `.sessions-list` wrapper styles if they become empty.

Update `frontend/src/app/features/chat/chat-history/chat-history.html` if class renames are needed.

### Step 1.3 — Update All-Sessions Dialog

Update `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css`:

- Replace `.sessions-archive-list .archive-item` with `.list-row`.
- Replace `.archive-icon` with `.list-row-icon`.
- Replace `.archive-name` with `.list-row-title`.
- Replace `.archive-date` with `.list-row-meta`.

### Step 1.4 — Update Main Sidebar

Update `frontend/src/app/features/layout/main-sidebar/main-sidebar.css`:

- Replace `.nested-sessions-list .session-sub-item` with `.list-row`.
- Replace `.session-sub-icon` with `.list-row-icon`.
- Replace `.session-sub-title` with `.list-row-title`.
- Replace `.session-sub-date` with `.list-row-meta`.

### Verification 1

```bash
npx ng build
```

Expected: build passes, no new warnings.

---

## Finding 2 — Card-Like Surfaces Not Using `.card`

**Severity:** Medium  
**Files:** `chat-message.css`, `chat.css`, `all-sessions-dialog.css`, `chat-history.css`, `design-system.css`, `_design-system-buttons.css`, `_design-system-showcase.css`

Problem: surfaces like `.chat-message-row`, `.chat-history-loader`, `.chat-prompt-field`, `.archive-item`, `.session-row`, `.token-panel`, `.button-panel`, `.sandbox-card` implement card-like framing locally instead of using `.card`.

### Decision — Design System Showcase

`.token-panel`, `.button-panel`, and `.sandbox-card` in design-system showcase files are intentionally isolated showcase examples. Do not convert them. They are not product UI.

### Step 2.1 — Identify Product UI Card Surfaces

Inspect each product component listed in the audit. For each surface that is:

- A framed panel with background, border, or padding
- NOT purely structural (e.g. input wrapper, row, loader)

Decide whether to convert to `.card` or a specific non-card class.

Guideline: if it looks like a card and is not a form input, list row, or loader → `.card`.

### Step 2.2 — Convert Confirmed Card Surfaces

For surfaces confirmed in Step 2.1:

- Add `class="card ...">` in the HTML template.
- Remove or simplify the component-local card-framing CSS.
- Use existing `.card` modifiers or add minimal new ones to `_utilities.css` only if the modifier is reusable.
- Keep component CSS only for layout placement unique to that component.

### Verification 2

```bash
npx ng build
```

Expected: build passes, no new warnings.

---

## Finding 3 — Input Shell Pattern

**Severity:** Medium  
**Files:** `chat.css`, `all-sessions-dialog.css`, `chat-history.css`

Three local implementations:

- `.chat-prompt-field`
- `.search-box`
- `.search-container`

### Step 3.1 — Add Global Input-Shell Pattern

Add to `frontend/src/app/assets/styles/_forms.css`:

```css
.input-shell {
  display: flex;
  align-items: center;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: var(--focus-ring);
  }

  &.with-icon {
    .input-shell-icon {
      flex-shrink: 0;
      color: var(--color-muted);
      margin-right: var(--space-2);
    }

    input,
    textarea {
      padding-left: 0;
    }
  }

  &.action-end {
    .input-shell-action {
      flex-shrink: 0;
      margin-left: var(--space-2);
    }

    input,
    textarea {
      padding-right: 0;
    }
  }
}
```

### Step 3.2 — Update Chat History Search

Update `frontend/src/app/features/chat/chat-history/chat-history.css`:

- Replace `.search-box` styles with `.input-shell.with-icon`.
- Add `.input-shell-icon` for the search icon.
- Keep component CSS only for height/sizing unique to the chat history search bar.

Update `frontend/src/app/features/chat/chat-history/chat-history.html` if class changes are needed.

### Step 3.3 — Update All-Sessions Dialog Search

Update `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css`:

- Replace `.search-container` styles with `.input-shell.with-icon`.
- Keep sizing unique to the dialog.

### Step 3.4 — Update Chat Prompt Field

Update `frontend/src/app/features/chat/chat.css`:

- Replace `.chat-prompt-field` styles with `.input-shell.with-icon.action-end`.
- The send button becomes `.input-shell-action`.
- Keep textarea height and flex-grow unique to the chat prompt area.

### Verification 3

```bash
npx ng build
```

Expected: build passes, no new warnings.

---

## Finding 4 — Broad Transition Token

**Severity:** Low  
**Files:** `all-sessions-dialog.css`, `chat-history.css`, `main-sidebar.css`

Components use `transition: var(--transition-standard)` which hides which properties animate.

### Step 4.1 — Replace Broad Transitions

In each affected file, replace:

```css
transition: var(--transition-standard);
```

With explicit property transitions:

```css
transition:
  background-color var(--transition-fast),
  border-color var(--transition-fast),
  color var(--transition-fast),
  box-shadow var(--transition-fast);
```

Keep only the properties that are actually used in hover/focus states in that component.

### Verification 4

```bash
npx ng build
```

Expected: build passes.

---

## Finding 5 — Hardcoded Pixel Values

**Severity:** Low  
**Files:** `main-sidebar.css` (lines 2, 17, 18, 55, 56, 86, 87), `chat-message.css` (line 75), `chat.css` (lines 46, 47, 48), `all-sessions-dialog.css` (line 5)

### Step 5.1 — Tokenize main-sidebar.css

Replace hardcoded sidebar dimensions with existing spacing tokens:

- `24px` → `var(--space-6)`
- `40px` → `var(--space-10)`
- `48px` → `var(--space-12)`
- `280px` → promote to a sidebar-width layout token or `calc(var(--space-16) * 4 + var(--space-12))`

If a value is genuinely unique to the sidebar (e.g. fixed sidebar width), do not tokenize — document the exception.

### Step 5.2 — Tokenize chat.css

Replace hardcoded values for `.chat-history`:

- `32px` → `var(--space-8)` (already identified in the CSS conventions fix)
- Review padding values against existing spacing scale

### Step 5.3 — Tokenize all-sessions-dialog.css

Review `.archive-item` for hardcoded padding and replace with spacing tokens if not already using them.

### Step 5.4 — Tokenize chat-message.css

Review `.message-timestamp` and adjacent styles for hardcoded `11px` (already identified and fixed for `.message-timestamp` in the CSS conventions fix).

Verify remaining hardcoded values are genuinely unique to the message component.

### Verification 5

```bash
npx ng build
```

Expected: build passes, no new warnings.

---

## Finding 6 — CSS Nesting

**Severity:** Info  
**Status:** Already mostly compliant.

Small cleanup: nest `.nested-sessions-list` under `.sidebar` in `main-sidebar.css` if `.nested-sessions-list` only appears inside the sidebar.

### Step 6.1 — Nest Sidebar Session List

In `frontend/src/app/features/layout/main-sidebar/main-sidebar.css`, move `.nested-sessions-list` and its children under the existing `.sidebar` root selector.

### Verification 6

```bash
npx ng build
```

Expected: build passes.

---

## Finding 7 — Inline Styles

**Severity:** Info  
**Status:** Already compliant ✅

No action needed. The inline style scan returned no matches.

---

## Finding 8 — Design System Showcase Card Surfaces

**Severity:** Info  
**Decision:** Do not convert `.token-panel`, `.button-panel`, and `.sandbox-card` in design-system showcase files. They are intentionally isolated showcase examples, not product UI.

---

## Implementation Order

1. **Finding 1** — Session row pattern (biggest payoff, 3 files)
2. **Finding 3** — Input shell pattern (3 files, parallels Finding 1)
3. **Finding 2** — Card surfaces (inspect first, convert only confirmed product UI)
4. **Finding 4** — Broad transitions (low effort, high consistency)
5. **Finding 5** — Hardcoded pixels (low effort, token hygiene)
6. **Finding 6** — Nesting cleanup (minor)
7. **Verification** — Full build pass

## Definition of Done

- `npm.cmd run build` from `frontend/` passes with no new warnings.
- All session row, search input, and card surfaces use the new global patterns.
- No inline `style=` attributes in feature HTML.
- No `transition: var(--transition-standard)` in component CSS (only explicit property transitions).
- Remaining hardcoded pixel values are documented as intentional and unique.
- No architecture diagram update needed — CSS-only refactoring with no component or API contract changes.
