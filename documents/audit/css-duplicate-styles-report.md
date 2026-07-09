# CSS Duplicate Styles & Violations Report

Generated: 2026-07-09

## Summary

| Category                                        | Count                         |
| ----------------------------------------------- | ----------------------------- |
| Identical/near-identical selectors across files | 12                            |
| Glass-effect pattern duplication                | 9 locations                   |
| Hardcoded colors (non-token files)              | 6                             |
| Hardcoded `blur(8px)`                           | 2                             |
| Hardcoded pixel values (components)             | 80+ across 14 files           |
| `!important` declarations                       | 35 (25 PrimeNG overrides)     |
| Flat selectors (should use `:host` nesting)     | 2 files full flat + 1 partial |
| Duplicate keyframes                             | 2 identical                   |
| Duplicate internal blocks                       | 1 file                        |
| `.custom-loader` full copy                      | 1 file                        |
| Missing design-system tokens for small sizes    | Pervasive                     |

---

## Category 1: Duplicated Selectors Across Files

### 1.1 `.row-label` — 3 files, conflicting values

| File                            | Line    | Declaration                                                  |
| ------------------------------- | ------- | ------------------------------------------------------------ |
| `_utilities.css`                | 337-339 | `font-weight: var(--font-weight-medium)`                     |
| `database-monitor-settings.css` | 170-174 | `font-weight-semibold`, `font-size-sm`, `color-text-primary` |
| `llm-providers-management.css`  | 65-67   | `font-weight: var(--font-weight-medium)`                     |

**Fix:** Keep global. Add modifier `.row-label--bold` for the semibold variant.

### 1.2 `.row-meta` — 3 files, conflicting values

| File                            | Line    | Declaration                                                   |
| ------------------------------- | ------- | ------------------------------------------------------------- |
| `_utilities.css`                | 341-344 | `font-size-sm`, `color-text-secondary`                        |
| `database-monitor-settings.css` | 176-181 | `font-size-xs`, `font-weight-semibold`, `white-space: nowrap` |
| `llm-providers-management.css`  | 69-73   | `font-family: var(--font-code)`                               |

**Fix:** Keep global. Add modifiers `.row-meta--xs`, `.row-meta--mono`.

### 1.3 `.row-title` + `.row-subtitle` — 2 files

| File                           | Lines  |
| ------------------------------ | ------ |
| `strain-hunter-settings.css`   | 6-20   |
| `llm-providers-management.css` | 87-103 |

**Fix:** Extract to `_utilities.css` as global classes.

### 1.4 `.error-text` — 2 files, near-identical

| File          | Line    | Declaration                         |
| ------------- | ------- | ----------------------------------- |
| `_layout.css` | 306-308 | `color-danger`, `font-size-xs`      |
| `_forms.css`  | 139-143 | Same + `margin-top: var(--space-1)` |

**Fix:** Keep one in `_layout.css`. Add `.form-field .error-text` for margin.

### 1.5 `.panel-header` + `.panel-title` — 2 files

| File                           | Lines   |
| ------------------------------ | ------- |
| `strain-hunter-settings.css`   | 56-84   |
| `llm-providers-management.css` | 252-266 |

**Fix:** Extract shared pattern to `_utilities.css`.

### 1.6 `.expand-panel-row .expand-panel-cell` — 2 files

| File                           | Line  | Opacity |
| ------------------------------ | ----- | ------- |
| `strain-hunter-settings.css`   | 38-45 | `2%`    |
| `llm-providers-management.css` | 80-85 | `4%`    |

**Fix:** Use CSS variable: `color-mix(in srgb, var(--color-text-primary) var(--expand-opacity, 2%), transparent)`.

### 1.7 `.status-indicator` — 2 files, different implementations

| File                           | Line    | Pattern                    |
| ------------------------------ | ------- | -------------------------- |
| `_utilities.css`               | 180-195 | Child `.pulse-dot` element |
| `llm-providers-management.css` | 105-127 | `::before` pseudo-element  |

**Fix:** Rename component version to `.provider-status`.

### 1.8 `.delete-confirmation` + `.warning-text` + `.action-btns` — 2 files

| File               | Lines   |
| ------------------ | ------- |
| `main-sidebar.css` | 81-99   |
| `chat-history.css` | 114-140 |

**Fix:** Extract to global utility in `_utilities.css`.

### 1.9 `.user-profile` + `.user-avatar` + `.user-info` + `.user-name` — 2 files

| File               | Lines   |
| ------------------ | ------- |
| `header.css`       | 32-65   |
| `main-sidebar.css` | 162-193 |

**Fix:** Extract to shared global pattern with size modifier.

### 1.10 `.custom-loader` — full copy

| File             | Lines             |
| ---------------- | ----------------- |
| `_utilities.css` | 199-208 (global)  |
| `chat.css`       | 27-34 (duplicate) |

**Fix:** Remove from `chat.css` — global already exists.

### 1.11 `.badge` redefined in `strain-hunter.css`

| File                | Lines   | Pattern                                            |
| ------------------- | ------- | -------------------------------------------------- |
| `_utilities.css`    | 119-158 | Pill border-radius, padding 3px                    |
| `strain-hunter.css` | 149-191 | Square border-radius, no border, different padding |

**Fix:** Use `.char-badge` or `.family-badge` instead of `.badge`.

### 1.12 `.tag` redefined in `database-monitor-settings.css`

| File                            | Lines   | Pattern                        |
| ------------------------------- | ------- | ------------------------------ |
| `_utilities.css`                | 347-354 | `inline-block`, no background  |
| `database-monitor-settings.css` | 205-218 | `inline-flex`, background, gap |

**Fix:** Use `.db-chip` instead of overriding `.tag`.

---

## Category 2: Glass-Effect Pattern Duplication (9 locations)

The glass backdrop pattern (`::before` with `backdrop-filter: blur`) is copy-pasted in:

1. `_utilities.css:92-100` — `.glass-effect::before`
2. `_layout.css:117-125` — `.card::before`
3. `_layout.css:160-168` — `.metric-card::before`
4. `_layout.css:253-261` — `.table-container::before`
5. `_primeng-overrides.css:31-39` — `.p-datatable-thead::before`
6. `tooltip.css:33-41` — `.tooltip-card::before`
7. `score-tooltip.css:33-41` — `.score-card::before`
8. `_primeng-overrides.css:165-177` — `.p-tooltip .p-tooltip-text::before`
9. `_utilities.css:450-458` — `.app-tooltip::before`

**Fix:** `.card`, `.metric-card`, `.table-container` should use `.glass-effect` class instead of re-implementing inline.

---

## Category 3: Hardcoded Colors

| File                            | Line | Value                                                 | Suggested Token                         |
| ------------------------------- | ---- | ----------------------------------------------------- | --------------------------------------- |
| `_layout.css`                   | 135  | `rgba(255, 255, 255, 0.12)`                           | `var(--color-border)`                   |
| `chat-message.css`              | 164  | `rgba(255, 255, 255, 0.03)`                           | `var(--glass-bg)`                       |
| `chat-message.css`              | 182  | `rgba(0, 212, 255, 0.02)`                             | `var(--color-primary-glow-bg)`          |
| `database-monitor-settings.css` | 6-12 | `--color-table-1` through `--color-table-7` hardcoded | Use global tokens from `_variables.css` |
| `_buttons.css`                  | 173  | `rgba(0, 0, 0, 0.2)`                                  | `var(--shadow-soft)`                    |
| `_utilities.css`                | 373  | `rgba(0, 0, 0, 0.25)`                                 | Shadow token                            |

---

## Category 4: Hardcoded `blur(8px)`

| File          | Line  | Rule                      |
| ------------- | ----- | ------------------------- |
| `_forms.css`  | 18-19 | `input, textarea, select` |
| `_layout.css` | 303   | `.error-badge`            |

**Fix:** Replace with `blur(var(--glass-blur))`.

---

## Category 5: Hardcoded Pixel Values (80+ instances)

### Missing tokens needed:

| Value  | Suggested Token                    |
| ------ | ---------------------------------- |
| `2px`  | `--space-0.5`                      |
| `6px`  | `--space-1.5`                      |
| `10px` | `--font-size-xxs` or `--space-2.5` |
| `11px` | No token (consider removing)       |
| `18px` | `--space-4.5`                      |
| `28px` | `--space-7`                        |
| `32px` | `--space-8`                        |
| `44px` | `--space-11`                       |
| `52px` | `--space-13`                       |

### Files with most hardcoded values:

| File                              | Count |
| --------------------------------- | ----- |
| `strain-hunter.css`               | 15+   |
| `_utilities.css`                  | 12+   |
| `llm-providers-management.css`    | 10+   |
| `_buttons.css`                    | 8+    |
| `_strain-hunter-filters.css`      | 7+    |
| `matching-preferences-drawer.css` | 5+    |

---

## Category 6: `!important` Declarations (35 total)

### Acceptable (PrimeNG overrides): 25

- `_primeng-overrides.css`: 12
- `strain-hunter.css`: 5
- `_utilities.css`: 5
- `_reset.css`: 3

### Review needed: 10

- `_reset.css:8` — `.no-transitions` (acceptable utility)
- `_reset.css:201` — scrollbar pseudo-element
- `strain-hunter-settings.css:222` — responsive override
- `database-monitor-settings.css:226` — `.db-pct` background

---

## Category 7: Flat Selectors (missing `:host` wrapper)

| File                            | Issue                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `database-monitor-settings.css` | All selectors flat except `:host` for variables           |
| `llm-providers-management.css`  | All selectors flat, no `:host` at all                     |
| `chat-history.css`              | `.sessions-list` at top level (children nested correctly) |

**Fix:** Wrap all component selectors inside `:host { ... }`.

---

## Category 8: Duplicate Keyframes

| File                        | Keyframe        |
| --------------------------- | --------------- |
| `tooltip.css:123-131`       | `tooltipFadeIn` |
| `score-tooltip.css:172-179` | `tooltipReveal` |

Both are identical (`opacity: 0 → 1`). **Fix:** Consolidate to `fadeIn` in `_animations.css`.

---

## Category 9: Duplicate Internal Block

| File                | Lines        | Issue                          |
| ------------------- | ------------ | ------------------------------ |
| `strain-hunter.css` | 70-72, 78-80 | `.strain-rating` defined twice |
| `strain-hunter.css` | 74-76, 82-84 | `.strain-deal` defined twice   |

**Fix:** Remove duplicate block (lines 78-84).

---

## Recommended Priority

1. **Quick wins** (high impact, low risk): Remove `.custom-loader` duplicate from `chat.css`, remove `.strain-rating`/`.strain-deal` duplicate, extract `.search-clear-btn` to global
2. **Medium effort**: Extract `.row-label`, `.row-meta`, `.row-title`, `.panel-header`, `.delete-confirmation` to globals
3. **Larger refactor**: Consolidate glass-effect pattern, add missing design tokens, convert flat selectors to `:host` nesting
4. **Low priority**: Replace hardcoded pixel values with tokens, reduce `!important` usage
