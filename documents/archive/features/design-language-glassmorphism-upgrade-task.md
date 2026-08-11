# Design Language Upgrade — From Flat to Luxury Glassmorphism

## The Problem
The current UI looks dated ("90s-like") because the design language is flat and generic:
- Cards have no depth — they look identical to the background
- No glassmorphism effect despite the tokens claiming to support it
- The sidebar is a plain flat rectangle
- No glow, shimmer, or layering — nothing feels premium
- Border radius is too uniform — everything is the same shape
- The light mode looks like a basic Bootstrap admin panel

## Mission
Upgrade the **visual components** to express the design language already defined in `_variables.css`.
The tokens are correct — now the components need to USE them properly.

## Files to modify

### 1. `src/app/assets/styles/_utilities.css`

Replace `.glass-effect` with a real glassmorphism implementation:

```css
.glass-effect {
  position: relative;
  isolation: isolate;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    z-index: -1;
  }
}
```

Add these new glass tokens to `[data-theme="dark"]` in `_variables.css`:
```css
--glass-bg:     rgba(255, 255, 255, 0.04);
--glass-border: rgba(255, 255, 255, 0.10);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255,255,255,0.06);
--glass-blur:   24px;
```

Add to `[data-theme="light"]` in `_variables.css`:
```css
--glass-bg:     rgba(255, 255, 255, 0.70);
--glass-border: rgba(255, 255, 255, 0.90);
--glass-shadow: 0 8px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.80);
--glass-blur:   16px;
```

### 2. `src/app/assets/styles/_layout.css`

**Replace `.card`** — add glassmorphism and depth:

```css
.card {
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    z-index: -1;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    pointer-events: none;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
}
```

**Replace `.metric-card`** — give it a gradient accent on top:

```css
.metric-card {
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 200px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  position: relative;
  isolation: isolate;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    z-index: -1;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    color: var(--color-text-secondary);

    .metric-icon {
      font-size: var(--font-size-xxl);
      color: var(--color-primary);
      filter: drop-shadow(0 0 8px var(--color-primary-glow));
    }
  }

  .metric-value {
    font-size: var(--font-size-huge);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    text-align: center;
    text-shadow: 0 0 20px var(--color-primary-glow);
  }

  .metric-details {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;

    .detail-item {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
    }

    .detail-badge {
      font-size: var(--font-size-xs);
      background: var(--color-surface);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-pill);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
    }
  }
}
```

**Update `.table-container`** — wrap with glass:

```css
.table-container {
  padding: 0;
  overflow-x: auto;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    z-index: -1;
  }
}
```

**Update `.logo`** — make it glow more:

```css
.logo {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: var(--color-white);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.5px;
  margin-bottom: var(--space-2);
  box-shadow: var(--shadow-glow-primary), 0 4px 16px rgba(0,0,0,0.3);
}
```

### 3. `src/app/assets/styles/_reset.css`

**Update body `::before`** — make the ambient glow more dramatic:

```css
body::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, var(--color-primary-glow-bg) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 85% 75%, var(--color-secondary-glow-bg) 0%, transparent 70%);
  opacity: 1;
  pointer-events: none;
}
```

And update `[data-theme="dark"]` and `[data-theme="light"]` glow strengths in `_variables.css`:

Dark:
```css
--color-primary-glow-bg:   rgba(34, 211, 238, 0.10);
--color-secondary-glow-bg: rgba(167, 139, 250, 0.10);
```

Light:
```css
--color-primary-glow-bg:   rgba(2, 132, 199, 0.07);
--color-secondary-glow-bg: rgba(124, 58, 237, 0.05);
```

### 4. `src/app/assets/styles/_utilities.css`

**Update `.badge`** — rounder, more refined:

```css
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: 3px var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border: 1px solid transparent;
  letter-spacing: 0.01em;

  .ph,
  .material-symbols-rounded {
    color: inherit;
  }

  &.badge-danger {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }

  &.badge-info {
    background: var(--color-info-bg);
    color: var(--color-info);
    border-color: var(--color-info-border);
  }

  &.badge-admin {
    background: var(--color-secondary-glow);
    color: var(--color-secondary);
    border-color: var(--color-secondary-border);
  }
}
```

**Update `.error-badge`** in `_layout.css`:
```css
.error-badge {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger);
  text-align: center;
  margin-bottom: var(--space-4);
  backdrop-filter: blur(8px);
}
```

### 5. `src/app/assets/styles/_forms.css`

**Update inputs** — make them feel like part of the glass system:

```css
input,
textarea,
select {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: var(--font-main);
  font-size: var(--font-size-sm);
  transition: var(--transition-colors);
  outline: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &::placeholder {
    color: var(--color-text-muted);
  }

  &:focus {
    background: var(--color-input-bg);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-glow), 0 0 0 1px var(--color-primary);
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: var(--primary-300);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### 6. `src/app/assets/styles/_buttons.css`

**Update `.primary-btn.filled`** — add glow on hover:

```css
.primary-btn {
  &.filled {
    background-color: var(--color-primary);
    color: var(--color-bg);
    border-color: transparent;
    font-weight: var(--font-weight-semibold);
    box-shadow: 0 0 12px var(--color-primary-glow);

    &:hover:not(:disabled) {
      background-color: var(--primary-400);
      box-shadow: 0 0 20px var(--color-primary-glow), 0 4px 12px rgba(0,0,0,0.2);
    }
  }
}
```

---

## What NOT to change
- `_animations.css` — leave untouched
- `_typography.css` — leave untouched
- `_primeng-overrides.css` — leave untouched
- All component `.ts` and `.html` files — leave untouched
- Token values in `_variables.css` that were already upgraded

---

## Verify
After changes, run:
```bash
npm run build
```
Only pre-existing budget warnings are acceptable. No new errors.

Then visually verify in browser:
- Dark mode: cards should float above background with visible depth
- Light mode: cards should look frosted-glass, not plain white boxes
- Hover on filled primary button: should glow
- Sidebar: if it uses `.glass-effect`, it should show backdrop-blur
