# Global Filters & Chips Styles Plan

## Goal

Promote every reusable filter / chip / collapsible pattern currently buried in `frontend/src/app/features/strain-hunter/_strain-hunter-filters.css` into a **single shared global stylesheet**, so that:

1. Strain Hunter, Explorer, Settings, and any future feature can use these patterns without re-declaring them.
2. The component CSS file `_strain-hunter-filters.css` either disappears entirely or shrinks to only strain-hunter-specific layout glue.
3. CSS-keyframe and class-name ownership is unambiguous — there is one canonical `.chip`, one canonical `.collapsible-row`, one canonical `.clear-all-btn`, and one canonical `@keyframes chipIn`.
4. No visual regression — every existing screen that uses these patterns renders identically before and after.

This plan is **additive** to the broader CSS cleanup plan (`css-duplicate-styles-remediation-plan.md`). It focuses narrowly on the filter / chip / collapsible pattern family.

---

## Why this matters

Today, four feature components reinvent the same primitives:

- **Strain Hunter** declares `.filter-chip` with a remove button, an animated entry, and a focus ring.
- **Explorer** declares the same pattern again with a different class name (`.explorer-filter-chip` or similar).
- **Database Monitor** has its own `.db-chip` that overlaps with `.tag` and `.badge`.
- **Settings pages** reimplement `.clear-all-btn` and `.filter-badge` inline.

Every duplication is a future bug — a theme tweak, an a11y fix, or a hover-state improvement must be applied N times instead of once.

---

## What gets globalized

After review of `_strain-hunter-filters.css`, every pattern in the file is generic enough to live in `_filters.css`. None of it is strain-hunter-specific.

| Current local class                                                   | Global name                                                      | Reason                                                                                                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.filter-badge`                                                       | `.icon-badge`                                                    | Generic: a small numeric badge positioned at the top-right of an icon. Used wherever an icon button has a count.                                                               |
| `.primary-btn.icon-only.active`                                       | modifier on global `.icon-only` button                           | The "active" state for an icon-only button is a global concern — every filter row in the app needs it.                                                                         |
| `.filters-row` + `> .filters-inner`                                   | `.collapsible-row` + `> .collapsible-inner`                      | The `grid-template-rows: 0fr/1fr` trick is a generic reveal/hide animation that never shifts parent layout. Useful for accordions, advanced panels, search expansions.         |
| `.price-range-filter` + `.price-range-header` + `.price-range-values` | `.filter-range` + `.filter-range-header` + `.filter-range-value` | A horizontal range filter with header label and value chip is a generic filter-row pattern. Strain Hunter uses it for price; other features will use it for any numeric range. |
| `.filters-container` + `.filters-label` + `.filters-count`            | `.filter-bar` + `.filter-bar-label` + `.filter-bar-count`        | A horizontal filter row with an icon, a "Filters" label, a count chip, a list of chips, and a clear-all action. This is the canonical "filter bar" UI.                         |
| `.filter-chip` + `.chip-text` + `.chip-remove-btn`                    | `.chip` + `.chip-text` + `.chip-remove-btn`                      | A pill chip with an optional remove button. Strain Hunter, Explorer, and any chip-based filter UI share this.                                                                  |
| `.clear-all-btn`                                                      | `.clear-all-btn` (already a generic name, just moves to global)  | A text button that resets all filters. Same pattern in every filter UI.                                                                                                        |
| `@keyframes filterChipIn`                                             | `@keyframes chipIn`                                              | Entry animation for chips. Identical logic, generic name.                                                                                                                      |
| `.filters-row` reduced-motion + responsive rules                      | applies to `.collapsible-row` (same selector, renamed)           | The reduced-motion and `max-width: 640px` rules apply to the global class.                                                                                                     |

**Nothing in the file stays component-scoped.** The strain-hunter page will consume the global classes with no custom overrides.

---

## Target file structure

```
frontend/src/app/assets/styles/
  _filters.css   ← NEW
  _variables.css
  _reset.css
  _layout.css
  _utilities.css
  _buttons.css
  _forms.css
  _animations.css   ← may already exist; if not, create it
  _primeng-overrides.css
  styles.css        ← imports _filters.css alongside the rest
```

`_filters.css` is the new home for every class listed in the table above. The file is then imported by `styles.css` in alphabetical order (or wherever the existing imports place utility files — match the existing convention).

---

## The new `_filters.css`

```css
/* ============================================================
   Global Filters, Chips, and Collapsible Patterns
   ------------------------------------------------------------
   Used by Strain Hunter, Explorer, Database Monitor, Settings,
   and any future feature that needs:
     - Filter rows with chips and a clear-all action
     - Range filters (price, score, count)
     - Collapsible reveal/hide rows
     - Icon buttons with active state and count badges
   ============================================================ */

/* --- Icon Badge (count on icon-only buttons) --- */
.icon-badge {
  position: absolute;
  top: var(--space-1); /* tokenized after Phase 1 spacing migration */
  right: var(--space-1);
  min-width: 16px;
  height: 16px;
  padding: 0 var(--space-1);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-bold);
  color: var(--color-white);
  background: var(--color-danger);
  border-radius: var(--radius-pill);
  display: inline-grid;
  place-items: center;
  line-height: 1;
}

/* --- Icon-only Button Active State --- */
/* Extends .icon-only defined in _buttons.css. The modifier
   applies the active visual state (border + tint) without
   re-declaring the base button shape. */
.icon-only.active {
  background: var(--color-primary-glow-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* --- Collapsible Row (0fr/1fr trick) ---
   Animates height reveal/hide without shifting parent flex layout. */
.collapsible-row {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-slow);

  &.is-open {
    grid-template-rows: 1fr;

    > .collapsible-inner {
      opacity: 1;
      transform: translateY(0);
    }
  }

  > .collapsible-inner {
    overflow: hidden;
    min-height: 0;
    opacity: 0;
    transition:
      opacity var(--transition-slow),
      transform var(--transition-slow);
  }
}

/* --- Filter Bar (horizontal row of filters with label + chips + clear-all) --- */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-6);
  padding: var(--space-4) var(--space-6);

  .filter-bar-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;

    .ph {
      font-size: var(--font-size-md);
      color: var(--color-primary);
      line-height: 1;
    }
  }

  .filter-bar-count {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 var(--space-2);
    font-size: var(--font-size-xxs);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    color: var(--color-primary);
    background: var(--color-primary-glow-bg);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-pill);
    line-height: 1;
  }
}

/* --- Filter Bar List (chips + clear-all) --- */
.filter-bar-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
  min-width: 0;
}

/* --- Chip (filter chip with optional remove button) --- */
.chip {
  --chip-i: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2) 2px var(--space-4);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-pill);
  background: var(--color-primary-glow-bg);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  max-width: 100%;
  animation: chipIn var(--transition-slow) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--chip-i) * 35ms);
  transition:
    var(--transition-colors),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  cursor: pointer;

  &:hover {
    background: var(--color-primary-glow);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary-glow);

    .chip-remove-btn {
      transition: var(--transition-colors);
      color: var(--color-primary);
      background: var(--color-input-bg);
    }
  }

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-input-focus);
  }

  .chip-text {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }

  .chip-remove-btn {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-pill);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    flex-shrink: 0;
    transition: var(--transition-colors);

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }
  }
}

/* --- Clear-all Button --- */
.clear-all-btn {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition: var(--transition-colors);

  .ph {
    font-size: var(--font-size-sm);
    line-height: 1;
  }

  &:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
    background: var(--color-danger-glow);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}

/* --- Filter Range (price, score, count, etc.) --- */
.filter-range {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-6);
  padding: var(--space-4) var(--space-6);
  width: 100%;

  .filter-range-header {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;

    .ph {
      font-size: var(--font-size-md);
      color: var(--color-primary);
      line-height: 1;
    }

    .filter-range-label {
      color: var(--color-text-secondary);
    }

    .filter-range-value {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-primary);
      background: var(--color-primary-glow-bg);
      padding: 2px var(--space-4);
      border-radius: var(--radius-pill);
      border: 1px solid var(--color-primary);
    }
  }

  .filter-range-slider {
    flex: 1;
    min-width: 200px;
    max-width: 400px;
    padding: 0 var(--space-4);
  }
}

/* --- Chip Entry Animation --- */
@keyframes chipIn {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* --- Reduced Motion --- */
@media (prefers-reduced-motion: reduce) {
  .collapsible-row {
    transition: none;

    > .collapsible-inner {
      transition: none;
    }
  }

  .chip {
    animation: none;
  }
}

/* --- Mobile --- */
@media (max-width: 640px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-4);

    .filter-bar-label {
      justify-content: center;
    }
  }

  .filter-bar-list {
    justify-content: center;
  }

  .clear-all-btn {
    margin-right: 0;
    align-self: center;
  }
}
```

---

## Required token additions (verify before this plan runs)

Before the file is committed, verify these tokens exist in `_variables.css`:

| Token                     | Used for                                             |
| ------------------------- | ---------------------------------------------------- |
| `--color-primary-glow-bg` | Active icon background, chip background, count badge |
| `--color-primary-glow`    | Hover background tint                                |
| `--color-input-focus`     | Focus ring color                                     |
| `--color-danger-glow`     | Clear-all hover background                           |
| `--color-input-bg`        | Remove-button hover background                       |
| `--radius-pill`           | Chip / badge border-radius                           |
| `--radius-sm`             | Clear-all button border-radius                       |
| `--transition-colors`     | Color transition shorthand                           |
| `--transition-fast`       | Fast transition                                      |
| `--transition-slow`       | Slow transition                                      |
| `--font-size-xxs`         | Tiny text (10-11px)                                  |
| `--font-weight-semibold`  | Semi-bold                                            |
| `--font-weight-bold`      | Bold                                                 |

The audit indicates `--color-primary-glow-bg` and `--color-primary-glow` may not exist as separate tokens today — Strain Hunter currently uses `--primary-30` and `--primary-300` which are alias-like values. **Resolve those aliases into the canonical names before the migration** so the new global file references the real tokens.

If any token is genuinely missing after verification, add it as a one-line addition in Phase 1 of the broader plan. Do not leave `--primary-30` / `--primary-300` in the global file — those names are strain-hunter-specific shorthand.

---

## Migration steps

### Step 1 — Create `_filters.css`

Write the file as shown above (or with whatever the project's CSS nesting convention uses — verify against `_utilities.css` first). Import it from `styles.css` in the same position the other utility files are imported.

### Step 2 — Update `strain-hunter.html` and `strain-hunter-settings.html`

Replace each local class with its global equivalent:

| Old                      | New                        |
| ------------------------ | -------------------------- |
| `.filter-badge`          | `.icon-badge`              |
| `.filters-row`           | `.collapsible-row`         |
| `.filters-row.on-filter` | `.collapsible-row.is-open` |
| `> .filters-inner`       | `> .collapsible-inner`     |
| `.filters-container`     | `.filter-bar`              |
| `.filters-label`         | `.filter-bar-label`        |
| `.filters-count`         | `.filter-bar-count`        |
| `.filters-list`          | `.filter-bar-list`         |
| `.filter-chip`           | `.chip`                    |
| `.price-range-filter`    | `.filter-range`            |
| `.price-range-header`    | `.filter-range-header`     |
| `.price-range-values`    | `.filter-range-value`      |
| `.price-range-label`     | `.filter-range-label`      |
| `.price-range-slider`    | `.filter-range-slider`     |

If strain-hunter.html has class strings like `class="filters-row on-filter"`, they become `class="collapsible-row is-open"`.

### Step 3 — Delete `_strain-hunter-filters.css`

After the rename, the file is empty (no strain-hunter-specific styles remain). Delete it.

If the strain-hunter CSS budget warning block disappears as a result (the file was 308 lines), note this as a measurable win.

### Step 4 — Apply the same rename across Explorer, Database Monitor, and Settings

Each feature component that uses any of these patterns gets the same class replacement. Search the codebase first:

```bash
rg -n "\.(filter-chip|filter-badge|filters-row|filters-container|filters-label|filters-count|filters-list|clear-all-btn|price-range-filter|price-range-header|price-range-values|price-range-label|price-range-slider)" frontend/src/app
```

For each hit:

1. Replace the local class with the global one.
2. If the feature has any style tweaks beyond what the global offers, move them to the component CSS file as overrides (`.my-feature .chip { ... }`).

### Step 5 — Resolve the `--primary-30` / `--primary-300` shorthand

These tokens appear in the strain-hunter file (lines 24, 83, 86, 134, 154, 156). Confirm what they map to in the global token system. The new `_filters.css` uses canonical token names only, so the renames happen naturally.

If the audit is correct that these are aliases, document them in `_variables.css` as deprecated and either:

- Map them to the canonical tokens (`--primary-30: var(--color-primary-glow-bg);`), or
- Delete them after confirming no remaining consumers.

The global file does **not** import aliases.

---

## Risks & mitigations

| Risk                                                                                                                     | Likelihood | Mitigation                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing CSS budget warnings (matching-preferences-drawer, strain-hunter, chat-message) get worse before they get better | Low        | Deleting a 308-line file more than offsets any added complexity. Verify with `npx ng build` after Step 3.                                                                                              |
| A feature file uses `.filter-chip` but with extra custom styling that doesn't fit the global                             | Medium     | Step 4 calls out the override pattern (`.my-feature .chip { ... }`). The override is reviewed manually.                                                                                                |
| `--primary-30` and `--primary-300` are referenced outside the strain-hunter file and breaking them breaks something else | Medium     | Search the codebase before deletion: `rg -n "primary-30\|primary-300" frontend/src/app`. If they are used elsewhere, promote them to proper tokens first.                                              |
| Chip animation timing (`35ms` per chip) is too fast/slow for a different feature                                         | Low        | The delay is driven by `--chip-i` which the consumer sets per chip. The animation duration is `var(--transition-slow)`. Both are tunable.                                                              |
| `.collapsible-inner` opacity / transform interferes with other features' inner contents                                  | Low        | The inner opacity is 0 → 1, and the transform is `translateY(0)`. These are safe for most contents. If a feature needs a different visual, it overrides with `.my-feature .collapsible-inner { ... }`. |
| Mobile responsive rules break on a smaller-screen feature that uses the same `.filter-bar` class                         | Low        | The mobile rule is generic (column layout, centered). If a feature needs a different mobile layout, it overrides with a more specific selector.                                                        |

---

## Definition of done

- `_filters.css` exists in `frontend/src/app/assets/styles/` and is imported from `styles.css`.
- `_strain-hunter-filters.css` is deleted.
- `rg -n "\.(filter-chip|filter-badge|filters-row|filters-container|filters-label|filters-count|filters-list|price-range-filter|price-range-header|price-range-values|price-range-label|price-range-slider)" frontend/src/app` returns zero hits.
- `rg -n "filterChipIn" frontend/src/app` returns zero hits (renamed to `chipIn`).
- `rg -n "primary-30\|primary-300" frontend/src/app` returns only the resolution in `_variables.css` (if any) and zero hits in feature components.
- `npx ng build` from `frontend/` passes with **no new warnings**.
- Manual visual spot-check:
  - Strain Hunter page renders identically (filter bar, chips, range slider, collapsible row).
  - Strain Hunter Settings page (if it uses the same patterns) renders identically.
  - Explorer page (if it uses the same patterns) renders identically.
  - Database Monitor page renders identically.
  - Any settings page with chips/filters renders identically.

---

## Out of scope (called out explicitly)

- The 5-phase broader plan in `css-duplicate-styles-remediation-plan.md` is **not** part of this plan. This plan is a focused extraction. If that plan's Phase 1 (spacing token migration) hasn't run yet, do that first, then run this plan.
- PrimeNG's `p-chip` component is **not** replaced by `.chip`. If the project uses `p-chip` anywhere, it's a separate decision (whether to align with PrimeNG or override it).
- The 11px font-size on `.chip-remove-btn` (line 213) is technically a raw value. It will be replaced when the broader Phase 5 hardcoded-value cleanup runs.
- Adding animation variants (e.g. `chipIn-left`, `chipIn-right`) is deferred — the single `chipIn` covers all current use cases.

---

## Agent checklist

This plan is meant to be executed by one agent in five sequential steps, with build verification at each step boundary:

1. Create `_filters.css` and import it.
2. Rename classes in `strain-hunter.html` and `strain-hunter-settings.html`.
3. Delete `_strain-hunter-filters.css`.
4. Rename classes in Explorer, Database Monitor, and Settings.
5. Resolve `--primary-30` / `--primary-300`.

If any step takes longer than expected, do not start the next — break the work down further or surface a blocker.
