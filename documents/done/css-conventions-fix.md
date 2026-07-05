# CSS Conventions Fix

**Created:** 2026-07-05
**Source:** `css-conventions-violations.md`
**Status:** In Progress

---

## Convention Rules

1. **No hardcoded CSS values** — only `var(--token)` from `_variables.css`
2. **No bare element selectors** in component CSS
3. **No component CSS unless global classes are insufficient**

---

## False Positives (No Changes Needed)

These were flagged as bare element selectors but are actually scoped descendant selectors:

| File | Selector | Parent Scope | Verdict |
|---|---|---|---|
| `chat.css` | `textarea` | `.chat-prompt-field` | Descendant — OK |
| `llm-providers-management.css` | `th`, `td`, `tr` | `.subtable`, `.inner-table` | Descendant — OK |
| `design-system.css` | `h1`, `h2`, `h3`, `p`, `button` | `.design-system-page` | Descendant — OK |
| `_design-system-showcase.css` | `span`, `strong`, `p`, `code` | `.design-system-page` | Descendant — OK |
| `_design-system-buttons.css` | `code` | `.design-system-page` | Descendant — OK |
| `matching-preferences-drawer.css` | `h3`, `h4`, `input` | `.drawer-header`, `.group-header`, `.genetics-search` | Descendant — OK |

---

## Fix Plan

### Step 1: Add Tokens to `_variables.css`

**File:** `frontend/src/app/assets/styles/_variables.css`

Add inside `:root` block (after line 84):

```css
/* Family badge colors */
--color-family-indica: #1e3a8a;
--color-family-sativa: #d97706;
--color-family-hybrid: #15803d;

/* Logo shadow */
--shadow-logo: 0 4px 16px rgba(0, 0, 0, 0.3);
```

**Verify:** File parses correctly (no syntax errors)

---

### Step 2: Fix `strain-hunter.css` — Hardcoded hex colors

**File:** `frontend/src/app/features/strain-hunter/strain-hunter.css`

**Lines 177-189:** Replace hardcoded hex values:

```css
/* BEFORE */
&.family-badge {
  color: var(--color-white, #ffffff);

  &.family-indica { background-color: #1e3a8a; }
  &.family-sativa { background-color: #d97706; }
  &.family-hybrid { background-color: #15803d; }
}

/* AFTER */
&.family-badge {
  color: var(--color-white);

  &.family-indica { background-color: var(--color-family-indica); }
  &.family-sativa { background-color: var(--color-family-sativa); }
  &.family-hybrid { background-color: var(--color-family-hybrid); }
}
```

**Verify:** No `#` hex values remain outside of `_variables.css`

---

### Step 3: Fix `_layout.css` — Hardcoded rgba

**File:** `frontend/src/app/assets/styles/_layout.css`

**Line 278:** Replace hardcoded rgba in `.logo` box-shadow:

```css
/* BEFORE */
box-shadow: var(--shadow-glow-primary), 0 4px 16px rgba(0, 0, 0, 0.3);

/* AFTER */
box-shadow: var(--shadow-glow-primary), var(--shadow-logo);
```

**Verify:** No `rgba(0, 0, 0` remains in `_layout.css`

---

### Step 4: Fix `chat-message.css` — Hardcoded 11px

**File:** `frontend/src/app/features/chat/chat-message/chat-message.css`

**Line 235:** Replace hardcoded font-size:

```css
/* BEFORE */
font-size: 11px;

/* AFTER */
font-size: var(--font-size-xs);
```

**Verify:** No bare `11px` values remain in `chat-message.css`

---

### Step 5: Fix `matching-preferences-drawer.css` — Hardcoded 10px

**File:** `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css`

**Line 445:** Replace hardcoded font-size:

```css
/* BEFORE */
font-size: 10px;

/* AFTER */
font-size: var(--font-size-xs);
```

**Verify:** No bare `10px` values remain in `matching-preferences-drawer.css`

---

### Step 6: Fix `chat.css` — Duplicate hardcoded padding

**File:** `frontend/src/app/features/chat/chat/chat.css`

**Line 48:** `.chat-history` declares `padding: var(--space-4)` on line 41, then a hardcoded `padding: 32px` on line 48 overwrites it. Delete line 48 entirely.

```css
/* Line 41 — keep this: */
.chat-history {
    ...
    padding: var(--space-4);
    ...
}

/* Line 48 — DELETE this duplicate hardcoded override: */
padding: 32px;   /* ← remove */
```

**Verify:** No bare `32px` value remains in `chat.css`

---

## Verification Checklist

- [ ] `npx ng lint` passes
- [ ] `npx ng build` succeeds
- [ ] Grep `rgba(0, 0, 0` in `_layout.css` — should find none
- [ ] Grep `#[0-9a-fA-F]{3,6}` in `strain-hunter.css` — should find none
- [ ] Grep `font-size: [0-9]+px` in `chat-message.css` — should find none
- [ ] Grep `font-size: [0-9]+px` in `matching-preferences-drawer.css` — should find none
- [ ] Grep `32px` in `chat.css` — should find none

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/app/assets/styles/_variables.css` | Add 4 tokens |
| `frontend/src/app/features/strain-hunter/strain-hunter.css` | Replace 4 hex values |
| `frontend/src/app/assets/styles/_layout.css` | Replace 1 rgba value |
| `frontend/src/app/features/chat/chat-message/chat-message.css` | Replace 1 px value |
| `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css` | Replace 1 px value |
| `frontend/src/app/features/chat/chat/chat.css` | Remove duplicate hardcoded `padding: 32px` |

**Total:** 6 files
