# 003 — Extract easing to shared --ease-out token

- **Status**: DONE
- **Commit**: e79d798
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files, ~6 lines

## Problem

The custom easing curve `cubic-bezier(0.23, 1, 0.32, 1)` is hardcoded in `_layout.css:176`. No shared easing tokens exist. Other components will invent their own curves, creating inconsistent motion across the app.

**Location**: `frontend/src/app/assets/styles/_layout.css:176`

```css
/* current */
animation: card-enter 400ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
```

## Target

Define `--ease-out` as a CSS custom property in the global tokens file, reference it from the metric card.

```css
/* target — in _animations.css or _variables.css */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

/* target — in _layout.css */
animation: card-enter 400ms var(--ease-out) forwards;
```

## Repo conventions to follow

- CSS custom properties are defined in `:root` in `_variables.css` or at the top of `_animations.css`.
- No existing easing tokens — `--ease-out` will be the first. Future tokens: `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.

## Steps

1. Open `frontend/src/app/assets/styles/_animations.css`.
2. At the top of the file (after any existing `:root` block, or create one), add:

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}
```

3. Open `frontend/src/app/assets/styles/_layout.css`.
4. On line 176, replace the hardcoded curve with the token:

```css
/* before */
animation: card-enter 400ms cubic-bezier(0.23, 1, 0.32, 1) forwards;

/* after */
animation: card-enter 400ms var(--ease-out) forwards;
```

## Boundaries

- Do NOT change the curve values — only extract to a token.
- Do NOT add other easing tokens in this plan (future work).
- Do NOT touch any other component's transitions.

## Verification

- **Mechanical**: Run `npx ng build` — should pass.
- **Feel check**: Dashboard cards should animate in identically to before — same speed, same curve. The token is a refactor, not a behavior change.
- **Done when**: `--ease-out` is defined once, referenced in `_layout.css`, and the card entrance feels identical.
