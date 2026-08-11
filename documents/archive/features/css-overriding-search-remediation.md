# CSS Overriding Search — Remediation Summary

## Overview

Remediated 27 class-name violations found in the CSS overriding audit (`css-overriding-search.md`). Applied the established principle: structural overlap (display/align/gap) + visual-only differences → merge with modifier; no structural overlap or fundamentally different element → independent name (rename if misleading).

## Changes by Group

### Stage 1-2: Rule A — Exact Selector Match (5 cases in llm-providers-management.css)

| Original class | Action | Final class | File |
|---|---|---|---|
| `.col-expand` | Kept (complementary, not a conflict) | `.col-expand` | — |
| `.row-subtitle` | New global modifier | `.row-subtitle--flex` | `_utilities.css`, `llm-providers-management.css`, `.html` |
| `.status-indicator` | Renamed (different component) | `.status-dot` | `llm-providers-management.css`, `.html` |
| `.panel-header.compact` | Deleted (exact global duplicate) | — | `llm-providers-management.css` |
| `.panel-title.muted` | Deleted (exact global duplicate) | — | `llm-providers-management.css` |

### Stage 1-2: Rule A — `.fade-in` (5 files)

| Original class | Action | Final class | Files |
|---|---|---|---|
| `.fade-in` ×5 | Deleted (identical global duplicate) | — | `database-storage-monitor`, `register-form`, `system-status-dashboard`, `transcript-timeline`, `weather-forecast` |

### Stage 1-2: Rule A — Other

| Original class | Action | Final class | File |
|---|---|---|---|
| `.form-field` | Deleted (exact global duplicate) | — | `register-form.component.css` |
| `.metric-card` | Deleted (exact global duplicate) | — | `system-status-dashboard.component.css` |

### Group: Badges (3 cases)

| Original class | Action | Final class | File |
|---|---|---|---|
| `.flag-badge` | Kept (false positive — compound element, not a badge) | `.flag-badge` | — |
| `.count-badge` | Renamed (not a badge at all — table cell) | `.count-value` | `llm-providers-management.css`, `.html` |
| `.strain-penalty-badge` | Merged into global `.badge` | `badge badge-danger badge-compact` | `_utilities.css` (new modifier), `strain-hunter.css`, `.html` |

### Group: Chips (4 cases)

| Original class | Action | Final class | File |
|---|---|---|---|
| `.detail-chip` (weather-current) | Renamed (info tile, not a chip) | `.detail-tile` | CSS + HTML + spec |
| `.detail-chip` (weather-summary) | Renamed (info tile, not a chip) | `.detail-tile` | CSS + HTML |
| `.db-chip` | Renamed (static pill, not interactive chip) | `.db-stat-pill` | CSS + HTML |
| `.terpene-chip` / `.genetics-chip` | Merged into global `.chip` | `chip chip-neutral/like/love/avoid` | `_filters.css` (4 state modifiers), `matching-preferences-drawer.css` (kept `.chip-name`/`.chip-state` + scoped override), `.ts` |

### Group: Cards (3 cases)

| Original class | Action | Final class | File |
|---|---|---|---|
| `.summary-card` (db-storage-monitor) | Renamed (info row, not a card) | `.summary-row` | CSS + HTML |
| `.forecast-card` | Renamed (interactive tile, not a card) | `.forecast-tile` | CSS + HTML + spec |
| `.summary-card` (weather-summary) | Kept with comment (card-like, intentionally no accent) | `.summary-card` | CSS (comment added) |

### Additional fixes

| Change | File |
|---|---|
| "Add Model" button: `transparent-btn sm` → `primary-btn filled sm` | `llm-providers-management.html` |
| `.panel-header.compact`: removed `justify-content: flex-start` override | `_utilities.css` |

## Global CSS additions

| Modifier | Added to | Purpose |
|---|---|---|
| `.row-subtitle--flex` | `_utilities.css` | Flex-stretching subtitle for expand panels |
| `.badge-compact` | `_utilities.css` | Smaller padding/radius/font for compact badges |
| `.chip-neutral` | `_filters.css` | Neutral state for state-toggle chips |
| `.chip-like` | `_filters.css` | Like state (primary colors) |
| `.chip-love` | `_filters.css` | Love state (success colors) |
| `.chip-avoid` | `_filters.css` | Avoid state (danger colors) |

## Files touched

**Global CSS (3):**
- `frontend/src/app/assets/styles/_utilities.css` — `.row-subtitle--flex`, `.badge-compact`, `.panel-header.compact` fix
- `frontend/src/app/assets/styles/_filters.css` — 4 chip state modifiers

**Component CSS (10):**
- `llm-providers-management.css` — deleted 4 rules, renamed 2
- `strain-hunter.css` — deleted `.strain-penalty-badge`, added `.badge-compact .ph`
- `database-storage-monitor.component.css` — renamed `.summary-card` → `.summary-row`
- `weather-current-card.component.css` — renamed `.detail-chip` → `.detail-tile`
- `weather-summary-card.component.css` — renamed `.detail-chip` → `.detail-tile`, added comment to `.summary-card`
- `weather-forecast.component.css` — renamed `.forecast-card` → `.forecast-tile`
- `database-monitor-settings.css` — renamed `.db-chip` → `.db-stat-pill`
- `matching-preferences-drawer.css` — replaced terpene/genetics-chip with `.chip` override + child styles
- `register-form.component.css` — deleted `.fade-in`, `.form-field`
- `system-status-dashboard.component.css` — deleted `.fade-in`, `.metric-card`
- `transcript-timeline.component.css` — deleted `.fade-in`

**HTML (7):**
- `llm-providers-management.html` — button class, count-value, status-dot, row-subtitle--flex
- `strain-hunter.html` — badge classes
- `database-storage-monitor.component.html` — summary-row
- `weather-current-card.component.html` — detail-tile
- `weather-summary-card.component.html` — detail-tile
- `weather-forecast.component.html` — forecast-tile
- `database-monitor-settings.html` — db-stat-pill

**TypeScript (1):**
- `matching-preferences-drawer.ts` — `chipClass()` returns `chip chip-${state}`

**Spec files (3):**
- `weather-current-card.component.spec.ts` — detail-tile
- `weather-forecast.component.spec.ts` — forecast-tile

## Principle applied

> Structural overlap (display, align, gap — "the skeleton") + visual-only differences (padding, color, size — "decoration") → merge with modifier.
> No structural overlap or fundamentally different element → independent name; rename if misleading.

## Verification

`npx ng build` passes. Only pre-existing budget warnings remain (strain-hunter, matching-preferences-drawer, initial bundle). No new warnings. All stale class references eliminated.
