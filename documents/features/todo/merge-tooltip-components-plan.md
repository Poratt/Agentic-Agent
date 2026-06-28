# Merge Tooltip and ScoreTooltip Components Plan

## Objective
Merge `Tooltip` and `ScoreTooltip` into a single unified tooltip component to reduce duplication and simplify maintenance.

## Current State

### `Tooltip` (`frontend/src/app/components/shared/tooltip/`)
- Generic reference tooltip for terpenes and genetics
- Reads from `TerpeneStore` and `GeneticsStore`
- Shows: name, description, scent/effects (terpene), parents/origin/type (genetics)
- Input: `category` ('terpene' | 'genetics'), `name` (string)

### `ScoreTooltip` (`frontend/src/app/components/shared/score-tooltip/`)
- Score breakdown tooltip for matching engine
- Shows: penalty banner, terpene hits/misses, genetics hits/misses, empty state
- Input: `breakdown` (ScoreBreakdown)

## Requirements

### 1. Unified Component Design
Create a single `Tooltip` component that handles all tooltip types through a discriminated union input.

```typescript
type TooltipData =
  | { type: 'reference'; category: 'terpene' | 'genetics'; name: string }
  | { type: 'score'; breakdown: ScoreBreakdown }
  | { type: 'empty'; message: string };

@Component({
  selector: 'app-tooltip',
  // ...
})
export class Tooltip {
  readonly data = input.required<TooltipData>();
  // computed views for each type
}
```

### 2. Template Structure
Use `@switch` on `data().type` to render appropriate content:
- `reference` → current `Tooltip` template (terpene/genetics cases)
- `score` → current `ScoreTooltip` template
- `empty` → generic "no info" state

### 3. StrainHunter Integration
Update `StrainHunter` to use unified component:
```typescript
// Instead of two separate signals:
readonly tooltip = signal<TooltipData | null>(null);

// onTerpeneEnter:
this.tooltip.set({ type: 'reference', category: 'terpene', name, top, left });

// onGeneticsEnter:
this.tooltip.set({ type: 'reference', category: 'genetics', name, top, left });

// onScoreRingEnter:
this.tooltip.set({ type: 'score', breakdown, top, left });

// Template:
@if (tooltip()) {
  <app-tooltip [data]="tooltip()!" [style.top.px]="tooltip()!.top" [style.left.px]="tooltip()!.left" />
}
```

### 4. Positioning
Include `top` and `left` in the data object (or keep as separate style bindings).

### 5. Cleanup
- Delete `frontend/src/app/components/shared/score-tooltip/` folder
- Update imports in `StrainHunter` and `MatchingPreferencesDrawer`
- Remove `ScoreTooltip` export from any barrels

## Implementation Phases

### Phase 1: Create Unified Component
1. Extend `Tooltip` component with discriminated union input
2. Add computed properties for each view type
3. Merge templates using `@switch`
4. Merge CSS (combine `tooltip.css` + `score-tooltip.css`)

### Phase 2: Update Consumers
1. Update `StrainHunter`:
   - Single `tooltip` signal with union type
   - Update event handlers to set unified data
   - Update template to use single `<app-tooltip>`
2. Update `MatchingPreferencesDrawer`:
   - Import from `tooltip` only
   - Pass `{ type: 'reference', category: 'terpene', name }`

### Phase 3: Cleanup
1. Delete `score-tooltip` folder
2. Remove `ScoreTooltip` from `StrainHunter` imports
3. Verify build and tests pass

## Files to Touch

### New/Modified
- `frontend/src/app/components/shared/tooltip/tooltip.ts` — extend with union input
- `frontend/src/app/components/shared/tooltip/tooltip.html` — merge templates
- `frontend/src/app/components/shared/tooltip/tooltip.css` — merge styles
- `frontend/src/app/features/strain-hunter/strain-hunter.ts` — unify signals/handlers
- `frontend/src/app/features/strain-hunter/strain-hunter.html` — single tooltip element
- `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.ts` — import update
- `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.html` — usage update

### Deleted
- `frontend/src/app/components/shared/score-tooltip/` (entire folder)

## Verification
- `npx ng build` passes
- `npx ng test --watch=false` passes
- No visual regression in StrainHunter tooltips
- MatchingPreferencesDrawer terpene tooltips still work

## Success Criteria
- Single tooltip component handles all three use cases
- No duplicate code between former components
- 500ms hover delay preserved for all tooltip types
- Build succeeds with no new warnings