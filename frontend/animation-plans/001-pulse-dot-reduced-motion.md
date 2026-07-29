# 001 — Add prefers-reduced-motion to pulse-dot

- **Status**: DONE
- **Commit**: e79d798
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~8 lines

## Problem

The status pulse dot runs an infinite `pulse` animation with no `prefers-reduced-motion` handling. Users who need reduced motion get continuous scale + opacity oscillation that never stops.

**Location**: `frontend/src/app/assets/styles/_utilities.css:208`

```css
/* current */
.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-success-glow);
  animation: pulse 2s infinite;
  will-change: transform, opacity;
}
```

## Target

Replace the infinite scale animation with a static state under `prefers-reduced-motion`. Keep the color and a single subtle opacity pulse (non-vestibular), drop the scale transform.

```css
/* target */
.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-success-glow);
  animation: pulse 2s infinite;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .pulse-dot {
    animation: none;
  }
}
```

## Repo conventions to follow

- `prefers-reduced-motion` rules already exist in `_utilities.css:678` for shimmer effects.
- The pattern is: add a `@media (prefers-reduced-motion: reduce)` block after the base rule, set `animation: none`.

## Steps

1. Open `frontend/src/app/assets/styles/_utilities.css`.
2. After line 211 (closing `}` of `.pulse-dot`), add:

```css
@media (prefers-reduced-motion: reduce) {
  .pulse-dot {
    animation: none;
  }
}
```

## Boundaries

- Do NOT touch any other component or animation.
- Do NOT change the `pulse` keyframe itself — other elements may use it.
- Do NOT remove `will-change` — it's a hint for the animated state.

## Verification

- **Mechanical**: Run `npx ng build` — should pass with no new warnings.
- **Feel check**: Open dashboard, toggle `prefers-reduced-motion: reduce` in DevTools Rendering panel. Confirm the dot stays static (no scale oscillation) but retains its green color and glow.
- **Done when**: Pulse dot is motionless under reduced-motion but still visually indicates "active" via color.
