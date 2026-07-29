# Strain Hunter Motion Polish Plan

## Goal

Add two high-craft, GPU-accelerated motion improvements to the `strain-hunter` component, identified through a Design Engineering review and validated against the actual codebase:

1. **CSS Grid accordion** for the filter panel — smooth height reveal/hide without JavaScript height calculations.
2. **Dialog entry animation** for the image modal — scale from `0.96` with `opacity: 0`.

Three other suggestions from the original review were explicitly **deferred or rejected** after codebase analysis:

- **Stagger animation on terpene chips** — deferred. The list is dynamically filtered; re-triggering `@keyframes` on every filter change causes flicker. A class-based transition or `@defer` strategy is needed before this is safe.
- **Tooltip skip-delay** — rejected. The tooltip logic is shared across 3 entry points (`onTerpeneEnter`, `onGeneticsEnter`, `onScoreRingEnter`) and managed by an external `TooltipDirective`. Adding state-tracking complexity risks breaking positioning for all consumers.
- **Active states** — already implemented. `.strain-thumbnail:active`, `.family-badge:active`, `.filter-node:active` all already use `transform: scale(0.97)`.

## Scope

- Files: `strain-hunter.css`, `strain-hunter.html`
- No TypeScript changes required.
- No new dependencies.

## Implementation

### 1. CSS Grid Accordion for Filters

The `.collapsible-row` container currently snaps open instantly. Replace with a `grid-template-rows: 0fr → 1fr` transition.

**HTML structure (already exists, lines 118-119):**

```html
<div class="collapsible-row" [class.is-open]="filtersExpanded()">
  <div class="collapsible-inner">
```

**CSS addition to `strain-hunter.css`:**

```css
.collapsible-row {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-normal);
  overflow: hidden;

  &.is-open {
    grid-template-rows: 1fr;
  }

  .collapsible-inner {
    min-height: 0; /* Critical for CSS grid transition to work */
  }
}
```

**Verification:** The `.collapsible-inner` wrapper exists in the HTML. No existing CSS targets `.collapsible-row` for height/transition, so no conflicts.

### 2. Dialog Entry Animation

The `p-dialog` with `class="image-dialog"` (HTML line 556) currently uses PrimeNG's default fade. Replace with a scale-based entry.

**CSS addition to `strain-hunter.css`:**

```css
::ng-deep .image-dialog .p-dialog {
  transform: scale(0.96);
  opacity: 0;
  transition:
    transform var(--transition-normal),
    opacity var(--transition-normal) !important;
}

::ng-deep .image-dialog .p-dialog-mask-active .p-dialog {
  transform: scale(1);
  opacity: 1;
}
```

**Verification:** `class="image-dialog"` is confirmed on the `p-dialog` element. The `::ng-deep` pattern is already used elsewhere in the component for PrimeNG overrides.

## Definition of Done

- [ ] `.collapsible-row` CSS grid accordion transition is implemented in `strain-hunter.css`.
- [ ] `.image-dialog` scale entry animation is implemented in `strain-hunter.css`.
- [ ] No new CSS conflicts — `npx ng build` from `frontend/` passes with no new warnings.
- [ ] Visual spot-check: filter panel opens/closes smoothly; image dialog scales in from `0.96`.
- [ ] `stagger-scale-up` keyframes are **not** added (deferred — flicker risk on dynamic lists).
- [ ] Tooltip skip-delay logic is **not** added (deferred — complexity risk on shared directive).

## Out of Scope

- Stagger animation on terpene chips (flicker on dynamic filter re-render).
- Tooltip adjacent-hover skip-delay (shared directive complexity).
- Active state additions (already implemented).
