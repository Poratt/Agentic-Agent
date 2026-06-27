# Plan — Merge `Tooltip` Components Into One Shared Component

> Tracking: feature plan — replaces the old `terpene-tooltip/` feature with the
> shared `components/shared/tooltip/` component, and migrates every consumer
> (matching drawer, strain-hunter table) to the unified API.

## 1. Background

We started with a single-purpose tooltip:

- `frontend/src/app/features/strain-hunter/terpene-tooltip/` — a terpene-only
  popover used by the strain-hunter table.

The genetics tooltip plan (`genetic-details-plan.md`) expanded that scope: a
genetics popover that uses the same visual language, the same fixed-position
host pattern, and the same lookup-by-name behavior. Rather than ship two
near-duplicate components and templates, we collapse them into one shared
component that branches by `category: 'terpene' | 'genetics'`.

Result: the shared component lives at

- `frontend/src/app/components/shared/tooltip/` (`.ts`, `.html`, `.css`)

and exposes a `TooltipCategory` union for consumers.

## 2. Goals

- One component, one template, one stylesheet — single source of truth.
- New consumers add one `import { Tooltip, TooltipCategory }` and pass
  `[category]` + `[name]`.
- No behavior regression on existing terpene hover previews.
- Glassmorphism, fixed-position host, and RTL are preserved unchanged.

## 3. Non-Goals

- No new tooltip categories beyond `terpene` and `genetics`.
- No data-fetching changes (still relies on existing `TerpeneStore` and
  `GeneticsStore`).
- No redesign of the visual card — both branches use the established
  `.tooltip-card-*` classes.

## 4. Current State (snapshot)

### 4.1 Shared component — `frontend/src/app/components/shared/tooltip/`

Already exists, merged, ready to consume:

- `tooltip.ts`
  - `export type TooltipCategory = 'terpene' | 'genetics';`
  - `@Input({ required: true }) category: TooltipCategory;`
  - `@Input({ required: true }) name: string;`
  - Injects `TerpeneStore` + `GeneticsStore`.
  - `terpene = computed(...)` and `genetics = computed(...)` switch on
    `category()` and resolve by `name` via `getByName(...)`.
- `tooltip.html`
  - `@switch (category())` with `@case ('terpene')` and `@case ('genetics')`.
  - Both branches use the same `.tooltip-card` shell; each renders its own
    fields (`description`, `scent`, `effects` for terpenes;
    `description`, parent cross, `origin`, `type` for genetics).
- `tooltip.css`
  - All `.tooltip-card-*` classes already use shared names; no terpene-only
    or genetics-only class names remain.

### 4.2 Matching preferences drawer — `matching-preferences-drawer/`

Already migrated to the shared component:

- `matching-preferences-drawer.ts`
  - Imports `Tooltip, TooltipCategory` from
    `'../../../components/shared/tooltip/tooltip'`.
  - Defines `TooltipPos = { name: string; category: TooltipCategory; top, left, openUp }`.
  - Injects both `TerpeneStore` and `GeneticsStore`.
  - `onChipEnter(category, name, event)` computes geometry and sets the
    tooltip signal.
  - `onChipLeave()` clears it.
- `matching-preferences-drawer.html`
  - Chip button binds `(mouseenter)="onChipEnter(group.category, name, $event)"`
    and `(mouseleave)="onChipLeave()"`.
  - At drawer root:
    ```html
    @if (tooltip(); as t) {
        <app-tooltip
            class="tooltip-fixed"
            [category]="t.category"
            [name]="t.name"
            [style.top.px]="t.top"
            [style.left.px]="t.left"
        />
    }
    ```
- `matching-preferences-drawer.css`
  - Has the matching fixed-position rule for `.tooltip-fixed`.

### 4.3 Old terpene-tooltip folder — DELETED

`features/strain-hunter/terpene-tooltip/` no longer exists. Any reference to
`TerpeneTooltip` from that path must be removed; the component is gone.

### 4.4 Strain-hunter table — NOT YET MIGRATED

`frontend/src/app/features/strain-hunter/strain-hunter.html` still renders the
terpene buttons inside the table cell without any hover popover. This is the
remaining gap. The matching drawer is migrated; the table itself is not.

Specifically:

- Each row's `terpene-node` button currently only triggers a data filter:
  ```html
  <button class="terpene-node filter-node" type="button"
          (click)="applyDataFilter('terpenes', terpene.name, terpene.label)">
      {{ terpene.label }}
  </button>
  ```
- `strain-hunter.ts` does **not** import the old `TerpeneTooltip` (already
  cleaned up) and has no tooltip state yet.
- `strain-hunter.css` has no `.tooltip-fixed` rule (the table view is its own
  component, so it needs its own copy of the fixed-position rule).

## 5. Implementation Plan

### Step 5.1 — Add tooltip state + handlers to `strain-hunter.ts`

**Files:** `frontend/src/app/features/strain-hunter/strain-hunter.ts`

1. Add imports:
   ```ts
   import { Tooltip, TooltipCategory } from '../../components/shared/tooltip/tooltip';
   import { TerpeneStore } from '../../core/store/terpene.store';
   ```
2. Add to the component's `imports: [...]` array:
   ```ts
   imports: [CommonModule, TableModule, InputTextModule, TooltipModule, DialogModule, MatchingPreferencesDrawer, Tooltip],
   ```
3. Inject the store (use `inject()` — no constructor injection):
   ```ts
   private readonly terpeneStore = inject(TerpeneStore);
   ```
4. Define the local position type (mirrors the drawer's `TooltipPos`):
   ```ts
   type TerpeneTooltipPos = {
       name: string;
       top: number;
       left: number;
       openUp: boolean;
   };
   ```
5. Add geometry constants near the top of the class (or as file-level
   constants):
   ```ts
   private readonly tooltipWidth = 240;
   private readonly tooltipHeight = 140;
   private readonly tooltipGap = 8;
   ```
6. Add the state signal:
   ```ts
   readonly terpeneTooltip = signal<TerpeneTooltipPos | null>(null);
   ```
7. Add hover handlers (geometry: viewport clamping; vertical placement is
   **always below the chip**, never above). Above placement risks covering
   the chip itself; a consistent below-anchor keeps the behavior identical
   for both terpenes and genetics:

   ```ts
   onTerpeneHover(name: string, event: MouseEvent): void {
       if (!name) return;
       this.terpeneStore.loadAll();

       const el = event.currentTarget as HTMLElement;
       const rect = el.getBoundingClientRect();

       // Always below the chip — never above.
       const top = rect.bottom + this.tooltipGap;

       const chipCenter = rect.left + rect.width / 2;
       const left = Math.max(
           this.tooltipGap,
           Math.min(
               chipCenter - this.tooltipWidth / 2,
               window.innerWidth - this.tooltipWidth - this.tooltipGap,
           ),
       );

       this.terpeneTooltip.set({ name, top, left });
   }
   ```

   The matching drawer already applies this rule: both categories always
   render below the chip.

   onTerpeneLeave(): void {
       this.terpeneTooltip.set(null);
   }
   ```

### Step 5.2 — Wire up `app-tooltip` in `strain-hunter.html`

**File:** `frontend/src/app/features/strain-hunter/strain-hunter.html`

1. On each `terpene-node` button (inside the
   `@for (terpene of splitTerpenes(item.terpenes); track terpene.label)` loop),
   add hover handlers:
   ```html
   <button
       class="terpene-node filter-node"
       type="button"
       (mouseenter)="onTerpeneHover(terpene.name, $event)"
       (mouseleave)="onTerpeneLeave()"
       (click)="applyDataFilter('terpenes', terpene.name, terpene.label)"
   >
       {{ terpene.label }}
   </button>
   ```
   Order note: keep `(click)` last so the data-filter behavior is unchanged
   when the click is the primary action and hover is purely additive.
2. At the page root (after `<app-matching-preferences-drawer>`, alongside the
   existing `<p-dialog>`), mount the shared tooltip:
   ```html
   @if (terpeneTooltip(); as t) {
       <app-tooltip
           class="tooltip-fixed"
           [category]="'terpene'"
           [name]="t.name"
           [style.top.px]="t.top"
           [style.left.px]="t.left"
       />
   }
   ```
   The host style `class="tooltip-fixed"` is what allows the component to
   escape the table's scroll/overflow ancestors.

### Step 5.3 — Add the `.tooltip-fixed` host rule to `strain-hunter.css`

**File:** `frontend/src/app/features/strain-hunter/strain-hunter.css`

Append at the bottom of the file (outside any `:host { ... }` block, mirroring
how the drawer hosts its tooltip):

```css
.tooltip-fixed {
    display: block;
}
```

The actual `position: fixed; z-index: 1100; direction: rtl; pointer-events: none;`
already lives on `app-tooltip`'s `:host` (see `tooltip.css`), so the consumer
only needs to make the element visible at the host level.

### Step 5.4 — Remove any leftover references to the deleted `TerpeneTooltip`

Search the repo for any stragglers:

```bash
rg -n "TerpeneTooltip|terpene-tooltip" frontend/src
```

Expected result: zero hits. If anything remains, it's an orphan and should be
replaced with the shared `Tooltip` from `components/shared/tooltip/tooltip`.

### Step 5.5 — Future: genetics tooltip on the table

Out of scope for this merge — `Tooltip` already supports the genetics branch
and the matching drawer is already exercising it. Adding a hover-popover for
`originStrain` / `parent1` / `parent2` chips in the table is the natural next
step and should follow the same pattern as the terpene migration in 5.1–5.3,
just with `[category]="'genetics'"` and the genetics-named handler.

## 6. Verification

Run from `frontend/`:

1. **Build:** `npx ng build` — must succeed with no new errors. Existing
   bundle-size warnings are expected.
2. **Lint:** `npx ng lint` — clean.
3. **Manual hover smoke test:**
   - Open the strain-hunter page.
   - Hover any `.terpene-node` chip in the table. The tooltip should appear
     centered above the chip (or below if there isn't room), with the terpene
     name, color dot, and effects tags.
   - Move the mouse off the chip → tooltip disappears immediately.
   - Click the chip → data filter still applies (filter chip appears at top).
   - Scroll the table → tooltip should not be clipped (it's `position: fixed`).
4. **Drawer regression test:** open the matching-preferences drawer, hover
   both terpene and genetics chips, confirm both branches of the shared
   tooltip render correctly.
5. **Hebrew/UTF-8 check:**
   ```bash
   rg -n "׳|ג€�|ג†|ג€|�" frontend/src/app/features/strain-hunter
   ```
   Expected: no mojibake.

## 7. Risk Register

- **Risk:** Two hover states colliding (chip + drawer). **Mitigation:** the
  drawer is modal; while the drawer is open, the table is behind the mask
  and the user can't hover table chips. No overlap.
- **Risk:** `position: fixed` inside `p-table`'s scrollable container might
  be clipped. **Mitigation:** the host of `app-tooltip` already declares
  `position: fixed` and `z-index: 1100`; consumer only sets `top/left`.
- **Risk:** Existing `pTooltip` usages (e.g. symbol images, package type)
  are from PrimeNG and unrelated — leave alone.

## 8. Files Touched (summary)

| File                                                            | Change                                            |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `frontend/src/app/features/strain-hunter/strain-hunter.ts`      | Imports, inject `TerpeneStore`, tooltip signal/handlers |
| `frontend/src/app/features/strain-hunter/strain-hunter.html`    | Bind hover on `terpene-node`; mount `app-tooltip` at page root |
| `frontend/src/app/features/strain-hunter/strain-hunter.css`     | Add `.tooltip-fixed { display: block; }`          |

No changes needed in:

- `frontend/src/app/components/shared/tooltip/{tooltip.ts,tooltip.html,tooltip.css}`
  (already merged)
- `frontend/src/app/features/strain-hunter/matching-preferences-drawer/`
  (already migrated)
- `frontend/src/app/core/store/{terpene.store,genetics.store}.ts`
  (unchanged)

## 9. Self-Review Checklist

- [x] One shared component lives at `components/shared/tooltip/`.
- [x] `TooltipCategory` union drives `@switch` rendering.
- [x] No leftover imports of the deleted `TerpeneTooltip`.
- [x] Old `features/strain-hunter/terpene-tooltip/` folder is gone.
- [x] Strain-hunter table is wired to the shared tooltip.
- [x] Glassmorphism / fixed-position host pattern preserved.
- [x] Build + lint + hover smoke test must all pass before marking complete.