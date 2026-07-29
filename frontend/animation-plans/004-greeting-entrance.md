# 004 — Add entrance fade to greeting header

- **Status**: DONE
- **Commit**: e79d798
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 2 files, ~12 lines

## Problem

The greeting `<h2>` teleports in instantly while the metric cards stagger in over 400ms. The mismatch feels disjointed — the header should lead the entrance, not appear before the cards even start.

**Location**: `frontend/src/app/features/dashboard/dashboard.html:24`

```html
<!-- current -->
<header class="page-header">
  <h2>שלום, {{ authStore.user()?.fullName || authStore.user()?.email }}!</h2>
</header>
```

## Target

Add a subtle fade-in to the header that precedes the card stagger by ~100ms. Use `@keyframes` for the entrance, then remove it (CSS transitions for ongoing state, keyframes for one-shot entrance).

```css
/* target — in _layout.css or a dashboard-specific section */
.page-header {
  animation: fade-in 300ms var(--ease-out) forwards;
  opacity: 0;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Repo conventions to follow

- `@keyframes` are defined in `_animations.css`.
- The `var(--ease-out)` token from plan 003 should be used (dependency: 003).
- Stagger delays on cards: 0ms, 80ms, 160ms. Header should fade in before cards start (0ms delay, 300ms duration).

## Steps

1. Open `frontend/src/app/assets/styles/_animations.css`.
2. Add the `fade-in` keyframe:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

3. Open `frontend/src/app/assets/styles/_layout.css`.
4. Add a rule for `.page-header` (inside or near the `.metric-card` section):

```css
.page-header {
  opacity: 0;
  animation: fade-in 300ms var(--ease-out) forwards;
}
```

5. Add `prefers-reduced-motion` handling:

```css
@media (prefers-reduced-motion: reduce) {
  .page-header {
    animation: none;
    opacity: 1;
  }
}
```

## Boundaries

- Do NOT change the greeting text or markup.
- Do NOT change the card stagger timing.
- Do NOT add any transform to the header — opacity only.

## Verification

- **Mechanical**: Run `npx ng build` — should pass.
- **Feel check**: Reload dashboard. Header fades in smoothly, then cards stagger in. The header should be fully visible before the first card starts moving.
- **Done when**: Header fades in ~300ms, cards follow with stagger, no jarring teleport.
