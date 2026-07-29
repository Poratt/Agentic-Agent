# 002 — Gate hover lift behind (hover: hover) media query

- **Status**: DONE
- **Commit**: e79d798
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~12 lines

## Problem

The metric card hover lift (`translate: 0 -2px` + deeper shadow) fires on touch devices because there's no `(hover: hover) and (pointer: fine)` gate. Touch devices trigger `:hover` on tap, causing a false-positive lift that stays stuck until the user taps elsewhere.

**Location**: `frontend/src/app/assets/styles/_layout.css:183`

```css
/* current */
&:hover {
  border: 1px solid var(--color-primary-glow);
  translate: 0 -2px;
  box-shadow: var(--glass-shadow), 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

## Target

Wrap the hover rules in a media query so they only apply to devices with a fine pointer and hover capability.

```css
/* target */
@media (hover: hover) and (pointer: fine) {
  .metric-card:hover {
    border: 1px solid var(--color-primary-glow);
    translate: 0 -2px;
    box-shadow: var(--glass-shadow), 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}
```

## Repo conventions to follow

- No existing `@media (hover: hover)` usage in the project — this will be the first.
- The `:active` state should remain ungated — touch devices need press feedback.

## Steps

1. Open `frontend/src/app/assets/styles/_layout.css`.
2. Remove the `&:hover { ... }` block from inside `.metric-card` (lines 183–187).
3. After the `.metric-card` closing `}` (line 289), add a standalone media query block:

```css
@media (hover: hover) and (pointer: fine) {
  .metric-card:hover {
    border: 1px solid var(--color-primary-glow);
    translate: 0 -2px;
    box-shadow: var(--glass-shadow), 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}
```

4. Keep the `&:active` block inside `.metric-card` — press feedback must work on all devices.

## Boundaries

- Do NOT touch the `:active` state.
- Do NOT change any other component's hover behavior.
- Do NOT remove the `transition` property from `.metric-card`.

## Verification

- **Mechanical**: Run `npx ng build` — should pass.
- **Feel check**: On desktop (mouse), hover over a card — confirm lift + shadow appears. On touch device or DevTools touch emulation, tap a card — confirm NO lift, only press feedback.
- **Done when**: Hover lift only fires with a real mouse/trackpad, never on touch tap.
