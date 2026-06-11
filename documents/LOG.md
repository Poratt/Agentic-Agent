# Documentation Change Log

## 2026-06-11 Explorer CSS Budget Fix

- Removed duplicate PrimeNG sort-icon overrides from `frontend/src/app/features/explorer/explorer.css`; the equivalent global rules already live in `frontend/src/app/assets/styles/_utilities.css`.
- Removed a redundant `NEW` badge hover background declaration in Explorer CSS.
- Verified `npx ng build` from `frontend` now passes again. Remaining output is warnings only: unused `AccessToDirective`, `chat-message.css` warning budget, and `explorer.css` warning budget at 7.97 kB.
- Fixed Explorer price sorting by enabling PrimeNG `customSort` and comparing `price`/`catalogPrice` through numeric values extracted from their display strings.
- Verified `npx ng build` from `frontend` after the Explorer numeric sort fix.

## 2026-06-10 Explorer Terpene Flags Update

- Preserved Explorer terpene percentage labels by separating the visible terpene label from the filter value and by broadening backend Jane terpene percentage-field normalization.
- Replaced Explorer country emoji flags with local SVG assets under `frontend/public/flags` so the table renders consistent tiny flag images without a remote dependency.
- Scoped Explorer component CSS selectors under the root `.page-content` wrapper while leaving `@keyframes explorer-loader-spin` top-level.
- Deepened Explorer CSS nesting under direct UI parents while keeping the full table block out of a `p-table` wrapper to stay under the existing component CSS budget.
- Applied the Explorer CSS conventions pass locally in the component stylesheet and kept market-cell-specific button layout nested under `.market-cell`.
- Suppressed numeric zero terpene percentages during Explorer backend normalization, because Jane can send `0` for missing/default terpene percentage fields.
- Reused the global `.form-group` layout for the Explorer header search count and removed the header refresh button without adding local CSS.
- Removed the Explorer genetics connector line from origin strain to parents and kept the genetics values as independent filter buttons.
- Moved PrimeNG sort-icon overrides to global utilities to keep Explorer component CSS within budget.
- Fixed AiFormat mixed-response rendering so markdown text before or after a GenUI `component` block remains visible during skeleton streaming and after the completed component renders.
- Narrowed chat template detection to `component` fences instead of broad ` ```c ` matching, so normal code fences are not treated as GenUI.

## 2026-06-09

- Added documentation control files:
  - `documents/STATUS.md`
  - `documents/LOG.md`
  - `documents/HANDOFF.md`
- Added `documents/features/`.
- Added `documents/features/todo/`.
- Added `documents/features/incomplete/`.
- Moved active todo plans from `documents/todo/` to `documents/features/todo/`.
- Moved incomplete notes from `documents/incomplete/` to `documents/features/incomplete/`.
- Refactored `LlmService` into a facade over provider config, client runtime, model catalog, and health-check services.
- Restored and updated `documents/architecture-diagram.md` with the new LLM internal service split.
- Moved completed LLM service refactor plan to `documents/done/llm-service-refactor-plan.md`.
- Split the GenUI base prompt into focused constants under `backend/src/modules/admin-agent/constants/gen-ui/`, while keeping `GenUiSpec` and `GENUI_HTML` exported from the original path for controller compatibility.
- Replaced the split GenUI constants with the new `gen-ui.builder.ts` template builder, added global data-safety rules, removed hardcoded fallback colors, and kept `GENUI_HTML` exported from `gen-ui-spec.constant.ts`.
- Added GenUI token-safety rules that forbid `:root`, CSS variable redeclarations, global selector styling, and hardcoded design values; added approved element examples to guide generated templates.
- Added `documents/features/todo/ai-format-directive-improvement-plan.md` for frontend GenUI rendering safety and markdown cleanup.
- Strengthened GenUI visual requirements for tables, dashboards, forms, and confirmations; added a dedicated current-weather template with a giant animated weather emoji, hover states, local CSS scene, and stricter weather data rules.
- Rolled back the GenUI builder split/weather-template experiment at the user's request. The current source of truth is again `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`; `gen-ui.builder.ts` is absent in the current workspace.
- Verified backend build after the rollback state with `npm.cmd run build` from `backend`.
- Added `ExplorerModule` and `ExplorerController` for the existing `ExplorerService`, exposing `GET /explorer/fetch?url=...` as a protected Swagger-documented endpoint.
- Updated `documents/architecture-diagram.md` to include `ExplorerModule` and its public web page scraping dependency.
- Verified backend build after adding the Explorer module.
- Added Angular `Explorer` page under `frontend/src/app/features/explorer/`, with direct `HttpClient` access to `GET /explorer/fetch` and dynamic table rendering.
- Added `/explorer` route and sidebar navigation item.
- Updated `documents/architecture-diagram.md` with `ExplorerUI` and noted that the first version does not use a dedicated Angular service.
- Verified frontend build after adding the Explorer page.
- Replaced the Explorer scraper implementation with a focused Jane-style dynamic table flow: load page, locate product rows, click each row, wait for expanded content, extract visible and hidden strain fields, close the row, and continue.
- Explorer fetch response now documents and returns structured strain fields: `hebName`, `enName`, `parent1`, `parent2`, `originStrain`, and `countryOfOrigin`.
- Verified backend build after updating the Explorer scraper.
- Changed Explorer ownership so the source URL is fixed on the backend, `GET /explorer/fetch` has no query parameters, and the Angular Explorer page loads automatically on entry.
- Removed the Explorer URL input from the client and removed `ExplorerFetchQueryDto`.
- Verified backend and frontend builds after the Explorer URL ownership change.
- Fixed the Explorer scraper selector flow after `Waiting for selector tbody tr, [role="row"] failed`. The scraper now waits for hydrated Jane product rows using the documented `table[role="table"]` / `tbody[role="rowgroup"]` structure.
- Changed row expansion to click the product row itself and changed expanded data extraction to read label/value pairs from the details grid.
- Verified backend build after the Explorer selector fix.
- Expanded the Explorer strain payload with the selected product/commercial fields: `isNew`, `deal`, `manufacturer`, `brand`, `expiry`, `price`, `catalogPrice`, `terpenes`, and `packageType`.
- Removed redundant Explorer fields `fromPrice`, `thc`, and `cbd` from the scraper payload and response DTO.
- Verified backend build after extending the Explorer scraper payload.
- Updated the Angular Explorer page to use PrimeNG `p-table` with sortable columns, global search, Hebrew table headers, and a Hebrew page title.
- Verified frontend build after the Explorer table update.
- Reworked `ExplorerService` to consume Jane's `api/widget/products/store/tiltan/` JSON payload instead of extracting data from expanded table DOM rows.
- Added a direct Jane API request first, with a Puppeteer network-response fallback for cases where Jane blocks server-side requests with Cloudflare.
- Added optional `JANE_COOKIE` and `JANE_CSRF_TOKEN` environment support for local Jane API verification without hardcoding browser cookies in source code.
- Updated Explorer Swagger text and `documents/architecture-diagram.md` to describe the Jane API integration instead of page scraping.
- Verified backend build after replacing the Explorer DOM scraper.
- Fixed Explorer blank-state UX by starting the page in loading state, rendering visible loader text, surfacing the backend error message, and shortening the Jane browser fallback timeout.
- Verified backend and frontend builds after the Explorer loader/error fix.
- Fixed the frozen Explorer loader animation by removing the duplicate animation timing value and added explicit request timeouts in both Angular and the backend Jane direct fetch.
- Verified backend and frontend builds after the Explorer non-blocking loader fix.
- Made Explorer refresh non-blocking: clicking refresh now cancels the previous Angular request and starts a new one, instead of disabling the page while loading.
- Increased the Explorer frontend timeout to wait for the backend fallback window, while keeping backend Jane timeouts bounded.
- Fixed missing Explorer rows marked as `חדש!`; the scraper no longer treats the new-product ribbon as the Hebrew product name.
- Verified backend build after the Explorer Hebrew-name extraction fix.
- Styled the Explorer name column to match the Jane table pattern: Hebrew name, English name, review rating, and deal text are now stacked in one cell.
- Added Explorer scraper extraction for the visible row rating text and documented it in the response DTO.
- Verified backend and frontend builds after the Explorer name-cell update.

## 2026-06-10

- Moved the Explorer `isNew` indicator into the name cell as a small inline `NEW` tag.
- Fixed the new-product tag condition so it renders only when `isNew === true`.
- Verified frontend build after the Explorer new-tag update.
- Merged Explorer `price` and `catalogPrice` into one price cell: current price renders first, catalog price renders below with strikethrough.
- Kept `catalogPrice` searchable while hiding it as a standalone table column.
- Replaced Explorer package type text with icons: jar for `צנצנת`, bag for `שקית`, and package fallback for unknown values.
- Verified frontend build after the package-type icon update.
- Explorer table terpenes display update: removed `terpenes` as a standalone table column and render it as a conditional full-width row under each product.
- `terpenes` remains part of global search through embedded table fields.
- Verified frontend build after the terpenes row update.
- Removed Hebrew comments from the Explorer frontend files.
- Cleaned Explorer CSS to use project tokens instead of hardcoded colors and invalid `white-space: wrap`.
- Updated Explorer Swagger description to match the current Jane store page scraper flow.
- Verified frontend and backend builds after the Explorer cleanup.
- Compared the Explorer dark table against the Jane source table and found the missing `manufacturer` display was caused by the frontend hiding normal column values equal to `לא ידוע`.
- Updated the Explorer table fallback cell rendering to display `לא ידוע` in regular columns such as `manufacturer`, while keeping the terpenes-specific empty display behavior unchanged.
- Verified frontend build after the Explorer manufacturer display fix.
- Reviewed the Explorer strain filter flow; no code or architecture changes were made.
- Generalized Explorer UI filtering from strain-only string values to field-aware filters and made marketer metadata rows clickable filter controls.
- No architecture diagram update was needed for the local Explorer table filtering change.
- Changed Explorer table filter clicks to toggle existing field-aware filters off when the same filter is clicked again.
- Added `packageType` to the Explorer field-aware UI filters and made the package icon cell clickable.
- Added `countryOfOrigin` to the Explorer field-aware UI filters and made the country cell clickable.
- Updated `ExplorerService` to capture Jane `api/widget/products/store/tiltan/` network responses through Puppeteer while scrolling the source page, so Explorer can collect additional lazy-loaded batches instead of stopping at the initial 25 visible rows.
- Added Jane JSON normalization for the existing Explorer table shape, including marketer, manufacturer, brand, prices, expiry, parents, origin strain, country, terpenes, and package type.
- No architecture diagram update was needed because the Explorer module boundary and external Jane dependency stayed the same.
- Added `isNew` to the Explorer field-aware UI filters and made the `NEW` badge clickable.
- Added a display label to Explorer active filters so boolean-backed filters can show user-facing labels independent of their filter value.
- Added individual terpene filter buttons and country flag rendering to the Explorer table UI.
- Fixed the Explorer network-capture path so `isNew` no longer depends only on a missing Jane `is_new` JSON field; it now also maps visible `חדש!` DOM markers back to captured JSON products by Hebrew/English name.
