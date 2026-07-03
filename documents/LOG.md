# Documentation Change Log

## 2026-07-03 GenUI Progressive Streaming Rendering Plan

- Added `documents/features/todo/genui-progressive-streaming-rendering-plan.md`.
- Planning decision: keep version 1 frontend-only by adding a progressive parser inside `AiFormat` before changing backend streaming protocol.
- Planning decision: partial rendering must reuse the existing GenUI sanitizer rules; unsafe tags, unsafe selectors, and CSS custom property overrides remain blocked during streaming.
- Planning decision: skeleton remains the fallback only while partial GenUI is too incomplete to render safely.
- No architecture diagram update was needed because this session created a plan only and did not change runtime architecture.

## 2026-06-20 LLM Providers Management — PrimeNG Dialogs

- Added PrimeNG `p-dialog` for provider and model create/edit in `frontend/src/app/features/llm-providers-management/`.
- Provider dialog fields: key, label, baseUrl, apiKey (password input), active toggle (`p-toggleSwitch`).
- Model dialog fields: key, label, active toggle.
- "Add Provider" button added to page header action row.
- "Add Model" button added to expanded provider panel header bar.
- Edit provider button (`openEditProviderDialog`) and edit model button (`openEditModelDialog`) wired with pre-filled forms.
- Added model delete (`deleteModel`) via soft-disable PATCH `{ active: false }`.
  - `LlmProviderService` now exposes `deleteModel(modelId)`.
  - `LlmProviderStore` now exposes `deleteModel(providerId, modelId)`.
  - Model delete row button added next to the edit button in the model sub-table.
- Verification: `npx ng build` passes. New budget warning: `llm-providers-management.css` 6.43 kB over 4 kB limit (same pattern as `explorer.css` and `chat-message.css`).
- No architecture diagram update was needed because this was frontend UI addition only.

## 2026-06-20 LLM Providers Management Code Review

- Reviewed llm-provider-management backend (`llm-provider` module) and frontend (`llm-providers-management` feature).
- Fixed: `result.logOutput` → `result.errorMessage` in the test-results log-output table cell (`llm-providers-management.html:208`). Error messages now display instead of always showing "OK".
- Fixed: `model.modelId` → `model.key` in the model slug cell (`llm-providers-management.html:128`). Model slugs now render correctly instead of `undefined`.
- Cleanup: removed unused `BadgeColor` and `RippleModule` from `LlmProvidersManagement` component imports; the `BadgeColor is not used` Angular warning is resolved.
- Verification: `npx ng build` from `frontend` passes. Remaining warnings are pre-existing `explorer.css` and `chat-message.css` budget warnings only.
- No architecture diagram update was needed because this was data-binding and import cleanup only.

## 2026-06-20 LLM Test Results Retention Plan

- Added `documents/features/todo/llm-model-test-results-retention-plan.md`.
- Planning decision: keep the retention cleanup in the existing LLM/provider scheduled maintenance path instead of introducing a new module for a single table cleanup.
- Planning decision: default retention is 30 days and the proposed cleanup cadence is weekly at 02:00 server time.
- No architecture diagram update was needed because this session created a plan only and did not change runtime architecture.

## 2026-06-11 Global Icon Tile

- Added global `.icon-tile` as the shared padded-background icon treatment for dashboard metrics and design-system headings.
- Decision: keep the padded icon treatment in global utilities instead of repeating `section-heading > .ph` styling in feature CSS.
- Verified `npm.cmd run build` from `frontend` passes. Remaining warnings are existing unrelated warnings: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- No architecture diagram update was needed because this was styling only.

## 2026-06-11 Theme Switch Transition Block

- Added a temporary transition blocker to `frontend/src/app/core/services/theme.service.ts` so theme changes do not mix instant elements with animated `background-color` / `color` transitions.
- `ThemeService.applyMode(...)` now adds `no-transitions` before updating `data-theme` and removes it after two nested `requestAnimationFrame(...)` callbacks.
- Added `.no-transitions, .no-transitions * { transition: none !important; }` to `frontend/src/app/assets/styles/_reset.css`.
- Verified `npm.cmd run build` from `frontend` passes. Remaining warnings are existing unrelated warnings: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- No architecture diagram update was needed because this was local theme-toggle behavior only.

## 2026-06-11 Design Language Glassmorphism Upgrade

- Executed `documents/features/todo/DESIGN_UPGRADE_TASK.md`.
- Added theme-level glass tokens to `frontend/src/app/assets/styles/_variables.css` and increased ambient glow strengths for the new design language.
- Updated global visual primitives: `.glass-effect`, `.card`, `.metric-card`, `.table-container`, `.logo`, `.badge`, `.error-badge`, inputs, and `.primary-btn.filled`.
- Updated `body::before` in `frontend/src/app/assets/styles/_reset.css` to use the larger ambient ellipse gradients.
- Kept `_animations.css`, `_typography.css`, `_primeng-overrides.css`, component TS files, and component HTML files untouched as requested.
- Verified `npm.cmd run build` from `frontend` passes. Remaining warnings are existing unrelated warnings: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Moved the completed task file to `documents/done/design-language-glassmorphism-upgrade-task.md`.
- No architecture diagram update was needed because this was global styling/design-language maintenance only.

## 2026-06-11 Design System Token Upgrade

- Rewrote `frontend/src/app/assets/styles/_variables.css` with the audited WCAG-oriented token system from `documents/features/todo/TASK.md`.
- Token decisions: dark and light surfaces are now solid instead of translucent, text secondary colors are stronger, borders are more visible, hover backgrounds use stronger `--primary-30` values, and the typography scale now uses a `15px` `--font-size-md` baseline.
- Added the missing shared tokens called out by the task: `--radius-xs`, `--radius-pill`, `--color-surface-elevated`, `--color-text-muted`, `--color-text-disabled`, `--color-border-strong`, warning tokens, status background/border tokens, elevated shadows, and glow background tokens.
- Updated `frontend/src/app/assets/styles/_reset.css` so `body::before` uses `--color-primary-glow-bg` and `--color-secondary-glow-bg` with full opacity.
- Verified no missing CSS custom property references were found across app CSS and no old transparent surface values remain under `frontend/src/app/assets/styles`.
- Verified `npm.cmd run build` from `frontend` passes. Remaining warnings are existing unrelated warnings: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Moved the completed task file to `documents/done/design-system-token-upgrade-task.md`.
- No architecture diagram update was needed because this was global styling/token maintenance only.

## 2026-06-11 Explorer CSS Budget Fix

- Removed duplicate PrimeNG sort-icon overrides from `frontend/src/app/features/explorer/explorer.css`; the equivalent global rules already live in `frontend/src/app/assets/styles/_utilities.css`.
- Removed a redundant `NEW` badge hover background declaration in Explorer CSS.
- Verified `npx ng build` from `frontend` now passes again. Remaining output is warnings only: unused `AccessToDirective`, `chat-message.css` warning budget, and `explorer.css` warning budget at 7.97 kB.
- Fixed Explorer price sorting by enabling PrimeNG `customSort` and comparing `price`/`catalogPrice` through numeric values extracted from their display strings.
- Verified `npx ng build` from `frontend` after the Explorer numeric sort fix.
- Attempted the Angular 22 upgrade with `npx ng update @angular/core@22 @angular/cli@22`; Angular CLI 22 stopped before changing files because the current Node runtime is `v24.13.0`, below the required `24.15.0+` / `22.22.3+`.
- Completed the Angular 22 frontend upgrade after Node was updated to `v24.15.0`.
- Updated Angular packages to `22.0.1` and TypeScript to `6.0.3`.
- Applied Angular 22 migrations. The official migration had to be resumed with a temporary `frontend/app -> frontend/src/app` junction because the CLI generated migration paths without the `src/` prefix; the junction was removed after migration.
- Angular added explicit `ChangeDetectionStrategy.Eager` to all app components, added `withXhr()` to `provideHttpClient(...)`, added `$safeNavigationMigration(...)` wrappers in affected templates, and added extended diagnostic suppressions in `frontend/tsconfig.app.json`.
- Updated the stale `frontend/src/app/app.spec.ts` title test to assert the current root `router-outlet`.
- Verified `npx ng test --watch=false` and `npx ng build` after the upgrade.
- Recorded a remaining dependency risk: `primeng@21.1.8` still declares Angular 21 peer dependencies, and npm does not currently publish a PrimeNG 22 package.
- Marked the completed/reviewed Angular 22 update-guide checklist items in `documents/angular-22-update-guide.md`.
- Removed the temporary Angular 22 `$safeNavigationMigration(...)` helpers from `dashboard`, `main-sidebar`, and `users-management` templates, replacing them with normal Angular 22 safe-navigation expressions.
- Verified the cleanup with `rg '$safeNavigationMigration' frontend/src`, `npx ng test --watch=false`, and `npx ng build`.
- Moved the completed Angular 22 upgrade guide to `documents/done/angular-22-update-guide.md`; no architecture diagram update was needed.
- Completed AiFormat sanitizer Phase 2/3 in `frontend/src/app/core/directives/ai-format.directive.ts`.
- Added private GenUI HTML/CSS sanitization before raw component rendering: dangerous tags are removed, `:root`/`html`/`body` blocks and CSS custom property declarations are stripped, unscoped global selectors are blocked, scoped/local selectors and `@keyframes` are preserved.
- Added focused directive specs covering sanitizer behavior and verified with `npx ng test --watch=false` plus `npx ng build`.
- Completed and closed the AiFormat directive improvement plan.
- Added `renderSkeletonOnce()` for skeleton DOM rendering, centralized Hebrew role labels, preserved English role support, and expanded directive specs for component-stream detection, CSS code fences, role badge rendering, and markdown/table behavior.
- Moved the plan to `documents/done/ai-format-directive-improvement-plan.md`; no architecture diagram update was needed.
- Added `documents/features/todo/chat-stop-stream-button-plan.md` for changing the chat submit button into a stream stop/cancel button during loading.
- Documented that frontend cancellation can use the existing `ChatService.sendMessageStream(...)` Observable teardown, which already calls `AbortController.abort()`.
- Cleaned documentation audit folder: kept only `css-conventions-component-audit.md` in `documents/audit/`, moved `backend-llm-documentation-audit.md` to `documents/done/`, and deleted the Phosphor reference document.
- Completed chat stop-stream behavior: the chat submit button now switches to a stop button during loading, unsubscribes from the active stream, and aborts the underlying fetch through the existing `ChatService.sendMessageStream(...)` teardown.
- Completed chat message actions: each rendered chat message can request delete, send again, copy, or edit through a typed child-to-parent event.
- Added persistent message deletion endpoint `DELETE /admin-agent/sessions/:sessionId/messages/:messageId`; backend verifies session ownership and message membership, then deletes the selected message and later messages in that session.
- Regenerated `backend/swagger-spec.json` so the admin-agent tool catalog includes the new message deletion operation.
- Updated `documents/architecture-diagram.md` to document stream cancellation and persistent chat message action deletion flow.
- Verified after the chat changes with `npx ng test --watch=false`, `npx ng build`, and `npm.cmd run build`.
- Closed the stale Explorer todo entry by moving `documents/features/todo/explorer-plan.md` to `documents/done/explorer-source-reference.md`; it is now treated as source/reference material, not an active plan.
- Removed borders from chat message action buttons and verified the frontend build; no architecture diagram update was needed because this was a local styling change.
- Updated Angular 22 baseline documentation in `frontend/README.md`, `AGENTS.md`, `CLAUDE.md`, and `C:\Users\porat\.claude\rules\angular-rules.md`.
- Clarified that the project uses explicit Angular change detection and preserves current behavior with `ChangeDetectionStrategy.Eager`; the old strict-zoneless wording was removed from the local Angular rules.
- No architecture diagram update was needed because this was documentation and agent-rule metadata only.
- Hardened `C:\Users\porat\.claude\rules\angular-rules.md` for the local coding agent by replacing the loose prose with a strict checklist structure and removing a stale embedded task comment.
- Created user-level reusable prompt snippets for the local coding agent under `C:\Users\porat\.claude\prompts\code-agent\`, covering default work, Angular, NestJS, CSS, review, bugfix, docs update, and commit-message workflows.
- Tightened the Angular local-agent prompt after a settings-page dry run: clear scoped tasks now proceed automatically after the pre-implementation report, static pages do not need `PageStates`, and frontend verification is standardized as `npx ng build` from `frontend/`.
- Added stricter Angular Definition of Done gates to the local-agent prompt/rules and project agent guides after the settings-page dry run showed that route/build success alone was not enough to prevent broken Hebrew text and weak CSS/UI completion.
- Added an explicit static-page shell rule to the local-agent prompt/rules and project guides: static pages do not need `PageStates`, but they must still use global page shell classes instead of custom wrappers or unnecessary component CSS.
- Corrected the static-page shell rule to use `glass-effect card` for generic placeholder content and reserve `empty-state` for real empty data states.
- Tightened Hebrew safety rules after a local-agent failure reversed Hebrew strings; local agents must now copy exact approved Hebrew strings and verify them with `Select-String -SimpleMatch` instead of generating or visually reordering Hebrew.
- Rolled back the over-strict Hebrew prompt/rule additions after the user clarified Hebrew authoring is fine; retained only lightweight mojibake safeguards and kept the focus on page shell/CSS/Definition-of-Done quality gates.
- Tightened static page guidance to require copying the exact standard page shell structure because the local agent understood generic classes but still improvised the page layout.

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

## 2026-06-11

- Design token decision: removed the duplicate dedicated rating color token; rating UI uses the existing semantic `--color-warning` token.
- Design System decision: keep semantic status colors in a separate showcase section grouped by state, while the main palette focuses on constants, brand, surfaces, text, inputs, and glass tokens.
- Design token decision: light mode now mirrors the dark-mode glassmorphism language with teal as the primary color, while dark mode remains unchanged.
- Updated the Design System showcase CSS so color-token panels size to their own content, long token names wrap cleanly, and copy labels no longer overlap token text.
- Added global breakpoint design tokens (`--xs`, `--sm`, `--md`, `--lg`, `--xl`) to `_variables.css`, matching the documented responsive token system.
- No architecture diagram update was needed because this was local CSS/design-token maintenance only.
- Added a dedicated PrimeNG override stylesheet, imported from `frontend/src/styles.css`, and moved the existing PrimeNG datatable sort-icon overrides out of `_utilities.css`.
- Decision: future PrimeNG vendor overrides should go in `_primeng-overrides.css` instead of generic utilities or feature component styles.
- Migrated the Users management table to PrimeNG `p-table`, using the Explorer table pattern for global filtering, sortable headers, sort icons, scrollable layout, and empty-message rendering.
- Decision: Users table styling should rely on the shared PrimeNG override stylesheet rather than adding a Users component stylesheet.
- Fixed the Users search input placeholder text so it refers to users instead of chat.

- Added the full DB-backed provider/model management plan in `documents/features/todo/provider-and-llm-db-plan.md`.
- Planning decision: keep existing chat-facing LLM endpoints response-compatible while moving admin-managed provider/model definitions to DB.
- Planning decision: treat environment variables as bootstrap/fallback configuration after DB provider management is introduced.
- Planning decision: scheduled LLM model tests should run every 6 hours by default, with manual runs from Settings and persisted test results used for model ranking.
- Planning decision: Ollama installed models should remain runtime-discovered; DB stores Ollama metadata and historical test results but not installation truth.
- Added individual terpene filter buttons and country flag rendering to the Explorer table UI.
- Fixed the Explorer network-capture path so `isNew` no longer depends only on a missing Jane `is_new` JSON field; it now also maps visible `חדש!` DOM markers back to captured JSON products by Hebrew/English name.
- Completed the light-mode character upgrade by replacing only the `[data-theme="light"]` token block in `_variables.css`.
- No architecture diagram update was needed because this was global design-token styling only.
- Styling decision: LLM providers icon actions now reuse the global `icon-only` button convention instead of maintaining a component-local `.icon-btn`; the Add Model action uses the existing `transparent-btn sm` button pattern instead of a local `add-model-btn`.
- No architecture diagram update was needed because this was CSS/HTML styling only.
