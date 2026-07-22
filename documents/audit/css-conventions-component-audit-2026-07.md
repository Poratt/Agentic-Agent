# CSS Conventions Component Audit — 2026-07-05

## Scope

This audit covers every CSS file under `frontend/src/app/`:

- `app/assets/styles/*.css` — global design system
- `app/components/**/*.css` — shared presentation components
- `app/features/**/*.css` — feature components
- `app/app.css` — root stylesheet

It is graded against the `css-conventions` skill (`~/.claude/skills/css-conventions/SKILL.md`) plus the project-level `css-rules.md` and `angular-rules.md` (the project rules supersede on conflict, and the prior audit is kept as historical context).

The previous audit (`documents/audit/css-conventions-component-audit.md`) is superseded by this report. The `css-duplicate-styles-report.md` (2026-07-09) has been merged into this report (findings #14–#20). The diff between the two is summarized in the **Status vs Previous Audit** section.

## What the rules actually require

From `css-conventions` SKILL.md and the project rules:

1. **No inline styles** in templates (`style="..."` / `style='...'`).
2. **No component-specific "one-off" classes** when a global utility/modifier exists or can be created.
3. **Prefer global, generic patterns** over per-component CSS. Keep component CSS as small as possible.
4. **Card convention** — use global `.card`; add generic modifiers (`.card.padded`, `.card.max-w-400`) instead of `*.card` classes.
5. **Always use CSS nesting** — `.parent { &.variant {} &:hover {} .child {} }`, never flat descendant selectors.
6. **Tokens only** — colors, spacing, radii, shadows, font sizes must come from `var(--token)` defined in `_variables.css`. No hardcoded hex / px for these.
7. **Generic class names** in component CSS — no `.login-page`, `.login-card`, etc.
8. **Mandatory nesting** under the component root selector.
9. **No bare-element styling** (`h1`, `p`, `button`, `table`, `th`, `td`) inside component CSS.
10. **No `styles: [...]`** inline component styles; use `styleUrls`.

## Overall status

**Verdict: MOSTLY COMPLIANT, with a small, concrete set of violations.**

- ✅ No flat-selector nesting problems were found in any current component or global CSS. Every file uses nested selectors correctly.
- ✅ No `styles: [...]` arrays in any component; all use `styleUrls`.
- ✅ Glassmorphism `::before` pattern is used consistently in `.glass-effect`, `.table-container`, `.card`, `.metric-card`, `.app-tooltip`, `.tooltip-card`, `.score-card` — never raw `backdrop-filter` on a content element.
- ✅ Design tokens are used for colors, spacing, radii, and motion in nearly every file. Hardcoded hex / rgb in stylesheets was only found in legacy spots, all flagged.
- ⚠️ **Inline styles found in two templates** (a violation of rule #1).
- ⚠️ Several **component-specific card-like surfaces** that should be `.card` variants (rule #4) — same as the previous audit, slightly worse in one new place.
- ⚠️ Several **hardcoded pixel values** in component CSS (rule #6) — same as previous audit, plus a few new ones in newly touched files.
- ⚠️ One **duplicate CSS rule** inside a single file (strain-hunter.css).
- ⚠️ Several **borderline-acceptable `rgba()` literals** in the global utilities file (intentional halo effect, but worth flagging).
- ℹ️ The `css-conventions` skill's "global patterns" file (e.g. `_patterns.css`) is **not yet split out** — everything lives in `_utilities.css`. Not a violation, but a convention note.

## Status vs previous audit

Items from `documents/audit/css-conventions-component-audit.md`:

| # | Previous finding | Status today |
|---|---|---|
| 1 | Repeated session/list item pattern (3 components) | **Still present.** No extraction has happened. |
| 2 | Card-like surfaces not using `.card` | **Still present** in `chat-message`, `chat`, `chat-history`, design-system. **New in:** `llm-providers-management.expand-panel-row`, `strain-hunter-settings.expand-panel-row`, `strain-hunter-settings.enrichment-panel`. |
| 3 | Component-specific input shell pattern (`.chat-prompt-field`, `.search-box`, `.search-container`) | **Still present.** |
| 4 | Broad `transition: var(--transition-standard)` | **Still present** in `main-sidebar.css:121` and `_utilities.css:5`. |
| 5 | Hardcoded pixel values in component CSS | **Still present** in the same files; a few new occurrences in newly added code (see finding 3.7). |
| 6 | CSS nesting is mostly compliant | **Confirmed.** No regressions. |
| 7 | No inline styles in feature templates | **No longer true** — see finding 1 below. |
| – | (new) Repeated `panel-header` / `panel-title` block | **New finding** in two component files. |
| – | (new) Duplicate `.strain-rating` / `.strain-deal` block in `strain-hunter.css` | **New finding.** |
| – | (new) Mixed `direction: rtl` set in a component CSS rule | **New finding.** |
| – | (new) `:host ::ng-deep` force-LTR hack in `app.css` | **New finding** — conflicts with the global RTL design intent. |

## Findings

### 1. Inline styles in templates — High

The previous audit reported "no matches" for `style=` in feature templates. That is no longer true. The following matches were found:

- `frontend/src/app/features/strain-hunter/strain-hunter.html:1` — `<svg width="0" height="0" style="position: absolute">`
- `frontend/src/app/features/strain-hunter/strain-hunter.html:498` — `<div style="text-align: center">`
- `frontend/src/app/features/strain-hunter/strain-hunter.html:500` — `<img ... style="max-width: 100%; border-radius: var(--radius-md)" />`
- `frontend/src/app/core/directives/ai-format.directive.ts:292-294` — `style="background:var(--color-surface);..."` skeleton HTML built as a string and injected via DOMParser. Three inline-styled `<div>`s.

Rule #1 says: **Do not add inline styles in templates.**

Recommended fix:

- For the three `strain-hunter.html` cases, move the styles into `strain-hunter.css`:
  - Hidden SVG gradient `<defs>`: add a `.gradient-defs-svg` class with `position: absolute; width: 0; height: 0;` — the gradients themselves can stay in the inline `<defs>` (the rule applies to `style=`, not to inline SVG `<defs>` content), but the wrapping `<svg>` should not use `style="position:absolute"`.
  - Image dialog body: add a `.image-dialog-body` class with `text-align: center`.
  - Image dialog image: add an `.image-dialog-image` class with `max-width: 100%; border-radius: var(--radius-md);` (the `border-radius` is already a token; only the inline literal needs to move).
- For the `ai-format.directive.ts` skeleton HTML, extract the HTML to a template and the styles to a CSS file. This directive currently injects a static skeleton via `DOMParser`; if that is required for streaming performance, an acceptable alternative is to keep a single `class="ai-skeleton"` on each `<div>` and define the rules in component/global CSS. **This is a harder refactor** — flagging as a follow-up.

### 2. Card-like surfaces not using `.card` — Medium

Same as the previous audit (finding #2) with a few new occurrences.

| File | Line | Surfaces that should be `.card` variants |
|---|---|---|
| `frontend/src/app/features/chat/chat-message/chat-message.css` | 5–66 | `.chat-message-row.user-message` |
| `frontend/src/app/features/chat/chat/chat.css` | 33 | `.chat-history-loader` |
| `frontend/src/app/features/chat/chat/chat.css` | 170–189 | `.chat-prompt-field` |
| `frontend/src/app/features/chat/chat-history/chat-history.css` | 12–20 | `.session-row` |
| `frontend/src/app/features/llm-providers-management/llm-providers-management.css` | 80–85 | `.expand-panel-row .expand-panel-cell` |
| `frontend/src/app/features/llm-providers-management/llm-providers-management.css` | 165–170 | `.nested-panel-row .nested-panel-cell` |
| `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.css` | 23–30, 33–38, 117–123, 158–201 | `.expand-panel-cell`, `.expand-panel`, `.detail-item.detail-full`, `.enrichment-panel` |
| `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css` | 116–168 | `.genetics-empty` |
| `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css` | 397–405 | `.preview-item` |
| `frontend/src/app/features/strain-hunter/strain-hunter.css` | (in `_strain-hunter-filters.css`) | none new |
| `frontend/src/app/features/design-system/_design-system-showcase.css` | 125 | `.sandbox-card` |

Recommended fix: as the previous audit said, convert repeated framed surfaces to `<div class="card ...">` and add generic modifiers (`.card.compact`, `.card.input-shell`, `.card.active`) in `_utilities.css` when needed.

**One complication:** the project uses a `glass-effect` and a `card` class that *look* identical today. `card` has an extra `::after` top highlight. Choose one. The cleanest move is to deprecate `glass-effect` in favor of `card` (or vice versa), or to define `card` as `@extend .glass-effect` (not possible in pure CSS) or simply as a separate class. **Flag as architectural decision.**

### 3. Hardcoded pixel values in component CSS — Low (but accumulating)

Tokens exist for `--space-1` … `--space-16`, `--radius-*`, `--font-size-*`, `--breakpoint-*`. Any raw `NNpx` for these dimensions is a violation. A few raw px are *acceptable* for genuinely product-specific values that no token covers (icon sizes 18/28/40, ring sizes 40, sheet widths 240/220/200), but most are convertible.

Concrete occurrences **not covered by tokens** (acceptable, leave as-is unless you want to add a token):

| File:Line | Value | Notes |
|---|---|---|
| `features/llm-providers-management/llm-providers-management.css:42` | `width: 80px` | `.col-count` — table column width |
| `features/llm-providers-management/llm-providers-management.css:47` | `width: 100px` | `.col-status` — column width |
| `features/llm-providers-management/llm-providers-management.css:51` | `width: 140px` | `.col-perf` — column width |
| `features/llm-providers-management/llm-providers-management.css:56` | `width: 64px` | `.col-test`, `.col-actions` — column width |
| `features/llm-providers-management/llm-providers-management.css:99` | `width: 200px` | `.row-subtitle` |
| `features/llm-providers-management/llm-providers-management.css:114` | `width: 6px` | `.status-indicator::before` dot |
| `features/llm-providers-management/llm-providers-management.css:239` | `width: 64px` | `.col-actions-xs` |
| `features/llm-providers-management/llm-providers-management.css:168` | `48px` in calc | `.nested-panel-cell` indent |
| `features/layout/main-sidebar/main-sidebar.css:2` | `width: 220px` | sidebar width — should be `--sidebar-width` token |
| `features/layout/main-sidebar/main-sidebar.css:18, 167` | `width: 40px` | avatar / icon button — could be `--space-8 + --space-2` |
| `features/strain-hunter/strain-hunter.css:13-14` | `52px` | `.strain-thumbnail` — close to `--space-12 + --space-1`, but exact size is intentional |
| `features/strain-hunter/strain-hunter.css:93` | `28px` | `.strain-symbol` |
| `features/strain-hunter/strain-hunter.css:234` | `max-width: 220px` | `.strain-origin-cell` |
| `features/strain-hunter/strain-hunter.css:344` | `width/height: 40px` | `.score-ring-wrapper` |
| `features/strain-hunter/strain-hunter.css:52-54, 113, 117, 123, 134, 156, 260, 403, 124-125` | `10px`, `11px`, `2px` | font-size and padding on `.strain-*` mini-tags — these should be `--font-size-xs` family and a token-relative padding |
| `features/chat/chat/chat.css:28` | `width: 48px` | `.custom-loader` |
| `features/chat/chat-message/chat-message.css:29` | `max-width: 240px` | attachment |
| `features/chat/chat-message/chat-message.css:164` | `rgba(255, 255, 255, 0.03)` | thinking box background — no token for this opacity; either tokenize or use `color-mix(in srgb, var(--color-surface) 3%, transparent)` |
| `features/chat/chat-message/chat-message.css:182` | `rgba(0, 212, 255, 0.02)` | open thinking box — same as above |
| `features/chat/chat-message/chat-message.css:235` | `font-size: 11px` | steps list — should be `--font-size-xs` |
| `features/chat/chat/chat.css:48` | `padding: 32px` | `.chat-history` — should be `var(--space-8)` |
| `features/strain-hunter/_strain-hunter-filters.css:54, 56, 57, 79-80, 82, 86, 100, 112, 113, 121, 124, 130, 132, 138, 140, 145, 160, 161, 165, 175, 178, 216, 220, 221, 225-233` | `10px`, `11px`, `18px`, `2px` | chip and pill text/padding — convert to token-friendly values |
| `features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css:32` | `height: 300px` | `.group.grow` — fixed height should be a layout token |
| `features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css:468` | `width: 240px` | `.tooltip-fixed` |
| `features/settings/strain-hunter-settings/strain-hunter-settings.css:7, 8, 15, 19, 112, 134, 142, 153` | `280px`, `40px`, `2px`, `10px`, `11px` | column widths and tag dimensions |
| `components/shared/tooltip/tooltip.css:47` | `box-shadow: 0 0 var(--space-2) var(--tooltip-color)` | correct — uses token, no issue |
| `components/shared/tooltip/tooltip.css:60-61` | `font-size: 10px; padding: 2px 6px` | tool-card badge — tokenize |
| `components/shared/score-tooltip/score-tooltip.css:106, 111, 124, 127, 157` | `10px`, `11px`, `4px` | score-card chips — tokenize |

**Two specific values to call out:**

- `assets/styles/_utilities.css:213` — `padding-bottom: 12px;` inside `.catalog-toolbar`. Should be `var(--space-3)`.
- `assets/styles/_utilities.css:324` — `gap: 4px;` inside `.tag-list`. Should be `var(--space-1)`.

### 4. Duplicate CSS rules inside a single file — Low

`frontend/src/app/features/strain-hunter/strain-hunter.css` declares the same selectors twice:

```css
.strain-rating { color: var(--color-warning); }
.strain-deal { color: var(--color-danger); }
...
.strain-rating { color: var(--color-warning); }   /* duplicate */
.strain-deal { color: var(--color-danger); }      /* duplicate */
```

(Lines 70–72 and again 78–84.) The first pair is the active rule; the second is dead. Recommend deleting lines 78–84.

### 5. Repeated `panel-header` / `panel-title` pattern across two feature CSS files — Medium

The same conceptual block is implemented in two places with slightly different visual weight:

- `frontend/src/app/features/llm-providers-management/llm-providers-management.css:252-266`
- `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.css:41-69`

The two have different `font-size` (xs vs sm) and different border treatments, but both implement the same shape: a flex header with a muted title and a right-aligned action group. Per rule #2 (prefer global patterns), this should be a single global `.panel-header` / `.panel-title` set in `_utilities.css`, with optional modifiers like `.panel-header.subtle` or `.panel-header.lg`.

### 6. `direction: rtl` set inside a component rule — Low

`frontend/src/app/components/shared/tooltip/tooltip.css:4` sets `direction: rtl` on `:host`. The `score-tooltip` does the same. This is correct for the Hebrew-first app, but it means the **tooltips display right-to-left even when their content is LTR** (e.g. an English terpene name). Consider setting direction on the inner content based on data, not on the host. **Flag as a polish item**, not a violation.

### 7. `:host ::ng-deep` hack in `app.css` — Medium

`frontend/src/app/app.css:1-20` contains six `:host ::ng-deep .p-confirmdialog ... { direction: ltr; }` rules. This:

1. Lives at the app root, not scoped to any component (rule violation by spirit — the rule about "no global selectors for one component" is implied, not explicit, but it conflicts with rule #9's no-bare-element rule when read broadly).
2. Forces LTR on a component that should respect document direction. PrimeNG's `ConfirmDialog` is built assuming LTR; forcing it to LTR is the correct pragmatic fix, but it should be **co-located with the component that uses it**, not floated to `app.css`.
3. Uses `::ng-deep`, which is technically deprecated. Modern Angular (this project is on 22) supports `::ng-deep` with a deprecation warning.

Recommended fix: move these rules into a new `confirm-dialog.css` (or co-locate with the existing feature) and use the new `@Component({ encapsulation: ViewEncapsulation.None })` plus a `confirm-dialog` wrapper class, or use `:host ::ng-deep` inside the component that owns the confirm.

### 8. `border` shorthand using keyword `thin` — Low

`frontend/src/app/features/strain-hunter/strain-hunter.css:99, 174, 215, 256, 400` use `border: thin solid var(--color-border)`. `thin` is a valid CSS keyword equal to `1px` in most contexts, but it is inconsistent with the rest of the project (which uses `1px solid var(--color-border)` or `var(--space-1) solid var(--color-border)`). Pick one form project-wide; recommend `1px solid`.

### 9. Glass-effect + ::ng-deep inside a feature CSS — Low

`frontend/src/app/features/strain-hunter/strain-hunter.css:449-458`:

```css
::ng-deep .p-dialog { background: transparent !important; ... }
::ng-deep .p-dialog .p-dialog-content { background: transparent !important; padding: 0 !important; }
```

This is leaky styling of a PrimeNG component from inside a feature. The `!important` is a smell. PrimeNG's recommended approach is to add a `styleClass` to `<p-dialog>` and target `.p-dialog.some-class` from the component CSS without `::ng-deep`. Alternatively, a `dialog` skin can be added once globally in `_primeng-overrides.css`.

### 10. Backdrop-filter still raw in a feature file — Low (rule violation)

`frontend/src/app/features/chat/chat/chat.css:77-78` and `_strain-hunter-filters.css` (not present) — only `chat.css:77-78`:

```css
backdrop-filter: blur(var(--glass-blur));
-webkit-backdrop-filter: blur(var(--glass-blur));
```

applied directly to `.chat-drop-overlay`. The project rule is: **`backdrop-filter` is NEVER applied directly to an element that also contains content** — only inside the `::before` pattern. `.chat-drop-overlay` *does* contain content (`<span class="ph">`). It also sets `background: color-mix(in srgb, var(--glass-bg) 80%, transparent)` and `border` on itself, which is the same trap that the rule warns about.

Recommended fix: refactor to the `::before` pattern (move `backdrop-filter` to a pseudo-element, set the visual on `:host` or the parent).

### 11. CSS `animation-delay` enumerated by hand — Low

`frontend/src/app/features/chat/chat-message/chat-message.css:253-287` lists `:nth-child(2)` through `:nth-child(n + 10)` with hand-computed delays (`150ms`, `300ms`, …, `1350ms`). This is not a violation of any specific rule, but it is **brittle**. Replace with a `style="--i: 1"` set on each child in the template and a single `animation-delay: calc(var(--i) * 150ms)` rule. Flag for follow-up.

### 12. `transition: var(--transition-standard)` shorthand hides which properties animate — Low

Rule violation of spirit, not letter. Two current occurrences:

- `assets/styles/_utilities.css:5` — `.link`
- `features/layout/main-sidebar/main-sidebar.css:121` — `.nav-item`

Replace with the explicit form already used in `_utilities.css` and `chat-message.css`:

```css
transition:
  background-color var(--transition-fast),
  border-color var(--transition-fast),
  color var(--transition-fast);
```

### 13. `app.css` lives at the project root with `:host ::ng-deep` and no scoping — Low

Beyond finding #7 above: the file uses `:host` with no component, which is a no-op (`:host` only matches inside a component's host element). The `:host ::ng-deep` still works because `::ng-deep` pierces view encapsulation, but the `direction: ltr` rules are effectively global. This is the same issue as #7, just framed differently.

## What is already correct (do not change)

- `_utilities.css` correctly uses tokens; the recent additions (`.sr-only`, refactored `.color-dot`, responsive `.catalog-toolbar`) are good.
- `_variables.css` is the only token file, with clean dark/light theme blocks.
- All global partials (`_forms.css`, `_buttons.css`, `_layout.css`, `_typography.css`, `_primeng-overrides.css`, `_animations.css`, `_reset.css`, `_utilities.css`) use nesting correctly.
- All component CSS files are scoped to a single `:host` or component-class root.
- No file uses `:root` from inside a component (good — no leaking of global selectors).
- No file uses `position: fixed` without an explicit z-index (except `app-tooltip`, which is fine because the value is intentional and the component is purpose-built).
- `app.css` uses 4-space indentation while every other CSS file uses 2-space; this is a pre-existing inconsistency, not a rule violation, but it is worth aligning the indentation in this one file.

## Recommended fix order

1. **Move inline styles out of templates** (finding #1) — small, isolated, no design changes.
2. **Delete the duplicate `.strain-rating` / `.strain-deal` block** (finding #4) — one-shot.
3. **Tokenize the obvious hardcoded values** flagged in finding #3 (12px → `--space-3`, 32px → `--space-8`, 10/11px → `--font-size-xs`, 18px chip height → a new `--chip-sm` token if you want a real token, or to `var(--space-4) + var(--space-1)` if you prefer a calc).
4. **Move the LTR PrimeNG overrides from `app.css` into a co-located confirm-dialog component CSS** (findings #7, #13).
5. **Add a global `.panel-header` / `.panel-title` set** in `_utilities.css` and replace the two feature-local copies (finding #5).
6. **Refactor `.chat-drop-overlay` to use the `::before` glass pattern** (finding #10).
7. **Replace `border: thin solid …` with `border: 1px solid …`** project-wide (finding #8).
8. **Convert the legacy card-like surfaces to `.card` modifiers** (finding #2) — same as previous audit; this is a big batch.
9. **Refactor `animation-delay` enumeration to `--i` custom property** (finding #11) — template change, not a CSS violation.
10. **Convert `transition: var(--transition-standard)` to explicit property list** (finding #12) — two-file change.
11. **Remove `::ng-deep` from `strain-hunter.css`** (finding #9) — set `styleClass` on `<p-dialog>` and target via the component class.

## Merged from `css-duplicate-styles-report.md` (2026-07-09)

The following findings were unique to the duplicate-styles report and not covered by the original 13 findings above.

### 14. Duplicated selectors across files — Medium

12 selectors are defined in multiple files with conflicting or redundant values:

| Selector | Files | Issue |
|---|---|---|
| `.row-label` | `_utilities.css`, `database-monitor-settings.css`, `llm-providers-management.css` | Conflicting font-weight |
| `.row-meta` | `_utilities.css`, `database-monitor-settings.css`, `llm-providers-management.css` | Conflicting font-size, font-family |
| `.row-title` + `.row-subtitle` | `strain-hunter-settings.css`, `llm-providers-management.css` | Duplicate definitions |
| `.error-text` | `_layout.css`, `_forms.css` | Near-identical, extra margin in one |
| `.panel-header` + `.panel-title` | `strain-hunter-settings.css`, `llm-providers-management.css` | Duplicate (also finding #5) |
| `.expand-panel-row .expand-panel-cell` | `strain-hunter-settings.css`, `llm-providers-management.css` | Different opacity values (2% vs 4%) |
| `.status-indicator` | `_utilities.css`, `llm-providers-management.css` | Different implementations (child element vs `::before`) |
| `.delete-confirmation` + `.warning-text` + `.action-btns` | `main-sidebar.css`, `chat-history.css` | Duplicate |
| `.user-profile` + `.user-avatar` + `.user-info` + `.user-name` | `header.css`, `main-sidebar.css` | Duplicate |
| `.custom-loader` | `_utilities.css` (global), `chat.css` | Full copy — global already exists |
| `.badge` | `_utilities.css`, `strain-hunter.css` | Redefined with different shape |
| `.tag` | `_utilities.css`, `database-monitor-settings.css` | Redefined with different layout |

**Fix:** Extract shared patterns to `_utilities.css` with modifiers. Rename component-specific variants (`.provider-status`, `.db-chip`, `.family-badge`).

### 15. Glass-effect pattern duplication — 9 locations — Low

The `::before` glass backdrop pattern is copy-pasted in 9 places instead of reusing `.glass-effect`:

1. `_utilities.css:92-100` — `.glass-effect::before` (canonical)
2. `_layout.css:117-125` — `.card::before`
3. `_layout.css:160-168` — `.metric-card::before`
4. `_layout.css:253-261` — `.table-container::before`
5. `_primeng-overrides.css:31-39` — `.p-datatable-thead::before`
6. `tooltip.css:33-41` — `.tooltip-card::before`
7. `score-tooltip.css:33-41` — `.score-card::before`
8. `_primeng-overrides.css:165-177` — `.p-tooltip .p-tooltip-text::before`
9. `_utilities.css:450-458` — `.app-tooltip::before`

**Fix:** `.card`, `.metric-card`, `.table-container` should use the `.glass-effect` class instead of re-implementing the `::before` pattern inline.

### 16. Hardcoded colors in non-token files — Low

| File | Line | Value | Suggested Token |
|---|---|---|---|
| `_layout.css` | 135 | `rgba(255, 255, 255, 0.12)` | `var(--color-border)` |
| `chat-message.css` | 164 | `rgba(255, 255, 255, 0.03)` | `var(--glass-bg)` |
| `chat-message.css` | 182 | `rgba(0, 212, 255, 0.02)` | `var(--color-primary-glow-bg)` |
| `database-monitor-settings.css` | 6-12 | `--color-table-1` through `--color-table-7` hardcoded | Use global tokens |
| `_buttons.css` | 173 | `rgba(0, 0, 0, 0.2)` | `var(--shadow-soft)` |
| `_utilities.css` | 373 | `rgba(0, 0, 0, 0.25)` | Shadow token |

### 17. Hardcoded `blur(8px)` — Low

| File | Line | Rule |
|---|---|---|
| `_forms.css` | 18-19 | `input, textarea, select` |
| `_layout.css` | 303 | `.error-badge` |

**Fix:** Replace with `blur(var(--glass-blur))`.

### 18. `!important` declarations — 35 total — Info

- **Acceptable (PrimeNG overrides): 25** — `_primeng-overrides.css:12`, `strain-hunter.css:5`, `_utilities.css:5`, `_reset.css:3`
- **Review needed: 10** — `_reset.css:8` (`.no-transitions`), `_reset.css:201` (scrollbar), `strain-hunter-settings.css:222` (responsive), `database-monitor-settings.css:226` (`.db-pct`)

### 19. Flat selectors (missing `:host` wrapper) — Low

| File | Issue |
|---|---|
| `database-monitor-settings.css` | All selectors flat except `:host` for variables |
| `llm-providers-management.css` | All selectors flat, no `:host` at all |
| `chat-history.css` | `.sessions-list` at top level (children nested correctly) |

**Fix:** Wrap all component selectors inside `:host { ... }`.

### 20. Duplicate keyframes — Low

| File | Keyframe |
|---|---|
| `tooltip.css:123-131` | `tooltipFadeIn` |
| `score-tooltip.css:172-179` | `tooltipReveal` |

Both are identical (`opacity: 0 → 1`). **Fix:** Consolidate to `fadeIn` in `_animations.css`.

## Files inspected (full list)

```
frontend/src/app/app.css
frontend/src/app/assets/styles/_animations.css
frontend/src/app/assets/styles/_buttons.css
frontend/src/app/assets/styles/_forms.css
frontend/src/app/assets/styles/_layout.css
frontend/src/app/assets/styles/_primeng-overrides.css
frontend/src/app/assets/styles/_reset.css
frontend/src/app/assets/styles/_typography.css
frontend/src/app/assets/styles/_utilities.css
frontend/src/app/assets/styles/_variables.css
frontend/src/app/components/shared/dropdown/dropdown.css
frontend/src/app/components/shared/score-tooltip/score-tooltip.css
frontend/src/app/components/shared/tooltip/tooltip.css
frontend/src/app/features/chat/chat-history/chat-history.css
frontend/src/app/features/chat/chat-message/chat-message.css
frontend/src/app/features/chat/chat/chat.css
frontend/src/app/features/design-system/_design-system-buttons.css
frontend/src/app/features/design-system/_design-system-showcase.css
frontend/src/app/features/design-system/_design-system-swatches.css
frontend/src/app/features/design-system/_design-system-tokens.css
frontend/src/app/features/design-system/design-system.css
frontend/src/app/features/layout/header/header.css
frontend/src/app/features/layout/main-sidebar/main-sidebar.css
frontend/src/app/features/llm-providers-management/llm-providers-management.css
frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.css
frontend/src/app/features/strain-hunter/_strain-hunter-filters.css
frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css
frontend/src/app/features/strain-hunter/strain-hunter.css
```

## Self-review

- **Each convention rule** — explicitly verified: rule #1 (inline styles) is violated, finding #1; rule #2 (no one-off classes) is partially violated, finding #2 and #5; rule #3 (prefer global) is partially violated, same; rule #4 (card convention) partially violated, finding #2; rule #5 (CSS nesting) is fully respected; rule #6 (tokens only) is partially violated, finding #3; rule #7 (generic class names) is fully respected; rule #8 (mandatory nesting under root) is fully respected; rule #9 (no bare-element styling) is fully respected; rule #10 (no `styles: [...]`) is fully respected.
- **No file was modified** — this is a read-only audit.
- **No Hebrew text** in this file — N/A.
- **Verification command** — none required (audit only). Suggested: `npx ng build` after fixes #1, #4, #7 to confirm no regressions.
- **Known limitations** — some findings (e.g. #2 "card convention") are architectural and require project-level decisions before code changes. The audit flags them but does not dictate a path.
