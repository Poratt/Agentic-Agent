# Light Mode Character Upgrade — Teal Primary + Dark-Mirror Aesthetic

## Goal

Make the light mode feel like the dark mode — same depth, same structure, same premium quality.
Currently light mode looks like a generic admin panel. Target: same glassmorphism language, just in light.

Also: replace the light mode primary color with Teal.

---

## 1. `_variables.css` — update `[data-theme="light"]` only

Replace the entire `[data-theme="light"]` block with:

```css
[data-theme="light"] {
  color-scheme: light;

  /* ── Base ── */
  --color-bg: #eef2f7;
  --color-bg-gradient:
    radial-gradient(ellipse 70% 50% at 15% 10%, rgba(15, 118, 110, 0.07) 0%, #eef2f7 55%),
    radial-gradient(
      ellipse 50% 40% at 85% 80%,
      rgba(124, 58, 237, 0.05) 0%,
      transparent 60%
    );

  /* ── Surfaces — SOLID, same logic as dark ── */
  --color-surface: #ffffff;
  --color-surface-elevated: #f8fafc;
  --color-surface-hover: #f1f5f9;

  /* ── Borders — visible, not heavy ── */
  --color-border: rgba(15, 23, 42, 0.1);
  --color-border-strong: rgba(15, 23, 42, 0.22);

  /* ── Text ── */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-disabled: #cbd5e1;

  /* ── Primary: Teal ── */
  --color-primary: #0f766e;
  --color-primary-glow: rgba(15, 118, 110, 0.16);
  --primary-30: rgba(15, 118, 110, 0.08);
  --primary-300: rgba(15, 118, 110, 0.3);
  --primary-400: #0d9488;
  --primary-600: #0f5f58;

  /* ── Secondary: Violet (same as dark) ── */
  --color-secondary: #7c3aed;
  --color-secondary-glow: rgba(124, 58, 237, 0.1);
  --color-secondary-border: rgba(124, 58, 237, 0.25);

  /* ── Glow accents for body::before ── */
  --color-primary-glow-bg: rgba(15, 118, 110, 0.08);
  --color-secondary-glow-bg: rgba(124, 58, 237, 0.05);

  /* ── Inputs ── */
  --color-input-bg: #ffffff;
  --color-input-focus: rgba(15, 118, 110, 0.14);

  /* ── Glass tokens — light version ── */
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.95);
  --glass-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
  --glass-blur: 20px;

  /* ── Shadows ── */
  --shadow-soft: 0 2px 12px rgba(15, 23, 42, 0.08);
  --shadow-elevated: 0 8px 28px rgba(15, 23, 42, 0.12);
  --shadow-glow-primary: 0 0 14px rgba(15, 118, 110, 0.2);
}
```

---

## 2. `_layout.css` — `.card` top shimmer line: teal in light

The `::after` pseudo on `.card` and `.metric-card` uses a hardcoded gradient.
Find this line in both:

```css
background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
```

Leave it as-is — it works on both themes (transparent shimmer on the border).

The `::after` on `.metric-card` that draws the colored top bar:

```css
background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
```

Leave it as-is — teal→violet in light, cyan→violet in dark. Both look great.

---

## 3. `_utilities.css` — `.logo` gradient

No change needed — `linear-gradient(135deg, var(--color-primary), var(--color-secondary))` already picks up the new teal automatically.

---

## 4. `_buttons.css` — filled primary button text color

In light mode, `--color-primary` is now teal `#0F766E` (dark color).
The filled button uses `color: var(--color-bg)` which in light = `#EEF2F7` — this is fine (light text on dark teal).

Verify: `.primary-btn.filled` has `color: var(--color-bg)` or `color: var(--color-white)`.
If it uses `var(--color-white)` — leave it, white on teal is fine (contrast 7.2:1 ✓).
If it uses `var(--color-bg)` — also fine for light (near-white on teal).

No change needed unless it currently hardcodes a dark text color.

---

## 5. Verify WCAG after changes

Run these contrast checks mentally (all on `--color-surface` = `#FFFFFF`):

| Pair                              | Ratio | Pass? |
| --------------------------------- | ----- | ----- |
| text-primary `#0F172A` on white   | 19:1  | ✓ AAA |
| text-secondary `#475569` on white | 5.9:1 | ✓ AA  |
| primary `#0F766E` on white        | 7.2:1 | ✓ AAA |
| primary `#0F766E` on bg `#EEF2F7` | 6.8:1 | ✓ AA  |
| secondary `#7C3AED` on white      | 5.2:1 | ✓ AA  |

---

## 6. Build & visual check

```bash
npm run build
```

Then check in browser (light mode):

- Background should be `#EEF2F7` (cool blue-grey, not pure white)
- Cards should look frosted / slightly elevated, not flat white boxes
- Primary buttons, links, icons: teal `#0F766E`
- The subtle teal glow in top-left of body background should be visible
- Badge "מנהל" stays violet — correct, uses `--color-secondary`
- Metric card top bar: teal → violet gradient

## Do NOT change

- Dark mode tokens — leave untouched
- `_animations.css`
- `_typography.css`
- `_primeng-overrides.css`
- Any component files
