# Revert & Flip — Light Mode Primary Fix

## What happened
The previous task changed light mode primary to Teal `#0F766E`. This was wrong. Revert it.

## What to do

In `_variables.css`, inside `[data-theme="light"]`:

### Step 1 — Restore original primary (deep cyan/sky)
```css
--color-primary:      #0284C7;
--color-primary-glow: rgba(2, 132, 199, 0.16);
--primary-30:         rgba(2, 132, 199, 0.09);
--primary-300:        rgba(2, 132, 199, 0.35);
--primary-400:        #0EA5E9;
--primary-600:        #0369A1;
```

### Step 2 — Flip: violet becomes the dominant accent in light
Swap primary and secondary roles visually by making secondary more prominent:

```css
--color-secondary:        #6D28D9;
--color-secondary-glow:   rgba(109, 40, 217, 0.12);
--color-secondary-border: rgba(109, 40, 217, 0.28);
```

### Step 3 — Restore bg and glass tokens
```css
--color-bg:          #F0F4F8;
--color-bg-gradient: radial-gradient(ellipse 70% 50% at 15% 10%, rgba(2,132,199,0.06) 0%, #F0F4F8 55%),
                     radial-gradient(ellipse 50% 40% at 85% 80%, rgba(109,40,217,0.05) 0%, transparent 60%);

--glass-bg:     rgba(255, 255, 255, 0.72);
--glass-border: rgba(255, 255, 255, 0.95);
--glass-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,1);
--glass-blur:   20px;

--color-primary-glow-bg:   rgba(2, 132, 199, 0.06);
--color-secondary-glow-bg: rgba(109, 40, 217, 0.05);
```

## Do NOT touch
- Dark mode tokens
- Any other file
- Any component

## Build
```bash
npm run build
```
