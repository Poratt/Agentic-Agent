# Documentation Handoff

## Current Structure

```txt
documents/
  STATUS.md
  LOG.md
  HANDOFF.md
  architecture-diagram.md
  audit/
  done/
  features/
    todo/
    incomplete/
  todo/
  incomplete/
```

## How To Use

- Put new approved feature plans in `documents/features/todo/`.
- Put unfinished drafts in `documents/features/incomplete/`.
- Move completed implementation plans to `documents/done/`.
- Put scan/review reports in `documents/audit/`.
- Keep `documents/architecture-diagram.md` updated when backend or frontend architecture changes.

## Notes For Next Agent

- `documents/todo/` and `documents/incomplete/` remain as compatibility folders, but new work should prefer `documents/features/`.
- Do not move `documents/done/` or `documents/audit/` unless explicitly asked.
- For code architecture changes, update `documents/architecture-diagram.md` or explicitly state that no diagram update was needed.
- The LLM service refactor is implemented at build level. Runtime checks that require a live server, JWT, and provider credentials should still be performed manually.
- `documents/done/llm-service-refactor-plan.md` is now closed.
- The GenUI builder split experiment was rolled back by the user.
- Current GenUI source of truth is again `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`.
- No `backend/src/modules/admin-agent/constants/gen-ui/gen-ui.builder.ts` file exists in the current workspace.
- `backend/src/modules/admin-agent/constants/system-context.constant.ts` currently contains mandatory GenUI rendering rules added outside this cleanup.
- New active frontend plan: `documents/features/todo/ai-format-directive-improvement-plan.md`.
- Backend build was verified after the rollback state: `npm.cmd run build` from `backend` passed.
- Next likely cleanup: start with the AiFormat directive plan before making larger GenUI rendering changes.
- Added `ExplorerModule` and `ExplorerController` around the existing `ExplorerService`.
- New protected endpoint: `GET /explorer/fetch?url=...`, backed by `ExplorerService.fetchDataFromUrl(url)`.
- Added explorer query/response DTOs for Swagger documentation.
- Updated `documents/architecture-diagram.md` to include `ExplorerModule` and its public web page dependency.
- Backend build was verified after adding Explorer controller/module: `npm.cmd run build` from `backend` passed.
- Added Angular `Explorer` page under `frontend/src/app/features/explorer/`.
- The first frontend version calls `GET /explorer/fetch` directly from the component with `HttpClient`; no dedicated Angular service was added.
- Added `/explorer` route and a sidebar link.
- Updated `documents/architecture-diagram.md` to include `ExplorerUI`.
- Frontend build was verified with `npx ng build` from `frontend`; it passed with existing unrelated warnings for `ChatHistory` and `chat-message.css` budget.
- Updated `ExplorerService.fetchDataFromUrl(url)` to scrape Jane-style product rows by clicking each table row, waiting for the expanded DOM, extracting visible and hidden strain data, and closing the row before moving to the next one.
- Explorer fetch now returns structured strain fields: `hebName`, `enName`, `parent1`, `parent2`, `originStrain`, and `countryOfOrigin`.
- Updated `ExplorerFetchResponseDto` to document the structured strain item schema.
- Backend build was verified after the scraper update: `npm.cmd run build` from `backend` passed.
- Explorer source URL is now fixed on the backend in `ExplorerService`; the client no longer sends a URL.
- `GET /explorer/fetch` now has no query parameters, and `ExplorerFetchQueryDto` was removed.
- Angular `Explorer` page now loads data automatically on `ngOnInit` and only exposes a refresh action.
- Backend and frontend builds were verified after removing the client-sent URL.
- Fixed Explorer scraper row detection after the client-side 400 error. The scraper no longer waits only for `tbody tr, [role="row"]`; it waits for hydrated Jane product rows using the table structure documented in `documents/features/todo/explorer-plan.md`.
- Explorer row opening now clicks the product row itself instead of nested buttons or SVGs, avoiding accidental cart-button clicks.
- Expanded-row parsing now reads the details grid by label/value pairs such as `זן מקור`, `הורה #1`, `הורה #2`, and `ארץ ייצור`.
- Backend build was verified after the Explorer selector fix.
- Explorer response now also includes the selected product/commercial fields: `isNew`, `deal`, `manufacturer`, `brand`, `expiry`, `price`, `catalogPrice`, `terpenes`, and `packageType`.
- Redundant Explorer fields `fromPrice`, `thc`, and `cbd` were removed from the scraper payload and response DTO.
- `ExplorerFetchResponseDto` documents the expanded payload.
- Backend build was verified after extending the Explorer payload.
- Angular Explorer page now uses PrimeNG `p-table` with sortable columns and global search.
- Explorer page title and table headers are in Hebrew, with the refresh button next to the search input in the page header.
- Frontend build was verified after the Explorer table update.
- `ExplorerService` now reads Jane's `api/widget/products/store/tiltan/` JSON payload instead of clicking table rows and parsing expanded DOM content.
- The service first tries a direct server-side POST to the Jane API, then falls back to Puppeteer network-response capture if the direct request is blocked.
- Direct Jane API requests can use optional `JANE_COOKIE` and `JANE_CSRF_TOKEN` environment variables; cookies are not hardcoded in the source.
- The response is still normalized to the existing Explorer table fields, so the Angular Explorer page did not need API-contract changes.
- `documents/architecture-diagram.md` now models the Explorer dependency as `Jane API / Store Page`.
- Backend build was verified after the Explorer API-source refactor.
- Explorer page now starts in `Loading`, shows visible loader text, disables search while loading, and displays the backend error message when Jane fetch fails.
- Jane browser fallback timeout was shortened so the user gets feedback faster instead of a long blank wait.
- Backend and frontend builds were verified after the Explorer loader/error fix.
- The Explorer spinner animation was fixed by removing the duplicate timing function from the CSS animation shorthand.
- Angular now applies a 20-second timeout to `GET /explorer/fetch`, and the backend direct Jane `fetch` uses `AbortController` with a 10-second timeout.
- No architecture diagram update was needed for the timeout/loader-only fix.
- Explorer refresh now stays enabled during loading. Clicking it cancels the previous request subscription and starts a new request.
- Angular timeout is now 45 seconds so it can wait for the backend's direct Jane request plus bounded browser fallback.
- Explorer scraper Hebrew-name extraction now ignores the `חדש!` ribbon and chooses the real `.text-gray-900` / `.text-base` product name candidate.
- This fixes missing rows such as Rhine, W.M.Z Small, Slac Mini, and other new products that were previously filtered out as ``.
- Explorer name-cell rendering now stacks the Hebrew name, English name, rating, and deal text in the first table column.
- `ExplorerService` now extracts visible review rating text from the product row and `ExplorerFetchResponseDto` documents the `rating` field.
- Backend and frontend builds were verified after the Explorer name-cell update.
- The Explorer page is currently using `mockData` in `ngOnInit()` for faster UI iteration; this was intentionally left untouched.
- The `isNew` flag is rendered as a small `NEW` tag inside the name cell only when `isNew === true`.
- The `catalogPrice` field is embedded inside the price cell under the current price with strikethrough, and remains part of global table search.
- Frontend build was verified after the Explorer table-cell updates.
- The `packageType` field now renders as an icon: `ph-jar-label` for `צנצנת`, `ph-bag-simple` for `שקית`, and `ph-package` fallback.
- Frontend build was verified after the Explorer package-type icon update.
- The `terpenes` field is no longer a standalone Explorer table column. It is still searchable and renders as a conditional full-width detail row under each product.
- Frontend build was verified after the Explorer terpenes row update.
- Explorer frontend files no longer contain Hebrew comments.
- Explorer CSS was cleaned to use project tokens and to remove the invalid `white-space: wrap` value.
- Explorer Swagger description now matches the current Jane store page scraper implementation.
- Frontend and backend builds were verified after the Explorer cleanup.
- Compared the Explorer table with the Jane source table and found that `manufacturer` looked missing because the Angular template hid any regular cell value equal to `לא ידוע`.
- `frontend/src/app/features/explorer/explorer.html` now renders regular fallback cells with `formatValue(item[column])`, so `לא ידוע` appears in columns such as `manufacturer`.
- The terpenes cell still hides `לא ידוע` through its explicit condition.
- Frontend build was verified after this Explorer display fix.
- Reviewed the Explorer strain filter flow in `frontend/src/app/features/explorer/explorer.html`, `explorer.ts`, and `explorer.css`; no code changes were made.
- Explorer table filters were generalized from strain-only string filters to field-aware filters in `frontend/src/app/features/explorer/explorer.ts`.
- The strain cell now uses `applyDataFilter(...)` for the full genetics field group, preserving the previous behavior of matching origin and parents by value.
- The marketer cell meta rows now render as filter buttons for `marketer`, `manufacturer`, and `brand`.
- Shared `.filter-node` styling in `frontend/src/app/features/explorer/explorer.css` now covers both strain nodes and marketer metadata rows.
- Frontend build was verified after the generic Explorer filter update.
- No architecture diagram update was needed because this was local Explorer table UI filtering only.
- `applyDataFilter(...)` now toggles active filters: clicking the same table filter button again removes that filter chip.
- Frontend build was verified after the Explorer filter toggle update.
- Explorer `packageType` now participates in `applyDataFilter(...)`, and the package icon cell is a toggleable filter button.
- Frontend build was verified after the Explorer package-type filter update.
- Explorer `countryOfOrigin` now participates in `applyDataFilter(...)`, and the country cell is a toggleable filter button.
- Frontend build was verified after the Explorer country filter update.
- `ExplorerService` now listens to Jane `api/widget/products/store/tiltan/` responses inside Puppeteer, scrolls the source page until product batches stop increasing, deduplicates captured products, and normalizes the captured JSON into the existing Explorer `items` response shape.
- The DOM click/extract flow remains as a fallback if no Jane API responses are captured during page load and scrolling.
- `ExplorerFetchResponseDto` now documents the existing `marketer` field that the frontend already uses.
- `ExplorerFetchResponseDto` now documents `name` instead of the stale `hebName` property, matching the actual Explorer payload consumed by the frontend.
- Backend build was verified after the Explorer network-capture update.
- Runtime validation against the live Jane page still depends on external network access and Jane/Cloudflare behavior.
- No architecture diagram update was needed because the Explorer module boundary and external Jane dependency stayed the same.
- Explorer `isNew` now participates in `applyDataFilter(...)`, and the `NEW` badge is a toggleable filter button.
- Explorer field filtering now compares fields through `formatValue(...)`, so boolean filters such as `isNew` match the displayed Hebrew boolean value.
- Frontend build was verified after the Explorer `isNew` filter update.
- Explorer active filters now store a separate display `label`, so the `isNew` filter chip shows `חדש` instead of the boolean display value `כן`.
- The `NEW` badge hover was softened to keep the green badge readable instead of inverting to poor contrast.
- Frontend build was verified after the Explorer `isNew` filter label and hover fix.
- `ExplorerService` `isNew` was fixed after the network-capture refactor: the service now extracts visible `חדש!` markers from loaded rows and maps them to captured Jane JSON products by Hebrew/English name, while still honoring any explicit JSON new flags if Jane adds them.
- Backend build was verified after the Explorer `isNew` fix.
- Explorer terpenes now split into individual toggleable filter buttons under each product.
- Explorer country-of-origin cells now render a country flag next to the country name.
- Frontend build was verified after the Explorer terpenes filter and country flag update.
- No architecture diagram update was needed because this was local Explorer table UI rendering/filtering only.
- Explorer terpene filter buttons now preserve percentage text in their visible label while filtering by the terpene name.
- `ExplorerService.formatTerpenes(...)` now recognizes additional Jane terpene percentage field names such as `percentage`, `amount`, `concentration`, `terpene_percent`, and `terpene_percentage`.
- Country flags were changed from emoji text to local tiny SVG assets served from `frontend/public/flags/*.svg`.
- Frontend and backend builds were verified after the terpene percentage and SVG flag update.
- Next exact step: visually check `/explorer` in the browser and confirm SVG flag sizing plus terpene percentage labels on live Jane data.
- Files touched this session: `frontend/src/app/features/explorer/explorer.ts`, `frontend/src/app/features/explorer/explorer.html`, `frontend/src/app/features/explorer/explorer.css`, `backend/src/modules/explorer/explorer.service.ts`, and `frontend/public/flags/*.svg`.
- Decisions made: keep the active filter value as the clean terpene name, but show the percentage-bearing terpene label in the button/chip; store flags locally instead of relying on emoji or a remote flag CDN.
- Open questions for the user: none.
- Explorer CSS was reorganized so all component selectors are nested under the root `.page-content` wrapper; only `@keyframes` remains top-level, and the mobile rules nest `.page-content` inside `@media`.
- Replaced the remaining hardcoded numeric flag border radius with `var(--radius-sm)`.
- Frontend build was verified after the Explorer CSS nesting cleanup.
- Next exact step: visually check `/explorer` to confirm the nested CSS preserved the existing layout.
- Files touched this session: `frontend/src/app/features/explorer/explorer.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep `@keyframes explorer-loader-spin` top-level because keyframes are not component selectors; scope responsive Explorer selectors through `.page-content`.
- Open questions for the user: none.
- Explorer CSS nesting was deepened further by moving header actions under `.header-row`, active filter controls under `.filters-row > .filters-container`, remove buttons under `.filter-chip`, mobile filter rules under the same filter hierarchy, and table sub-elements under their closest cell-level parents.
- Removed a few nonessential Explorer CSS rules to keep the component stylesheet under the existing 8KB build budget after deeper nesting.
- Frontend build was verified after the deeper Explorer CSS nesting update.
- Next exact step: visually check `/explorer` to confirm the deeper selector scoping preserved the table and active-filter layout.
- Files touched this session: `frontend/src/app/features/explorer/explorer.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: do not wrap the full table block under `p-table` because it pushes the component CSS over the hard 8KB budget; keep the deeper nesting where it maps to direct UI parents without failing the build.
- Open questions for the user: none.
- Applied the `css-conventions` skill to `frontend/src/app/features/explorer/explorer.css`.
- Cleaned the Explorer CSS nesting pass by keeping only `.page-content` as a root selector, removing stale `meta-row`/loader references, and moving market-cell button layout under `.market-cell .filter-node`.
- Frontend build was verified after the Explorer CSS conventions pass.
- Next exact step: visually check `/explorer` to confirm the marketer button layout still matches the intended table cell spacing.
- Files touched this session: `frontend/src/app/features/explorer/explorer.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the styling local to the Explorer component because these table-cell controls are specific to this page; no new global pattern was introduced.
- Open questions for the user: none.
- Explorer terpene percentage formatting now treats numeric `0` as an absent percentage so Jane default/empty terpene metrics no longer render as `0%` badges.
- Backend build was verified after the Explorer terpene zero-percent fix.
- Next exact step: refresh `/explorer` and confirm products with missing terpene percentages show terpene names without `0%`, while products with real percentages still show those percentages.
- Files touched this session: `backend/src/modules/explorer/explorer.service.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the API shape unchanged and only suppress meaningless zero percentages during backend normalization.
- Open questions for the user: none.
- Explorer header search now shows `סה"כ זנים: {{ items().length }}` under the search input using the existing global `.form-group` layout.
- Removed the Explorer header refresh button; the error-state retry button still calls `load()` for failed loads.
- Frontend build was verified after the Explorer header count update.
- Next exact step: visually check `/explorer` to confirm the search count spacing is acceptable in the header.
- Files touched this session: `frontend/src/app/features/explorer/explorer.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: reuse the global `.form-group` instead of adding local Explorer CSS because the component stylesheet is close to the hard 8KB budget.
- Open questions for the user: none.
- Documentation now reflects that Explorer no longer renders the genetics connector line from origin strain to parent strains; the genetics values remain visible as independent filter buttons.
- Removed the stale current-work note that listed `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts` as a cleanup candidate.
- Next exact step: visually check `/explorer` and confirm the genetics filter buttons look correct without connector lines in both themes.
- Files touched this session: `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`, and `documents/features/todo/explorer-plan.md`.
- Decisions made: keep the genetics UI documented as independent filter buttons without connector lines; keep the active GenUI cleanup focused on the AiFormat directive.
- Open questions for the user: none.
- Fixed the chat/AiFormat mixed GenUI response bug: markdown text before a streamed `component` fence now stays visible next to the skeleton and remains visible after the completed component renders.
- `frontend/src/app/core/directives/ai-format.directive.ts` now splits a completed component response into `before`, `componentHtml`, and `after` parts, rendering markdown segments around the raw component HTML.
- `frontend/src/app/core/directives/ai-format.directive.ts` now renders the streaming component skeleton after any text before the `component` fence instead of replacing the entire message body.
- `frontend/src/app/features/chat/chat-message/chat-message.ts` no longer treats generic ` ```c ` fences as GenUI templates.
- Verification: `npx tsc -p tsconfig.app.json --noEmit` from `frontend` passed.
- Verification note: `npx ng build` from `frontend` is currently blocked by unrelated `frontend/src/app/features/explorer/explorer.css` budget overage: total 8.34 kB, 344 bytes over the 8.00 kB maximum.
- Next exact step: manually test `/chat` with an assistant answer that streams markdown text followed by a `component` block and confirm both the sentence and rendered template remain visible.
- Files touched this session: `frontend/src/app/core/directives/ai-format.directive.ts`, `frontend/src/app/features/chat/chat-message/chat-message.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the public `[aiFormat]` API unchanged and fix the mixed-response rendering inside the directive.
- Open questions for the user: none.
