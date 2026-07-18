# Light Mode Improvement Plan

## Goal

Transform light mode from a flat, washed-out inversion of dark mode into a warm, layered, premium-looking theme that stands on its own.

## Diagnosis

Dark mode works because it leans into **depth, glow, and translucency** — the navy backdrop makes cyan/fuchsia pop, glass effects feel premium, and shadows create real layers. Light mode copies the same structure but with pale values, resulting in:

1. **Flat surfaces** — `#FFFFFF` on `#F0F4F8` with 72% opacity glass = no depth
2. **Muted accents** — `#0284C7` (dark blue) on white reads "corporate", not luxury
3. **Weak borders** — `rgba(15,23,42,0.10)` is nearly invisible, elements float without definition
4. **Glassmorphism fails** — dark-mode glass relies on dark translucent layers; light glass just looks like washed-out white
5. **No glow/shadow drama** — `rgba(15,23,42,0.08)` shadows are flat grey, no premium lift
6. **Gradient backgrounds** — too subtle (6% opacity radial gradients disappear on light)

## Approach

Don't copy dark mode's token structure. Build a **warm, layered light palette** that stands on its own.

## Token Changes (`_variables.css` — `[data-theme="light"]`)

### Base & Surfaces

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--color-bg` | `#F0F4F8` | `#F8F9FB` | Slightly warmer, less blue-grey |
| `--color-bg-gradient` | 6%/5% opacity radials | 8%/6% opacity, warmer tints | Visible but soft gradient |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | Keep — clean cards |
| `--color-surface-elevated` | `#F8FAFC` | `#F1F3F7` | More contrast from base |
| `--color-surface-hover` | `#F1F5F9` | `#E8ECF2` | Stronger hover state |

### Primary (sky-blue family — deeper for contrast)

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--color-primary` | `#0284C7` | `#0369A1` | Deeper sky — more contrast on white |
| `--color-primary-glow` | `rgba(2,132,199,0.16)` | `rgba(3,105,161,0.14)` | Match deeper primary |
| `--primary-30` | `rgba(2,132,199,0.09)` | `rgba(3,105,161,0.08)` | Match |
| `--primary-300` | `rgba(2,132,199,0.35)` | `rgba(3,105,161,0.35)` | Keep opacity, update hue |
| `--primary-400` | `#0EA5E9` | `#0EA5E9` | Keep — already good mid-tone |
| `--primary-600` | `#0369A1` | `#075985` | Must go deeper than `--color-primary` so button bg != base color |

### Secondary (purple family — full scale update)

Light mode uses **purple** (`#9333EA`) instead of dark fuchsia (`#A21CAF`). Fuchsia at dark values looks muddy on white; purple stays vibrant and readable.

> Note: purple is a common "AI branding" hue (Anthropic, OpenAI). This is acceptable — it's not a full escape from the association, but it's visually distinct from dark mode's fuchsia and reads better on light backgrounds.

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--color-secondary` | `#A21CAF` | `#9333EA` | Purple base — vibrant on white |
| `--color-secondary-glow` | `rgba(162,28,175,0.12)` | `rgba(147,51,234,0.10)` | Match |
| `--color-secondary-border` | `rgba(162,28,175,0.28)` | `rgba(147,51,234,0.25)` | Match |
| `--secondary-30` | `rgba(162,28,175,0.04)` | `rgba(147,51,234,0.06)` | Match |
| `--secondary-300` | `rgba(162,28,175,0.30)` | `rgba(147,51,234,0.30)` | Keep opacity, update hue |
| `--secondary-400` | `#C026D3` | `#A855F7` | Lighter purple — hover/active states |
| `--secondary-600` | `#86198F` | `#7C3AED` | Darker purple — button backgrounds |

### Borders (keep or strengthen — don't weaken)

The diagnosis says borders are "nearly invisible". Weakening them further contradicts the fix. The dual-layer shadow update compensates for depth, but borders still need to provide edge definition. **Keep current values** and rely on the improved shadows + glass-border for the premium feel.

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--color-border` | `rgba(15,23,42,0.10)` | `rgba(15,23,42,0.10)` | Keep — already soft, shadows will add depth |
| `--color-border-strong` | `rgba(15,23,42,0.22)` | `rgba(15,23,42,0.22)` | Keep — needed for table header, active states |

### Glass & Shadows (the real depth fix)

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.72)` | `rgba(255,255,255,0.80)` | More opaque — less "washed" look |
| `--glass-border` | `rgba(255,255,255,0.95)` | `rgba(15,23,42,0.06)` | Visible border on light (white-on-white is invisible) |
| `--glass-shadow` | `0 4px 24px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,1)` | `0 4px 24px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.8)` | Layered shadow for depth |
| `--shadow-soft` | `0 2px 12px rgba(15,23,42,0.08)` | `0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)` | Dual-layer soft shadow |
| `--shadow-elevated` | `0 8px 28px rgba(15,23,42,0.12)` | `0 8px 28px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)` | More depth |
| `--shadow-glow-primary` | `0 0 14px rgba(2,132,199,0.20)` | `0 0 12px rgba(3,105,161,0.18)` | Match |

### Inputs & Misc

| Token | Current | Proposed | Rationale |
|---|---|---|---|
| `--color-input-bg` | `#FFFFFF` | `#F8F9FB` | Slightly off-white — shows focus ring better |
| `--color-input-focus` | `rgba(2,132,199,0.14)` | `rgba(3,105,161,0.16)` | Slightly stronger |
| `--grey-30` | `rgba(0,0,0,0.015)` | `rgba(0,0,0,0.03)` | Slightly more visible |

## WCAG Verification

All new colors pass AA for normal text and UI components:

| Pair | Ratio | AA Normal Text |
|---|---|---|
| `#0369A1` on `#FFFFFF` | 5.93 | ✅ |
| `#0369A1` on `#F8F9FB` | 5.63 | ✅ |
| `#9333EA` on `#FFFFFF` | 5.38 | ✅ |
| `#9333EA` on `#F8F9FB` | 5.11 | ✅ |
| White text on `#0369A1` button | 5.93 | ✅ |
| White text on `#075985` button | 7.56 | ✅ |
| White text on `#7C3AED` button | 5.70 | ✅ |

> **Warning:** `--secondary-400` (`#A855F7`) on white = **3.96** — fails AA for normal text. Use only as background/accent/icon color, never as text color on light surfaces.

Improvement over current: `#0284C7` was lower contrast on white. The deeper values are better for accessibility.

## Files to Touch

1. **`_variables.css`** — all token changes above
2. **`_reset.css`** — verify body background uses `--color-bg-gradient`
3. **`_layout.css`** — check glass-effect, card, page-header shadows work with new values
4. **`_filters.css`** — chip/filter styling on light backgrounds
5. **`_primeng-overrides.css`** — table header, row borders, sort icons
6. **Component CSS files** — spot-check strain-hunter, sidebar, header for any hardcoded colors

## What NOT to Change

- Dark mode tokens — untouched
- Semantic colors (success, danger, warning) — already work on both themes
- Font sizes, spacing, radii — layout concerns, not color
- Glass blur value (`20px`) — keeping consistent

## Verification

1. `npx ng build` — must pass
2. Visual check: light mode cards should have visible depth (shadow + border)
3. Visual check: primary/secondary accents should pop on white
4. Visual check: glassmorphism should look frosted, not washed-out
5. WCAG contrast on text tokens (verified above)
6. Verify `--primary-600` != `--color-primary` (button bg vs base accent)
7. Verify secondary scale is consistent purple throughout (no fuchsia remnants)
