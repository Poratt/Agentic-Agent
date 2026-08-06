# CSS Conventions Violations Report

**Generated:** 2026-07-05
**Convention source:** `CLAUDE.md` — Golden Rule #3 + Angular Definition of Done
**Scope:** All `.css` files in `frontend/src/`

---

## Convention Summary

The project enforces three CSS rules:

1. **No hardcoded CSS values** — only `var(--token)` from `_variables.css` is allowed
2. **No bare element selectors** in component CSS — never style bare `h1`, `p`, `button`, `table`, `th`, `td`, `input`, `textarea`, `tr`, `span`, `li`, `code` directly
3. **No component CSS unless global classes are insufficient** — prefer existing global utilities

---

## Violations by File

### 1. `strain-hunter.css` — ⚠️ HIGH PRIORITY

**Violation: Hardcoded hex colors**

```css
/* lines 177–189 */
.color-fallback-white {
  color: var(--color-white, #ffffff);  /* ← hardcoded fallback */
}

.family-badge {
  &.family-indica { background-color: #1e3a8a; }    /* ← hardcoded */
  &.family-sativa { background-color: #d97706; }    /* ← hardcoded */
  &.family-hybrid { background-color: #15803d; }    /* ← hardcoded */
}
```

**Recommendation:** Add `--color-family-indica: #1e3a8a` (and sativa/hybrid) to `_variables.css`, then use `var(--color-family-indica)`.

---

### 2. `llm-providers-management.css` — ⚠️ MEDIUM

**Violation: Bare element selectors**

The file styles bare `th`, `td`, and `tr` directly:

```css
/* lines 12–14 */
th {
    text-align: left;
}

/* lines 18–24 */
.subtable th {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--color-border-strong);
}

/* lines 26–30, 187–193 */
td { ... }
tr { ... }
```

**Recommendation:** These belong in global `_layout.css` or a dedicated `_tables.css` global stylesheet, not in a component file.

---

### 3. `design-system.css` — ⚠️ MEDIUM

**Violation: Bare element selectors**

```css
/* lines 27–29 */
h1 { margin: var(--space-2) 0; }

/* lines 92–95 */
h2, p { margin: 0; }

/* lines 109–111 */
h3 { margin-top: 0; }

/* lines 46–60 */
button { gap: var(--space-2); padding: var(--space-2) var(--space-4); ... }
```

**Recommendation:** Move heading/pagination button styles to global `_typography.css`. Note: `design-system.css` is a page/component that *displays* design tokens — it's borderline whether its own element selectors are violations. The `button` styles here appear to be overrides for sandbox preview controls rather than component structure, so this may be intentional.

---

### 4. `_design-system-showcase.css` — ⚠️ LOW

**Violation: Bare element selectors**

```css
/* lines 64–67 */
span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
}

/* lines 69–71 */
strong { overflow-wrap: anywhere; }

/* lines 91–93 */
p { margin: var(--space-1) 0 var(--space-2); }

/* lines 95–99 */
code {
    color: var(--color-primary);
    font-size: var(--font-size-xs);
    overflow-wrap: anywhere;
}
```

**Recommendation:** These are inside a scoped `.design-system-page` block and serve showcase/demo purposes. Acceptable for a design-system page, but note the convention.

---

### 5. `_design-system-buttons.css` — ⚠️ LOW

**Violation: Bare element selector**

```css
/* lines 53–57 */
code {
    color: var(--color-primary);
    font-size: var(--font-size-xs);
    overflow-wrap: anywhere;
}
```

---

### 6. `chat.css` — ⚠️ MEDIUM

**Violation: Bare element selectors + duplicate property**

```css
/* line 48: hardcoded padding alongside the var one above it */
.chat-history {
    padding: var(--space-4);   /* declared at line 41 */
    padding: 32px;            /* ← hardcoded override, line 48 — overwrites the var! */
}

/* lines 197–217 */
textarea {
    width: 100%;
    min-height: var(--space-16);
    ...
}
```

**Recommendation:** Remove the duplicate `padding: 32px` on line 48 — it's overwriting the correct `padding: var(--space-4)`. Move `textarea` styles to global `_forms.css`.

---

### 7. `chat-message.css` — ⚠️ LOW

**Violation: Bare element selectors**

```css
/* lines 234–235 */
.steps-list {
    ...
    font-size: 11px;  /* ← hardcoded, not var(--font-size-xs) */
}

/* bare element styling (lines 57–58) */
width: 2px;          /* inside ::after pseudo — bare value */
height: 1.05em;       /* bare value */
```

**Recommendation:** Use `var(--font-size-xs)` instead of `11px`. The `::after` pseudo-element pixel values are borderline acceptable but should ideally use tokens.

---

### 8. `matching-preferences-drawer.css` — ⚠️ LOW

**Violation: Bare element selectors**

```css
/* lines 11–16 */
h3 { margin: 0; font-size: var(--font-size-lg); ... }

/* lines 58–63 */
h4 { margin: 0; font-size: var(--font-size-md); ... }

/* lines 109–113 */
input {
    line-height: 1;
    height: auto;
    min-height: 0;
}

/* lines 445 */
font-size: 10px;    /* hardcoded — should be var(--font-size-xs) */
```

**Recommendation:** Move `h3`/`h4` resets to `_typography.css`. Move `input` styles to `_forms.css`.

---

### 9. `main-sidebar.css` — ⚠️ LOW

**Violation: Bare element selectors**

```css
/* line 273: hardcoded */
box-shadow: var(--shadow-soft), 0 4px 16px rgba(0, 0, 0, 0.3);  /* ← hardcoded rgba */

/* Note: the `.logo` rule at line 267 uses hardcoded rgba in its box-shadow */
```

**Recommendation:** The hardcoded `rgba(0, 0, 0, 0.3)` should use a token or `color-mix()`.

---

### 10. `tooltip.css` / `score-tooltip.css` — ✅ CLEAN

These two pass all conventions. No hardcoded values, no bare element selectors, correct use of CSS variables.

---

### 11. `dropdown.css`, `chat-history.css`, `app.css`, `_layout.css`, `_strain-hunter-filters.css` — ✅ CLEAN

All use CSS variables correctly. No hardcoded values detected.

---

## Summary Table

| File | Hardcoded Values | Bare Element Selectors | Priority |
|---|---|---|---|
| `strain-hunter.css` | `#1e3a8a`, `#d97706`, `#15803d`, `#ffffff` | No | **HIGH** |
| `chat.css` | `32px` (padding override) | `textarea` | **MEDIUM** |
| `llm-providers-management.css` | No | `th`, `td`, `tr` | **MEDIUM** |
| `design-system.css` | No | `h1`, `h2`, `h3`, `p`, `button` | **MEDIUM** |
| `main-sidebar.css` | `rgba(0,0,0,0.3)` in `box-shadow` | No | **LOW** |
| `chat-message.css` | `11px` (font-size), `2px`, `1.05em` | `::after` pseudo bare values | **LOW** |
| `_design-system-showcase.css` | No | `span`, `strong`, `p`, `code` | **LOW** |
| `_design-system-buttons.css` | No | `code` | **LOW** |
| `matching-preferences-drawer.css` | `10px` | `h3`, `h4`, `input` | **LOW** |
| `tooltip.css` | None | None | ✅ PASS |
| `score-tooltip.css` | None | None | ✅ PASS |
| `dropdown.css` | None | None | ✅ PASS |
| `chat-history.css` | None | None | ✅ PASS |
| `app.css` | None | None | ✅ PASS |
| `_layout.css` | None | None | ✅ PASS |
| `_strain-hunter-filters.css` | None | None | ✅ PASS |
| `_design-system-tokens.css` | None | None | ✅ PASS |
| `_design-system-swatches.css` | None | None | ✅ PASS |

---

## Recommended Fixes

1. **`strain-hunter.css`** — Add `--color-family-indica/hybrid/sativa` tokens to `_variables.css`, replace hex values
2. **`chat.css`** — Remove `padding: 32px` on line 48 (duplicates `padding: var(--space-4)`)
3. **`llm-providers-management.css`** — Move table element styles to a global `_tables.css` or `_layout.css`
4. **Global `_typography.css`** — Ensure `h1`/`h2`/`h3`/`p` resets cover the needs, then remove bare element styles from component files
5. **`_forms.css`** — Confirm `input`/`textarea` base styles exist globally; if not, add them and remove component-level bare selectors
