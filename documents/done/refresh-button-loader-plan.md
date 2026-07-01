# Refresh Button Loader — Keep Table Visible

## Problem

**Current behavior:**
When clicking "רענן נתונים" (Refresh Data):
1. `load(true)` sets `loading.set(true)`
2. Full-page loader covers the entire table
3. Data fetches (takes a few seconds)
4. Table reappears with new data

**Desired behavior:**
1. Click "רענן נתונים"
2. Table stays visible
3. Only the button shows a spinner
4. Data arrives → table updates silently

---

## Root Cause

The `loading` signal controls both:
- Initial page load state (full-page loader)
- Refresh state (button spinner)

They're conflated, so refreshing triggers the full-page loader.

---

## Solution

Separate concerns into two signals:

| Signal | Purpose | Used by |
|--------|---------|---------|
| `loading` | Initial page load | Full-page loader visibility |
| `refreshing` | Refresh operation | Button disabled + spinner |

**Key changes:**

### 1. Add `refreshing` signal (strain-hunter.ts)

```typescript
loading = signal(true);
refreshing = signal(false);  // NEW — only for refresh button state
```

### 2. Modify `load()` method

Only set `loading.set(true)` on initial load (when `forceRefresh` is false):

```typescript
load(forceRefresh = false) {
    this.requestSubscription?.unsubscribe();

    if (!forceRefresh) {
        this.loading.set(true);
        this.error.set(null);
    } else {
        this.refreshing.set(true);
    }

    const url = forceRefresh
        ? `${this.base}/fetch?forceRefresh=true`
        : `${this.base}/fetch`;

    this.requestSubscription = this.http
        .get<StrainHunterResponse>(url)
        .pipe(timeout(45000))
        .subscribe({
            next: (response) => {
                this.rawItems.set(response.items ?? []);
                this.loading.set(false);
                this.refreshing.set(false);
            },
            error: (error: unknown) => {
                this.rawItems.set([]);
                this.error.set(this.getErrorMessage(error));
                this.loading.set(false);
                this.refreshing.set(false);
            },
        });
}
```

### 3. Update `refresh()` method

No longer needs to call `load(true)` with special handling — just:

```typescript
refresh() {
    this.load(true);
}
```

### 4. Update button in template (strain-hunter.html)

Change the refresh button to use `refreshing()` instead of `loading()`:

```html
<button
    class="primary-btn outlined md"
    type="button"
    [disabled]="refreshing()"
    (click)="refresh()"
    aria-label="רענן נתונים"
>
    <span class="ph ph-arrows-clockwise" [class.spin-animation]="refreshing()"></span>
    <span>רענן נתונים</span>
</button>
```

### 5. Update search input (strain-hunter.html)

The search input should also only be disabled during initial load, not during refresh:

```html
<input
    pInputText
    class="form-control"
    type="search"
    placeholder="חיפוש בטבלה..."
    [disabled]="loading()"
    (input)="applyGlobalFilter($event)"
/>
```

### 6. Update "התאמה אישית" button (strain-hunter.html)

Should be enabled during refresh so users can continue interacting:

```html
<button
    class="primary-btn md match-btn"
    type="button"
    [disabled]="loading()"
    (click)="openMatchDrawer()"
    aria-label="פתח התאמה אישית"
>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `strain-hunter.ts` | Add `refreshing` signal, modify `load()` logic |
| `strain-hunter.html` | Update button `[disabled]` and `[class.spin-animation]` to use `refreshing()` |

---

## Verification

1. Load the page → full-page loader appears
2. Table loads → page shows data
3. Click "רענן נתונים" → button spins, table stays visible
4. Wait for data → table updates, button stops spinning

---

## Edge Cases

- **Error during refresh**: `refreshing.set(false)` is called in `error` callback — button returns to normal state. `rawItems.set([])` and `error.set(...)` are called, so `pageState()` becomes Error and the full-page error state replaces the table. This is intentional — showing stale data after a failed refresh could mislead the user.
- **Click refresh multiple times**: `requestSubscription?.unsubscribe()` cancels previous request before starting new one
- **Refresh while initial load in progress**: `ngOnInit` calls `load(false)`, then if user immediately clicks refresh, `load(true)` kicks in — works correctly
