# CSS Conventions Component Audit

## Scope

This audit checks component-owned styling under:

- `frontend/src/app/features/**/*.css`
- `frontend/src/app/features/**/*.html`

It focuses on the `css-conventions` skill:

- No inline styles in templates.
- Use CSS nesting instead of flat descendant selectors.
- Prefer global reusable patterns over repeated component-specific classes.
- Use the global `.card` pattern and modifiers for card-like surfaces.
- Keep component CSS small and specific to the component.

Global design-system files under `frontend/src/app/assets/styles` were not treated as component CSS.

## Summary

Overall status: mostly compliant.

No inline `style=` attributes were found in feature templates. The reviewed component CSS is also already mostly nested. The main issues are architectural CSS convention issues rather than syntax errors:

- Repeated session/list item patterns exist in multiple chat components.
- Several card-like surfaces are implemented with component-specific classes instead of `.card` plus modifiers.
- Some component files include reusable interaction patterns that should probably live globally.
- A few adjacent design-token issues were found while scanning, mostly hardcoded pixel values and broad transition tokens.

## Findings

### 1. Repeated Session Row / Archive Item Pattern

Severity: Medium

Files:

- `frontend/src/app/features/chat/chat-history/chat-history.css:28`
- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css:30`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:136`

Problem:

The project has at least three local implementations of a session list item:

- `.sessions-list .session-row`
- `.sessions-archive-list .archive-item`
- `.nested-sessions-list .session-sub-item`

They repeat the same structural concerns: row layout, active state, hover state, icon/title/date grouping, ellipsis behavior, and delete/secondary action placement.

Why this matters:

The skill prefers global reusable patterns over component-specific one-off classes when the pattern recurs. These are not one-off anymore; they are a shared product primitive.

Recommended fix:

Create a global session/list pattern in the shared style layer, for example:

- `.list-stack`
- `.list-row`
- `.list-row.compact`
- `.list-row.active`
- `.list-row.danger`
- `.list-row-info`
- `.list-row-title`
- `.list-row-meta`
- `.list-row-actions`

Then keep component CSS only for layout placement that is unique to the component.

### 2. Card-Like Surfaces Not Using `.card`

Severity: Medium

Files:

- `frontend/src/app/features/chat/chat-message/chat-message.css:5`
- `frontend/src/app/features/chat/chat.css:33`
- `frontend/src/app/features/chat/chat.css:90`
- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css:38`
- `frontend/src/app/features/chat/chat-history/chat-history.css:33`
- `frontend/src/app/features/design-system/design-system.css:114`
- `frontend/src/app/features/design-system/_design-system-buttons.css:9`
- `frontend/src/app/features/design-system/_design-system-showcase.css:125`

Problem:

Several surfaces behave visually like cards or framed panels but are implemented as component-specific classes with their own background, border, radius, and padding.

Examples:

- `.chat-message-row`
- `.chat-history-loader`
- `.chat-prompt-field`
- `.archive-item`
- `.session-row`
- `.token-panel`
- `.button-panel`
- `.sandbox-card`

Why this matters:

The skill says card-like surfaces should use the global `.card` pattern, with modifiers for simple variants. This reduces repeated styling and makes future visual tuning easier.

Recommended fix:

For product UI:

- Convert repeated framed surfaces to `<div class="card ...">` where practical.
- Add generic card modifiers only when needed, such as `.card.compact`, `.card.interactive`, `.card.input-shell`, `.card.active`, or `.card.danger`.

For design-system showcase files:

- Decide whether showcase-specific cards are intentionally isolated examples.
- If not intentional, convert `.token-panel`, `.button-panel`, and `.sandbox-card` to `.card` variants.

### 3. Component-Specific Input Shell Pattern

Severity: Medium

Files:

- `frontend/src/app/features/chat/chat.css:90`
- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css:8`
- `frontend/src/app/features/chat/chat-history/chat-history.css:1`

Problem:

Search/input wrapper patterns are implemented locally:

- `.chat-prompt-field`
- `.search-box`
- `.search-container`

These repeat the same concerns: icon placement, wrapper focus state, local input padding, and input shell styling.

Why this matters:

The skill prefers global generic patterns when a style appears in more than one place.

Recommended fix:

Introduce global input-shell utilities:

- `.input-shell`
- `.input-shell.with-icon`
- `.input-shell.action-end`
- `.input-shell-icon`
- `.input-shell-action`

Then use component CSS only for unique sizing, such as chat textarea height.

### 4. Broad Transition Token Used In Component CSS

Severity: Low

Files:

- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css:46`
- `frontend/src/app/features/chat/chat-history/chat-history.css:41`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:44`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:125`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:156`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:190`

Problem:

Several components use:

```css
transition: var(--transition-standard);
```

This is primarily a design-system convention issue, but it also affects component CSS quality because it hides which properties animate.

Recommended fix:

Replace with explicit properties:

```css
transition:
  background-color var(--transition-fast),
  border-color var(--transition-fast),
  color var(--transition-fast);
```

### 5. Hardcoded Pixel Values In Component CSS

Severity: Low

Files:

- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:2`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:17`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:18`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:55`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:56`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:86`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css:87`
- `frontend/src/app/features/chat/chat-message/chat-message.css:75`
- `frontend/src/app/features/chat/chat.css:46`
- `frontend/src/app/features/chat/chat.css:47`
- `frontend/src/app/features/chat/chat.css:48`
- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css:5`

Problem:

Hardcoded dimensions remain in component CSS. This is mainly a design-token issue, but it is relevant when deciding whether component CSS is overly bespoke.

Recommended fix:

Replace obvious values with existing spacing tokens or calculated token values:

- `24px` -> `var(--space-6)`
- `40px` -> `calc(var(--space-8) + var(--space-2))`
- `48px` -> `var(--space-12)`
- `240px` -> tokenized max-height or `calc(var(--space-16) * 4 - var(--space-4))`
- `280px` -> layout token or global sidebar width token
- `450px` -> dialog/list max-height token

If a value is intentional and product-specific, promote it to a named design/layout token.

### 6. CSS Nesting Is Mostly Compliant

Severity: Info

Files checked:

- `frontend/src/app/features/chat/chat.css`
- `frontend/src/app/features/chat/chat-message/chat-message.css`
- `frontend/src/app/features/chat/chat-history/chat-history.css`
- `frontend/src/app/features/chat/all-sessions-dialog/all-sessions-dialog.css`
- `frontend/src/app/features/layout/main-sidebar/main-sidebar.css`
- `frontend/src/app/features/design-system/*.css`

Result:

No major flat descendant-selector problem was found in the active feature styles. Most files already use the parent-to-child nesting shape required by the skill.

Small cleanup opportunity:

Keep related component sections under a single component root where possible. For example, `main-sidebar.css` has both `.sidebar` and `.nested-sessions-list` as top-level roots. That is not automatically wrong, but if `.nested-sessions-list` only appears inside the sidebar, nesting it under `.sidebar` would better match the convention.

### 7. No Inline Styles Found In Feature Templates

Severity: Info

Scan:

```text
rg -n 'style\s*=' frontend/src/app/features --glob '*.html'
```

Result:

No matches found.

## Recommended Fix Order

1. Extract a global list/session row pattern.
2. Convert session history, all-sessions dialog, and sidebar nested sessions to that pattern.
3. Introduce a global input-shell pattern for search/chat input wrappers.
4. Convert repeated card-like surfaces to `.card` variants.
5. Replace broad `transition: var(--transition-standard)` declarations with explicit properties.
6. Tokenize hardcoded component dimensions that are not genuinely unique.

## Suggested First Implementation Slice

Start with the repeated session row pattern, because it appears in three visible chat/navigation areas and gives the biggest convention payoff:

- Add global list row utilities.
- Update `chat-history` rows.
- Update `all-sessions-dialog` rows.
- Update `main-sidebar` nested session rows.
- Build and visually verify hover, active, delete-confirmation, and ellipsis states.
