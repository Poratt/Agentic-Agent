# 005 — Add crossfade on page-state transitions

- **Status**: DONE
- **Commit**: e79d798
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 1 file, ~10 lines

## Problem

The `@switch (pageState())` blocks teleport between Loading, Error, Empty, and Ready states with no transition. The entire content snaps from one state to another, which feels jarring — especially Loading → Ready.

**Location**: `frontend/src/app/features/dashboard/dashboard.html:1-67`

```html
<!-- current — no transition between states -->
@switch (pageState()) {
    @case (PageStates.Loading) { ... }
    @case (PageStates.Ready) { ... }
}
```

## Target

Add a fade transition on the `.page-state` containers so state changes crossfade rather than teleport. Since Angular's `@switch` swaps DOM instantly, use a CSS approach: animate entry with `@starting-style` or a class-based approach.

```css
/* target — in _layout.css */
.page-state {
  animation: fade-in 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .page-state {
    animation: none;
  }
}
```

Note: `@starting-style` has limited Angular template support. The simplest approach is to add `animation: fade-in 200ms ease-out` to `.page-state` so each state fade-in's on appearance. The exit is instant (DOM removal), but the entrance is smooth — this is acceptable for page states.

## Repo conventions to follow

- `@keyframes fade-in` from plan 004 (dependency: 004).
- `.page-state` already has styles in the global CSS (loading-state, error-state, empty-state).

## Steps

1. Open `frontend/src/app/assets/styles/_layout.css`.
2. Find the `.page-state` base styles (or add them if they don't exist as a shared rule).
3. Add:

```css
.page-state {
  animation: fade-in 200ms ease-out;
}
```

4. Add to the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.page-state {
  animation: none;
}
```

## Boundaries

- Do NOT change the `@switch` structure in the template.
- Do NOT add JavaScript-based transitions.
- Do NOT change the loading spinner or error/empty state content.

## Verification

- **Mechanical**: Run `npx ng build` — should pass.
- **Feel check**: Reload dashboard — confirm the loading spinner fades in (not teleports). When data loads, the ready state fades in. Error and empty states also fade in if triggered.
- **Done when**: State transitions have a brief opacity entrance, no jarring snap.
