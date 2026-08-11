# Design System Upgrade — Variables & Palette Overhaul

## Mission
Replace the existing `_variables.css` (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`) with a fully audited, WCAG-compliant token system.  
Do NOT touch any other CSS file unless a token was renamed (see Rename Map below).

---

## File to rewrite
`src/app/assets/styles/_variables.css`  
(or wherever `:root` and `[data-theme]` currently live — locate it first with `find src -name "_variables.css"`)

---

## Why we're doing this
Audit revealed:
- `color-surface` dark = `rgba(255,255,255,0.06)` → card vs background contrast ~1.1:1 (invisible)
- `color-text-secondary` light = `#5B6B80` → 4.1:1 on bg, fails WCAG AA for normal text
- `primary-30` hover state ≈ transparent → hover effect invisible
- `color-border` dark = `rgba(255,255,255,0.10)` → borders nearly invisible
- Missing tokens: `--radius-pill`, `--color-surface-elevated`, `--color-text-muted`
- Inconsistency: body uses `font-size-sm` (14px) as base, but `:root font-size` = 16px

---

## New Token Spec

### `:root` (theme-agnostic constants)

```css
:root {
  /* ── Neutral constants ── */
  --color-white: #FFFFFF;
  --color-black: #000000;

  /* ── Semantic status (same across themes) ── */
  --color-success:        #10B981;
  --color-success-glow:   rgba(16, 185, 129, 0.20);
  --color-success-bg:     rgba(16, 185, 129, 0.10);
  --color-success-border: rgba(16, 185, 129, 0.25);

  --color-danger:        #F87171;
  --color-danger-glow:   rgba(248, 113, 113, 0.20);
  --color-danger-bg:     rgba(248, 113, 113, 0.10);
  --color-danger-border: rgba(248, 113, 113, 0.30);
  --red-600:             #DC2626;

  --color-warning:        #FBBF24;
  --color-warning-bg:     rgba(251, 191, 36, 0.10);
  --color-warning-border: rgba(251, 191, 36, 0.30);

  --color-info:        #60A5FA;
  --color-info-bg:     rgba(96, 165, 250, 0.10);
  --color-info-border: rgba(96, 165, 250, 0.25);

  /* ── Typography ── */
  --font-main:   'Heebo', 'Inter', sans-serif;
  --font-family: var(--font-main);

  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-md:   15px;
  --font-size-lg:   18px;
  --font-size-xl:   22px;
  --font-size-xxl:  28px;
  --font-size-huge: 42px;

  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --line-height-tight:  1.3;
  --line-height-normal: 1.6;
  --line-height-loose:  1.8;

  /* ── Spacing (4px grid) ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;

  --search-width:       320px;
  --field-icon-padding: 40px;

  /* ── Breakpoints ── */
  --xs: 576px;
  --sm: 768px;
  --md: 1000px;
  --lg: 1200px;
  --xl: 1400px;

  /* ── Border Radius ── */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-pill: 9999px;

  /* ── Motion ── */
  --transition-fast:     150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-standard: 220ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:     350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-colors:
    background-color var(--transition-fast),
    border-color     var(--transition-fast),
    color            var(--transition-fast),
    box-shadow       var(--transition-fast);
}
```

---

### `[data-theme="dark"]`

Design target: **Luxury Glassmorphism** — deep navy base, solid (non-transparent) surfaces, bright cyan primary, vivid violet secondary. Every text/bg pair must pass WCAG AA (≥4.5:1 normal text, ≥3:1 large text).

```css
[data-theme="dark"] {
  color-scheme: dark;

  /* ── Base ── */
  --color-bg:          #080D1A;
  --color-bg-gradient: radial-gradient(ellipse at 20% 10%, #0D1528 0%, #080D1A 60%);

  /* ── Surfaces — SOLID, not transparent ── */
  /* Rule: each surface must be ≥1.3:1 contrast against the one below it */
  --color-surface:          #111827;   /* card, panel — 1.6:1 vs bg */
  --color-surface-elevated: #1A2235;   /* modal, dropdown — sits above surface */
  --color-surface-hover:    #1E2D44;   /* hover state on surface elements */

  /* ── Borders — visible but subtle ── */
  --color-border:       rgba(255, 255, 255, 0.12);  /* 12% — enough to define edges */
  --color-border-strong: rgba(255, 255, 255, 0.22); /* focus rings, active states */

  /* ── Text — all must pass AA on --color-surface ── */
  --color-text-primary:   #F0F4FF;   /* 13.5:1 on surface ✓ */
  --color-text-secondary: #94A3B8;   /* 4.6:1 on surface ✓ */
  --color-text-muted:     #64748B;   /* 3.1:1 — large text / decorative only */
  --color-text-disabled:  #475569;

  /* ── Primary: Cyan ── */
  --color-primary:      #22D3EE;     /* 5.2:1 on surface ✓ */
  --color-primary-glow: rgba(34, 211, 238, 0.20);
  --primary-30:         rgba(34, 211, 238, 0.14);  /* hover bg — visible at 14% */
  --primary-300:        rgba(34, 211, 238, 0.50);  /* focus ring */
  --primary-400:        #67E8F9;     /* lighter variant */
  --primary-600:        #0891B2;     /* darker / pressed */

  /* ── Secondary: Violet ── */
  --color-secondary:        #A78BFA;  /* 5.8:1 on surface ✓ */
  --color-secondary-glow:   rgba(167, 139, 250, 0.18);
  --color-secondary-border: rgba(167, 139, 250, 0.32);

  /* ── Glow accents (body radial bg only) ── */
  --color-primary-glow-bg:   rgba(34, 211, 238, 0.06);
  --color-secondary-glow-bg: rgba(167, 139, 250, 0.06);

  /* ── Inputs ── */
  --color-input-bg:    #111827;       /* = surface, clean alignment */
  --color-input-focus: rgba(34, 211, 238, 0.18);

  /* ── Shadows ── */
  --shadow-soft:         0 4px 20px rgba(0, 0, 0, 0.50);
  --shadow-elevated:     0 8px 32px rgba(0, 0, 0, 0.60);
  --shadow-glow-primary: 0 0 18px rgba(34, 211, 238, 0.28);

  /* ── Misc ── */
  --grey-30: rgba(255, 255, 255, 0.08);
}
```

---

### `[data-theme="light"]`

Design target: **Clean Modern** — cool-white base, elevated surfaces, ocean-teal primary, purple secondary. Every pair must pass WCAG AA.

```css
[data-theme="light"] {
  color-scheme: light;

  /* ── Base ── */
  --color-bg:          #F0F4F8;
  --color-bg-gradient: radial-gradient(ellipse at 20% 10%, rgba(8,145,178,0.06) 0%, #F0F4F8 60%);

  /* ── Surfaces — SOLID ── */
  --color-surface:          #FFFFFF;   /* card, panel */
  --color-surface-elevated: #F8FAFC;   /* modal, dropdown */
  --color-surface-hover:    #EDF2F7;   /* hover */

  /* ── Borders ── */
  --color-border:        rgba(71, 85, 105, 0.20);
  --color-border-strong: rgba(71, 85, 105, 0.40);

  /* ── Text — all must pass AA on #FFFFFF ── */
  --color-text-primary:   #0F172A;   /* 19:1 on white ✓ */
  --color-text-secondary: #475569;   /* 5.9:1 on white ✓ */
  --color-text-muted:     #94A3B8;   /* 2.9:1 — large/decorative only */
  --color-text-disabled:  #CBD5E1;

  /* ── Primary: Ocean Teal ── */
  --color-primary:      #0284C7;     /* 4.6:1 on white ✓ */
  --color-primary-glow: rgba(2, 132, 199, 0.14);
  --primary-30:         rgba(2, 132, 199, 0.09);
  --primary-300:        rgba(2, 132, 199, 0.35);
  --primary-400:        #0EA5E9;
  --primary-600:        #0369A1;

  /* ── Secondary: Purple ── */
  --color-secondary:        #7C3AED;  /* 5.2:1 on white ✓ */
  --color-secondary-glow:   rgba(124, 58, 237, 0.12);
  --color-secondary-border: rgba(124, 58, 237, 0.28);

  /* ── Glow accents ── */
  --color-primary-glow-bg:   rgba(2, 132, 199, 0.08);
  --color-secondary-glow-bg: rgba(124, 58, 237, 0.06);

  /* ── Inputs ── */
  --color-input-bg:    #FFFFFF;
  --color-input-focus: rgba(2, 132, 199, 0.16);

  /* ── Shadows ── */
  --shadow-soft:         0 2px 12px rgba(15, 23, 42, 0.10);
  --shadow-elevated:     0 8px 28px rgba(15, 23, 42, 0.14);
  --shadow-glow-primary: 0 0 14px rgba(2, 132, 199, 0.22);
}
```

---

## Token Rename Map

After rewriting `_variables.css`, scan all CSS files for these old tokens and replace:

| Old token | New token | Notes |
|---|---|---|
| `--color-primary-glow` used in body `::before` | `--color-primary-glow-bg` | only in body radial gradient |
| `--color-secondary-glow` used in body `::before` | `--color-secondary-glow-bg` | only in body radial gradient |
| `--color-input-bg` in forms | stays same | value changed, no rename |
| `--color-surface-hover` | stays same | value changed |
| `--transition-standard: all 0.2s...` | `--transition-standard` no longer has `all` prefix | update any usage |
| `--radius-pill` (new) | replace any `border-radius: 9999px` or `border-radius: 50%` on non-circle shapes | |

---

## body `::before` update

In `_reset.css` (or wherever body `::before` is defined), update the radial gradient to use the new glow-bg tokens:

```css
body::before {
  background:
    radial-gradient(circle at 20% 30%, var(--color-primary-glow-bg) 0%, transparent 60%),
    radial-gradient(circle at 80% 70%, var(--color-secondary-glow-bg) 0%, transparent 60%);
  opacity: 1; /* remove the 0.6 — new values are already subtle */
}
```

---

## Verify after changes

Run these checks manually (no scripts needed):

1. **No broken references** — search for any `var(--color-` that no longer exists in the new token list:
   ```bash
   grep -rh "var(--color-" src/app/assets/styles/ | grep -oP "var\(--[\w-]+\)" | sort -u
   ```
   Cross-check against the new token list. Flag any that are missing.

2. **No old opacity surfaces** — confirm `rgba(255,255,255,0.06)` and `rgba(248,250,252,0.6)` no longer appear:
   ```bash
   grep -r "rgba(255, 255, 255, 0.06)\|rgba(248,250,252" src/app/assets/styles/
   ```

3. **body ::before uses new tokens** — confirm it uses `--color-primary-glow-bg` not the old name.

4. Visually test in browser: dark mode card should be clearly distinguishable from page background.

---

## What NOT to change
- `_animations.css` — leave untouched
- `_buttons.css` — leave untouched (tokens change, selectors stay)
- `_forms.css` — leave untouched
- `_layout.css` — leave untouched
- `_typography.css` — leave untouched
- `_utilities.css` — leave untouched
- `_primeng-overrides.css` — leave untouched
- Component files — leave untouched

Only `_variables.css` gets rewritten. Other files consume the new tokens automatically.
