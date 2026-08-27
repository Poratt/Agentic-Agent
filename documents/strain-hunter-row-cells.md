# Strain Hunter — Row Cell Breakdown

> Source: `frontend/src/app/features/strain-hunter/strain-hunter.ts` / `strain-hunter.html` / `strain-hunter.css` / `mock.ts`
> Table: PrimeNG `p-table` with `customSort`, `sortMode="multiple"`, `scrollable` (`strain-hunter.html:233`)
> Columns are computed in `columns()` (`strain-hunter.ts:340`) from `preferredColumns` (`strain-hunter.ts:186`) plus any extra dynamic keys. `embeddedColumns` (`strain-hunter.ts:197`) are rendered _inside_ the primary cells rather than as standalone columns.

## Column order

`preferredColumns` defines the canonical order (`strain-hunter.ts:186`):

```
0  name
1  matchScore        ← conditional (only when MatchingEngine has preferences)
2  characterization
3  price
4  originStrain      ← labelled "גנטיקה" (genetics)
5  marketer          ← labelled "משווק"
6  countryOfOrigin   ← labelled "מקור"
7  expiry            ← labelled "תוקף"
8  packageType       ← labelled "אריזה"
```

When no matching preferences are set the table shows **8 columns** (0, 2–8). When preferences exist a 9th column (`matchScore`) is injected at position 1. This document describes all 9 positions; the default visible set is 8.

Dynamic columns beyond `preferredColumns` are appended automatically if a row object contains an unknown key (`strain-hunter.ts:356`), but in the current dataset only the canonical columns appear. `columnLabel()` (`strain-hunter.ts:865`) resolves Hebrew header text via `columnLabels` (`strain-hunter.ts:157`).

---

### Cell 1 — `name` — "שם" (`strain-hunter.html:265`, `strain-hunter.css:25`)

The densest cell. Flex row with two sub-columns (`.strain-main-details`, `gap: --space-6`).

**Right sub-column** (`.right-side`, `strain-hunter.html:267`, `strain-hunter.css:120`):

| Element              | Condition                        | Rendering                                                                                                                                                                                                                                           | Interaction                                                                                        |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `NEW` tag            | `item.isNew === true`            | `<button class="strain-new-tag">NEW</button>` — green bg `var(--color-success-bg)`, `xxs` font                                                                                                                                                      | `applyDataFilter('isNew', true, 'חדש')` — toggles filter chip                                      |
| `growType` pill      | `hasDisplayValue(item.growType)` | `<button class="filter-node grow-filter-node"><span class="ph …"></span> {{formatValue}}</button>` — icon from `growTypeIconClass()` (`strain-hunter.ts:929`): `ph-house` (אינדור), `ph-sun` (חממה), `ph-tree` (משולב), `ph-question-mark` fallback | Filters by `growType`                                                                              |
| `imageUrl` thumbnail | `hasDisplayValue(item.imageUrl)` | `<img class="strain-thumbnail" 52×52, cover, radius sm>`                                                                                                                                                                                            | Click/Enter → `openImageDialog(url)` opens `p-dialog` (`strain-hunter.html:596`) with full image   |
| Compare toggle       | always                           | `<button class="icon-circle-toggle" is-selected>` — `ph-plus-circle` / `ph-check-circle`, `aria-pressed`                                                                                                                                            | `toggleCompare(item)` — adds/removes `item.id` from `compareIds()` signal (`strain-hunter.ts:452`) |
| `batch`              | `hasDisplayValue(item.batch)`    | `<span class="strain-batch">` — `xxs`, secondary, nowrap                                                                                                                                                                                            | display only                                                                                       |

**Left sub-column** (`.left-side`, `strain-hunter.html:318`):

| Element       | Condition                                                     | Rendering                                                                                                                                                 | Notes                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hebrew name   | always                                                        | `<a href=productUrl target=_blank class="strain-heb-name link">` if `productUrl` else `<span>` — `sm`, `semibold`, primary color, hover underline primary | `formatValue(item.name)`                                                                                                                                                                                        |
| English name  | `hasDisplayValue(item.enName)`                                | `<span class="strain-en-name" dir="ltr">` — `xs`, secondary                                                                                               |                                                                                                                                                                                                                 |
| Penalty badge | `item.penalty === true && hasDisplayValue(penaltyIngredient)` | `<span class="badge badge-danger badge-compact"><span class="ph ph-prohibit"></span> {{penaltyIngredient}}</span>`                                        | red badge                                                                                                                                                                                                       |
| Cannabinoids  | `hasDisplayValue(thc) \|\| hasDisplayValue(cbd)`              | `<span class="strain-cannabinoids">THC: … \| CBD: …</span>` — 11px, semibold, secondary, divider `var(--color-border)`                                    |                                                                                                                                                                                                                 |
| Rating        | `hasDisplayValue(item.rating)`                                | `<span class="strain-rating"><span class="ph ph-star ph-fill"></span> {{rating}}</span>` — warning color                                                  | e.g. `"(9) 4.4"`                                                                                                                                                                                                |
| Deal          | `hasDisplayValue(item.deal)`                                  | `<span class="strain-deal"><span class="ph ph-gift"></span> {{deal}}</span>` — danger color                                                               | e.g. `"3 ב-₪299"`                                                                                                                                                                                               |
| Symbols       | `getSymbols(item.symbols).length > 0`                         | `<div class="strain-symbols"><img class="strain-symbol 28×28 circle">…` — white bg, border, padding 2px                                                   | `getSymbols()` (`strain-hunter.ts:1013`) parses JSON array of `{url, alt}`, remaps `pest-free`/`beta-radiation` to local assets, each image filters by `symbols` on click and shows `appTooltip` with `alt` text |

All `formatValue()` calls (`strain-hunter.ts:869`) coerce `null/undefined/''` → `''`, `boolean` → `כן/לא`, objects → `JSON.stringify`, else `String(value)`.

---

### Cell 2 — `matchScore` — "התאמה" (`strain-hunter.html:385`, `strain-hunter.ts:576`) — CONDITIONAL

| Aspect          | Detail                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visibility**  | Only when `matchingEngine.hasAnyPreference()` is true (`strain-hunter.ts:342`). Otherwise the column is absent and the row has 8 cells.                                                                                                        |
| **Data source** | `matchingEngine.calculateScore(item)` (`strain-hunter.ts:325`) — `item.score` (0–100) + `item.breakdown: ScoreBreakdown`                                                                                                                       |
| **Rendering**   | `<div class="score-ring-wrapper 40×40" (mouseenter/leave)>` containing an SVG ring (`viewBox 0 0 40 40`, `rotate(-90deg)`) + centered number                                                                                                   |
| **SVG**         | Track: `<circle r=18 stroke var(--color-border) width 4>`. Fill: `<circle r=18 stroke-dasharray=113.09 (2*PI*18, strain-hunter.ts:576) stroke-dashoffset=ringDashOffset(score) (strain-hunter.ts:578) stroke-linecap round>`                   |
| **Color**       | `ringColorClass(score)` (`strain-hunter.ts:582`): `>=75 ring-success` (green gradient `ringGradientSuccess`), `>=50 ring-primary` (purple), `>=25 ring-warning` (orange), `<25 ring-danger` (red). Gradients defined in `strain-hunter.html:1` |
| **Center text** | `<span class="score-ring-text">{{item.score}}</span>` — `sm`, `semibold`, `tabular-nums`, absolutely centered (`strain-hunter.css:418`)                                                                                                        |
| **Interaction** | `mouseenter` → `onScoreRingEnter(breakdown, $event)` (`strain-hunter.ts:757`) — after 400ms shows `app-score-tooltip` positioned below the ring; `mouseleave` → `onScoreRingLeave()` hides it (`strain-hunter.html:207`)                       |
| **Sorting**     | Sort field resolves to `score` (`resolveSortField()`, `strain-hunter.ts:1166`). Sortable via header. Liked genetics/terpenes get `.liked` highlight only when `isSortingByScore()` is true.                                                    |
| **Example**     | `score: 82` → green ring ~82% filled, "82" centered                                                                                                                                                                                            |

---

### Cell 3 — `characterization` — "אפיון" (`strain-hunter.html:411`, `strain-hunter.css:157`)

Centered flex-wrap pill group (`gap: --space-2`, `justify-content: center`).

| Pill          | Condition                           | Class / Style                                                                                                                                                | Label source                                                                                                |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `packageType` | `hasDisplayValue(item.packageType)` | `family-badge package-badge` — `var(--color-primary-glow-bg)` bg, primary text                                                                               | `formatValue(item.packageType)` e.g. `"שקית"` / `"צנצנת"`                                                   |
| `category`    | `hasDisplayValue(item.category)`    | `family-badge category-badge` — `var(--color-danger-glow)` bg, danger text                                                                                   | `formatValue(item.category)`                                                                                |
| `family`      | `hasDisplayValue(item.family)`      | `family-badge` + `getFamilyClass()` (`strain-hunter.ts:1071`): `family-indica` → `var(--color-family-indica)`, `family-sativa`, `family-hybrid` — white text | `formatFamilyHebrew()` (`strain-hunter.ts:1057`) maps `indica→אינדיקה, sativa→סאטיבה, hybrid/היבריד→היבריד` |

All three pills are `<button>` elements calling `applyDataFilter(field, value)` — clicking toggles a filter chip. Hover/active has `scale(0.97)` transform.

---

### Cell 4 — `price` — "מחיר" (`strain-hunter.html:442`, `strain-hunter.css:213`)

Vertical stack (`flex-direction: column`, `gap: --space-2`), centered in cell.

| Line          | Rendering                                                                                                             | Style                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Current price | `<span class="strain-current-price">{{formatValue(item.price)}}</span>`                                               | `sm`, `semibold`, `var(--color-success)` (green) |
| Catalog price | `hasDisplayValue(item.catalogPrice)` → `<span class="strain-catalog-price">{{formatValue(item.catalogPrice)}}</span>` | `xs`, `var(--color-danger)`, `line-through`      |

Numeric sorting via `numericSortColumns` set (`strain-hunter.ts:150` includes `price`/`catalogPrice`/`matchScore`) — `toNumber()` (`strain-hunter.ts:1184`) strips non-numeric chars. `priceBounds` / `priceRange` slider in the filter bar filters this column (`strain-hunter.ts:282`).

Example: `price "₪109"` green, `catalogPrice "₪199"` red strikethrough. Filter slider range shown in header as `₪min — ₪max`.

---

### Cell 5 — `originStrain` — "גנטיקה" (`strain-hunter.html:449`, `strain-hunter.css:264`)

The genetics/lineage cell. Column flex, `max-width: 220px`, centered.

**Top section** (`.root-nodes`, `strain-hunter.html:451`):

- `originStrain` button (`strain-hunter.html:452`): `<button class="origin-strain-node" [class]="geneticsClass(name) + ' origin-strain-node'"><span class="ph ph-dna"></span> {{formatValue}}</button>` — `filter-node` pill, `xxs`, hover `primary-glow-bg`. `mouseenter` → `onGeneticsEnter(name, $event)` shows `app-tooltip category="genetics"` (delay 400ms, `strain-hunter.ts:696`), `mouseleave` → `onTooltipLeave()`. Click → `applyDataFilter(['originStrain','parent1','parent2'], value)` — matching any of the three fields. `geneticsClass()` (`strain-hunter.ts:1099`) adds `.liked` (secondary color) when `isSortingByScore()` and `isGeneticsLiked(name)` (`prefState genetics:name` is `like`/`love`).

- Parents row (`.parents-cell`, `strain-hunter.html:464`): two `filter-node` pills for `parent1` / `parent2` with same `geneticsClass`, tooltip, and filter behavior, separated by an empty `<span>` spacer. Each also has `ph-dna` icon. Hidden individually via `hasDisplayValue()`.

**Bottom section** — Terpenes (`.terpenes`, `strain-hunter.html:492`):

- Condition: `splitTerpenes(item.terpenes).length > 0`. Grid `max-content 1fr`, top border `var(--color-border)`, primary color, `xxs`.
- Icon: `ph-leaf` (`--font-size-md`)
- List: `<div class="terpene-list">` flex-wrap of `<button [class]="terpeneClass(name)"> {{terpene.label}} </button>`. `splitTerpenes()` (`strain-hunter.ts:943`) splits comma-separated string, strips trailing `%`/`(…%)` via `toTerpeneFilter()` (`strain-hunter.ts:1109`), returns `{name, label}`. `terpeneClass()` (`strain-hunter.ts:1103`) mirrors genetics liked logic (`prefState terpene:name`). `mouseenter` → `onTerpeneHover(name, $event)` (`strain-hunter.ts:967`) lazy-loads `TerpeneStore` and shows fixed-position `app-tooltip category="terpene"` (`.tooltip-fixed` at page root to escape overflow). Click → `applyDataFilter('terpenes', name, label)`.
- Examples: `"לינאלול, קריופילן, מירצן"` → 3 pills; `"לינאלול 11%, יומולן 8%, קריופילן 24%"` → labels keep percentages, names stripped.

---

### Cell 6 — `marketer` — "משווק" (`strain-hunter.html:540`, `strain-hunter.css:346`)

Vertical stack (`.market-cell`, `flex-direction: column`, `align-items: flex-start`, `gap: --space-2`, `width: fit-content`). Up to 3 stacked filter pills, each `hasDisplayValue`-gated:

| Row | Field          | Icon            | Interaction                              |
| --- | -------------- | --------------- | ---------------------------------------- |
| 1   | `marketer`     | `ph-storefront` | `applyDataFilter('marketer', value)`     |
| 2   | `manufacturer` | `ph-tree-palm`  | `applyDataFilter('manufacturer', value)` |
| 3   | `brand`        | `ph-cube-focus` | `applyDataFilter('brand', value)`        |

Each is `<button class="filter-node">` — `xxs`, hover `primary-glow-bg`, `scale(0.97)` on active. Commonly `marketer`/`manufacturer`/`brand` share the same string (e.g. `"טוגדר"`), but they are distinct filter dimensions (`StrainHunterFilterField`, `strain-hunter.ts:47`). Example row from `mock.ts:3`: marketer `טוגדר`, manufacturer `קנאדו`, brand `קנאדו`.

---

### Cell 7 — `countryOfOrigin` — "מקור" (`strain-hunter.html:511`, `strain-hunter.css:334`)

Single pill, conditionally rendered (`hasDisplayValue(item.countryOfOrigin)`).

- `<button class="country-filter filter-node" (click)="applyDataFilter('countryOfOrigin', value)">`
  - Flag: `<img class="country-flag" [src]="countryFlagUrl(value)">` — `width: --space-8`, auto height. `countryFlagUrl()` (`strain-hunter.ts:994`) maps Hebrew name to ISO code: `ישראל→il, קנדה→ca, פורטוגל→pt, אורוגוואי→uy, אוגנדה→ug, ספרד→es, גרמניה→de, מרוקו→ma, דנמרק→dk, הולנד→nl` → `/flags/{code}.svg`; empty string if unmapped → no image.
  - Label: `<span>{{formatValue(item.countryOfOrigin)}}</span>`
- Styling: `inline-flex`, `gap: --space-2`, `xxs`, hover primary-glow.
- Example: `ישראל` → `il.svg` + "ישראל"; `קנדה` → `ca.svg` + "קנדה". Clicking toggles filter chip labelled `FILTER_FIELD_NAMES['countryOfOrigin'] = 'ארץ מקור'` (`strain-hunter.ts:79`).

---

### Cell 8 — `expiry` — "תוקף" (`strain-hunter.html:569` fallback, `strain-hunter.ts:1144`)

No dedicated cell template — falls through to the generic `{{ formatValue(item[column]) }}` branch (`strain-hunter.html:569`). Plain text cell.

| Aspect        | Detail                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data**      | `item.expiry` — string `"MM/YY"` e.g. `"02/27"`, `"11/26"` (`mock.ts:11`)                                                                                                                                          |
| **Rendering** | `formatValue(item.expiry)` — pass-through string                                                                                                                                                                   |
| **Sorting**   | Custom chronologic sort in `sortValue()` (`strain-hunter.ts:1144`): parses `MM/YY` → `(2000+YY)*100+MM` for numeric comparison, avoiding lexicographic mis-order (`"02/27" < "01/28"` would be wrong)              |
| **Filtering** | Filterable via global search (`searchColumns` includes `expiry`) but has no dedicated filter pill / column-specific filter. Chip filtering not wired for `expiry` (no `expiry` in `StrainHunterFilterField` union) |
| **Styling**   | Inherits table cell defaults (no special class)                                                                                                                                                                    |

---

### Cell 9 — `packageType` — "אריזה" (`strain-hunter.html:529`, `strain-hunter.css:354`)

Icon-only cell.

| Aspect           | Detail                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rendering**    | `<button class="package-type-cell filter-node" aria-label=formatValue(packageType) appTooltip [text]=formatValue(packageType) (click)="applyDataFilter('packageType', value)"> <span class="ph package-type-icon" [ngClass]="packageTypeIconClass(value)"></span> </button>` |
| **Icon mapping** | `packageTypeIconClass()` (`strain-hunter.ts:918`): contains `צנצנת` → `ph-jar-label`, contains `שקית` → `ph-bag-simple`, else `ph-question-mark`                                                                                                                             |
| **Styling**      | `inline-flex` centered, `min-width/height: --space-16`, `var(--color-primary-glow-bg)` bg, `radius sm`, primary color. Icon `font-size: lg`, `line-height: 1`                                                                                                                |
| **Interaction**  | Click toggles `packageType` filter chip. Tooltip shows Hebrew value on hover.                                                                                                                                                                                                |
| **Example**      | `packageType: "שקית"` → bag icon; `"צנצנת"` → jar icon                                                                                                                                                                                                                       |

In the **comparison dialog** (`strain-hunter.html:622`) the same column renders as a non-interactive `<span>` with the same icon — filters are disabled there.

---

## Global row behaviors

- **Row-level sorting**: `sortTable()` (`strain-hunter.ts:789`) handles single vs multi-sort (Ctrl/Cmd), 3-click cycle (asc → desc → reset to backend order via `resetSort()` + `table.reset()`), `Intl.Collator('he', {numeric:true})` for text columns.
- **Filtering**: `items` computed (`strain-hunter.ts:278`) applies price bounds, global search (`searchQuery` with `applyGlobalFilter()`), and `activeFilters` (every filter must match at least one of its `fields`). Active chips render in the collapsible filter bar (`strain-hunter.html:143`) with remove buttons; `clearAllFilters()` clears chips + price + sort + localStorage (`strain-hunter.ts:633`).
- **Empty state**: `emptymessage` template (`strain-hunter.html:577`) shows magnifying-glass icon inside the table rather than replacing the page.
