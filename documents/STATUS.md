# Project Documentation Status

Last updated: 2026-08-01

## 2026-08-01 Session — Tooltip Effect Tag Font Size

- Completed: reduced `.tooltip-card-effect-tag` font size from `var(--font-size-xs)` (12px) to `9px` in `tooltip.css`
- Files: `frontend/src/app/components/shared/tooltip/tooltip.css`
- Current state: CSS-only change, no verification performed
- Next: visually confirm tooltip effect tags in strain-hunter

## 2026-07-28 Session — CSS Animation Audit, Page Layout Unification, Drag-and-Drop Fix

- Completed: CSS animation audit for all feature CSS files (#16-52) with `find-animation-opportunities` and `emil-design-eng` skills
- Completed: `:active scale(0.97)` on buttons/interactive elements in multiple files
- Completed: GPU-accelerated `scaleX()` replacing `width` transitions on progress bars (system-status, database-monitor-settings, database-storage-monitor, media-studio)
- Completed: grid-rows expand/collapse animation on idea-card, `.preview-bar-fill` RTL transform-origin fix
- Completed: Settings Design System tab (tab value="3", Hebrew label "מערכת עיצוב")
- Completed: matching-preferences-drawer reset buttons — all3 changed to `button icon-only sm transparent-btn reset-btn`
- Completed: page layout unification — all3 composer pages use `page-content flush`, removed duplicate layout overrides from `chat.css` and `media-studio.css`
- Completed: drag-and-drop fix — drag counter pattern, overlay moved to composer-area, z-index/background fixes
- Completed: auto-focus for ideas-form domain input and media-studio textarea
- Files: `_layout.css`, `_composer.css`, `chat.html`, `chat.css`, `chat.ts`, `media-studio.html`, `media-studio.css`, `media-studio.ts`, `ideas-form.html`, `ideas-form.ts`, `settings.ts`, `settings.html`, `matching-preferences-drawer.html`, `matching-preferences-drawer.css`
- Current state: no build verification performed this session (CSS/HTML/TS changes only)
- Next: pick up active plans from `documents/features/todo/`

## 2026-07-26 Session — Drag-and-Drop, Drop Overlay, Ideas Card — All Reverted

- Attempted fixes for drag-and-drop flicker, drop overlay blur, model capability errors, and idea card z-index/blur issues.
- ALL changes were reverted — original code was working correctly.
- Key lesson: `.glass-effect`'s `::before` pattern is fragile; do not modify `isolation`, `z-index`, or `backdrop-filter` without testing all adjacent cards.
- Files touched (all reverted): `chat.ts`, `chat.html`, `media-studio.ts`, `media-studio.html`, `_composer.css`, `idea-card.css`, `ideas-grid.html`
- Current state: Clean — no uncommitted changes. All features working.
- Next: Tomorrow — investigate glass-effect artifacts slowly and carefully.

## 2026-07-25 Session — CSS Cleanup: Labels, Compact Inputs, Number Steppers

- Consolidated duplicated CSS patterns across composer inputs.
- Moved bare `label` styles to `_typography.css` with `color: var(--color-text-primary)`. Removed duplicates from `_forms.css` and `_composer.css`.
- Created global `.compact-input` class with `xs`/`sm`/`md`/`lg` variants in `_forms.css`. Removed duplicated input styles from `_composer.css` and `media-studio.css`.
- Added global number spinner hiding for all `input[type='number']` in `_forms.css`.
- Created `.number-stepper` CSS with custom `ph-caret-up`/`ph-caret-down` buttons. Added increment/decrement methods to `IdeasForm` and `MediaStudio`.
- Moved `media-mode-toggle` inside `composer-field`, made it smaller, positioned at top-left.
- Files: `_typography.css`, `_forms.css`, `_composer.css`, `media-studio.css`, `media-studio.html`, `media-studio.ts`, `ideas-form.html`, `ideas-form.ts`.
- Verification: CSS-only changes, no logic to test. No build verification performed.

## 2026-07-22 Session — Main Sidebar Chat History Dropdown Fix

- Fixed 3 issues with the chat history dropdown in the main sidebar: missing blur/glass-effect, feather button not navigating, and click event bubbling to the parent chat button.
- Root cause: `<app-dropdown>` was nested inside `<button routerLink="/chat">` — invalid HTML that breaks `backdrop-filter` and causes event bubbling.
- Fix: moved `<app-dropdown>` outside the chat `<button>` into a `.nav-item-chat` wrapper div. Chat button and feather button are now siblings.
- Added `.nav-item-chat` CSS with `::ng-deep` to override the dropdown's `width: 100%` / `display: grid` and prevent layout breakage.
- Added `$event.stopPropagation()` to the feather button click to prevent bubbling to `routerLink="/chat"`.
- Added `appTooltip` to the feather button with `TooltipDirective` import.
- Files: `main-sidebar.html`, `main-sidebar.ts`, `main-sidebar.css`.
- Verification: `npx ng build` passes.

## 2026-07-22 Session — CSS Overriding Remediation

- Remediated all 27 violations from the CSS overriding audit across Rule A (exact match), Rule B (suspicious suffix), and Rule C (duplicate) categories.
- Applied principle: structural overlap (display/align/gap) + visual differences → merge with modifier; no structural overlap → independent name.
- Created 6 new global modifiers: `.row-subtitle--flex`, `.badge-compact`, `.chip-neutral`, `.chip-like`, `.chip-love`, `.chip-avoid`.
- Renamed 8 misleading class names: `.status-indicator` → `.status-dot`, `.count-badge` → `.count-value`, `.detail-chip` → `.detail-tile` (×2), `.db-chip` → `.db-stat-pill`, `.summary-card` (db) → `.summary-row`, `.forecast-card` → `.forecast-tile`.
- Merged 2 components into globals: `.strain-penalty-badge` → `.badge.badge-danger.badge-compact`, `.terpene-chip`/`.genetics-chip` → `.chip.chip-${state}`.
- Deleted 10 duplicate rules: `.fade-in` ×5, `.form-field`, `.metric-card`, `.panel-header.compact`, `.panel-title.muted`, `.row-subtitle` (local).
- Kept 3 as documented false positives: `.flag-badge`, `.col-expand`, `.summary-card` (weather-summary).
- Bonus fixes: "Add Model" button styling, `.panel-header.compact` justify-content.
- Verification: `npx ng build` passes. Summary at `documents/done/css-overriding-search-remediation.md`.
- Remaining: visual regression check across 8 pages, then git commit.

## 2026-07-22 Session — Ideas Page Chat-Style Layout

- Restructured `/ideas` to match the chat page layout: full-height flex column with a scrollable middle region (header + results) and a bottom-docked composer.
- **Global composer shell:** created `frontend/src/app/assets/styles/_composer.css` with `.composer-area`, `.composer-field`, and `.composer-submit` rules. Connected from `styles.css` after `_filters.css`. Both chat and ideas now consume the same shell, so future "composer UIs" (admin confirmations, etc.) reuse the same focus-glow and circular send/stop button.
- **Chat updated to use the global classes:** `chat.html` swaps `chat-input-area` / `chat-prompt-field` / `chat-send-btn` for `.composer-area` / `.composer-field` / `.composer-submit`. The moved rules were removed from `chat.css`; chat-specific bits (image preview, drag overlay, history loader, prompt-actions row) stay local.
- **Ideas page restructure:** `ideas-page.html` now wraps everything in `page-content.ideas-root` with a `flex: 1; overflow-y: auto` `.ideas-scroll` region for the header + `@switch` body. `<app-ideas-form />` is moved out of the top flow and renders at the bottom inside `.composer-area`. `ideas-page.css` lost `.ideas-layout` and gained the dock rules.
- **Ideas form restructure:** `ideas-form.html` drops the `glass-effect card` wrapper and renders the composer-field structure: domain `<input>` on top, a `.composer-meta-row` with the count slider on the left and model `<p-select>` + circular submit/stop on the right. The submit/stop button uses the global `.composer-submit` styling and toggles to `ph-stop` while loading. `ideas-form.css` lost the duplicated card/slider/model/submit rules and gained only the local composer-meta-row layout.
- **Stop-while-loading support:** `IdeasStore.stopGenerating()` unsubscribes the SSE subscription (which already aborts the fetch via `controller.abort()`), clears `loading`, and sets `partial: true` with a Hebrew "היצירה הופסקה על ידי המשתמש" message when partial results exist. The error path now filters `AbortError` so clean stops don't surface as a page error. `IdeasForm.onStopGenerate()` wires the button click to the store. `canGenerate` computed disables the submit when domain is empty.
- Verification: `npx ng build` from `frontend` passes with no new warnings (only pre-existing strain-hunter and initial-bundle budget warnings remain). `npx ng test --watch=false`: 120/123 pass; 3 failures are pre-existing (`app.spec.ts` × 2, `currency-card.component.spec.ts` × 1). Corruption scan on touched files is clean.
- No backend changes. No architecture diagram update needed (UI layout only).
- Files touched: `frontend/src/app/assets/styles/_composer.css` (new), `frontend/src/styles.css`, `frontend/src/app/features/chat/chat/chat.html`, `frontend/src/app/features/chat/chat/chat.css`, `frontend/src/app/features/ideas/ideas-page/ideas-page.html`, `frontend/src/app/features/ideas/ideas-page/ideas-page.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.html`, `frontend/src/app/features/ideas/ideas-form/ideas-form.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.ts`, `frontend/src/app/core/store/ideas.store.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- Decisions made: lift the shared shell to a global partial rather than duplicating per-component; keep the model `<p-select>` template component-local (already shared via `LlmProviderStore.chatModels`); use the existing `controller.abort()` Observable teardown path for stop support instead of adding a new API.
- Follow-up: ideas empty state now mirrors the chat's `.empty-chat-state` pattern (centered teal `.ph.xl` icon + `h3.title` + `.subtitle`, no card chrome). The `PageStates.Empty` block swapped from `page-state empty-state` to a new `.empty-ideas-state` class in `ideas-page.css`. Error state still uses the global `.page-state.error-state` because the chat page has no equivalent error UI. Build passes, corruption scan clean.
- Follow-up: ideas count input changed from `<input type="range">` to `<input type="number" min="1" max="10" step="1">` per user request. The redundant `<span class="composer-count-value">{{ store.count() }}</span>` next to the input was dropped (the number input shows the value natively). `ideas-form.css` lost the `.composer-count input[type='range']` and `.composer-count-value` rules and gained a new `.composer-count input[type='number']` rule with token-only chrome (64px width, surface bg, border, focus glow). Build passes, corruption scan clean.

## 2026-07-21 Session — Business Idea Generator Closed

- Verified the already-implemented business idea generator end-to-end.
- Backend: `IdeasModule` wired in `AppModule`, `ThrottlerModule.forRoot` with 2 named throttlers + `IdeasThrottlerGuard` as `APP_GUARD`. Controller exposes `POST /ideas/generate` and SSE `GET /ideas/generate/stream`. Service runs 3-phase agentic loop (SearXNG signal gathering → LLM idea generation → per-idea validation) with 60s timeout + partial results.
- Frontend: `IdeasPage` with `PageStates`, `IdeasForm` (domain + count slider), `IdeasProgress` (3-segment phase bar via SSE), `IdeasGrid` + `IdeaCard` (score badge, grounded/ungrounded tag, expandable details). Store consumes SSE stream with `AbortController`.
- Verification: backend build passes, frontend build passes (pre-existing warnings only), mojibake scan clean.
- Moved `business-idea-generator-plan.md` and `chat-idea.md` to `documents/done/`.
- Active todo now: `dynamic-pharm-scraping-plan.md` and `provider-and-llm-db-plan.md`.
- Architecture diagram: needs update — new `IdeasModule` and ideas UI flow.

## 2026-07-20 Session — Loader Shimmer Implemented (Phases 1, 2, 3, 5, 6)

- Implemented Phases 1, 2, 3, 5, 6 of `documents/features/todo/loader-shimmer-plan.md`.
- **Phase 1:** `@keyframes shimmer-sweep` + RTL variant in `_animations.css`. `.shimmer`, `.shimmer--sm/md/lg`, `.shimmer-text` in `_utilities.css` with RTL, reduced-motion, and token-first gradient.
- **Phase 2:** Chat step `loading-dots` → `<span class="shimmer-text">טוען...</span>` + spinner icon. Dead `.response-loader` removed. `responseLoaderPulse` keyframe removed.
- **Phase 3:** Strain-hunter `.dots-loader` → `<span class="shimmer shimmer--sm">`. `.loading-dots`, `.dots-loader`, `dot-bounce` keyframe removed.
- **Phase 5:** Text shimmer on `טוען...` in login/register, `מבצע העשרה...` in strain-hunter-settings (×2), `טוען נתוני מסד נתונים...` in database-monitor-settings.
- **Phase 6:** Grep clean for obsolete classes. Build passes. Tests 120/3 (pre-existing).
- **Phase 4 (`.custom-loader` rebrand) remains deferred.**
- Architecture diagram: no update needed (CSS-only, no new components or endpoints).

## 2026-07-19 Session — Agnes GenUI render blocks + video frame-continuation

- Made Agnes image/video results render inline in chat instead of markdown links. Added `RenderSpecType.AgnesImage` + `AgnesVideo`, schemas (`image.render-spec.ts`, `video.render-spec.ts`), and `render-spec.service.ts` mappings for `LlmController_generateImage`, `createVideo`, `getVideo`, and `extendVideo`. Frontend: new `agnes-image-card` and `agnes-video-card` blocks registered in `render-host.component.ts`.
- Image model default: `LlmController.resolveCapabilityModel` fallback now picks the highest-version active capability model (`agnes-image-2.1-flash` over `2.0-flash`) when `modelId` is omitted; both stay selectable. The `generateImage` controller logs the resolved model.
- Video polls to completion: `LlmClientService.createVideoTaskAndWait` submits then polls `getVideoResult` until `completed` (150s timeout), so `createVideo` returns a real `.mp4` URL — no more hallucinated links.
- Frame-continuation: added `ffmpeg-static` dependency and `LlmClientService.extendVideo` — downloads the source video (by `sourceVideoId` or `sourceVideoUrl`), extracts the last frame via ffmpeg (`-sseof -1 -frames:v 1`), base64-encodes it, and submits an image-to-video task with that frame. New `POST /llm/video/extend` (`ExtendVideoDto`, tool `LlmController_extendVideo`), render mapping → `AgnesVideo`. Verified Agnes accepts base64 image input (no external hosting needed). Live test confirmed inline `agnes-video` card with real `.mp4`.
- Verification: backend `npm run build` passes; frontend `npx ng build` passes (pre-existing unrelated warnings only).
- Architecture diagram updated (Agnes provider, multimodal flow, ffmpeg frame-extract, render-block path, notes).

## 2026-07-18 Session — Agnes AI Multimodal Plan Implemented (Phases 1-6)

- Implemented the full Agnes AI multimodal plan: chat was unreachable through the DB path because the seed keyed the provider `agnes` while runtime looked up `agnes-ai`. Fixed the seed to key `agnes-ai` (apihub baseUrl) with an idempotent update-in-place reconciliation; added a `capability` enum column to `LlmModelEntity`.
- Capability guards: chat path and the nightly/test health checks now reject or skip non-text models, so image/video models no longer pollute the test-results table.
- Added image generation (`POST /llm/image/generate`) and async video generation (`POST /llm/video/generate`, `GET /llm/video/:videoId`) via raw `fetch` against the Agnes API, with full Swagger decorators.
- Frontend `LlmModel` now carries `capability` (dropped stale `isDefault`); chat dropdown filters to `capability === 'text'` via `LlmProviderStore.chatModels`.
- Verification: `npm.cmd run build` (backend) passes; `npx ng build` (frontend) passes with pre-existing unrelated warnings only.
- Plan moved to `documents/done/agnes-ai-multimodal-plan.md`. Remaining manual work: live end-to-end image/video generation with `AGNES_API_KEY` and a visual chat-dropdown check.

## 2026-07-18 MCP Bridge — Phase 4 Complete, Hebrew UI

- **Phase 4 (Remove WeatherModule):** Deleted `backend/src/modules/weather/` (controller, service, module, 4 DTOs). Removed `WeatherModule` from `AppModule`. Removed old `WeatherController_getWeather`/`getForecast` render-spec mappings. Updated `render-spec.service.spec.ts` (error tests now use Swagger tools). Verified 92/92 tests pass.
- **Hebrew UI labels:** Weather current card all labels translated to Hebrew. Weather forecast card location stripped of lat/long. Currency card "Exchange Rates" → "שערי חליפין", "Base:" → "בסיס:".
- **MCP tool Hebrew descriptions:** Added in `agent-tool-executor.service.ts` — `get_current_conditions` → "מקבל מזג אוויר נוכחי", `get_forecast` → "מקבל תחזית מזג אוויר", `check_service_status` → "בודק סטטוס שירות".
- **Architecture diagram:** Updated to remove WeatherModule, add McpBridgeModule, show MCP dispatch branch in tool execution flow.
- **Live test:** Both `get_forecast` and `get_current_conditions` confirmed dispatching via MCP (no `[GET]` logs). Weather cards render with real data.
- **Feature complete.** No further action required.

## 2026-07-18 MCP Bridge — Phases 1-3 Complete

- **Phase 1 (Bridge infra):** Created `mcp-bridge.config.ts` (MCP_SERVERS registry, resolveLaunchSpec), `mcp-server-client.ts` (SDK Client + StdioClientTransport), `mcp-bridge.service.ts` (getTools/hasTool/callTool), `mcp-bridge.module.ts`. SDK import fixed: Node 24 doesn't auto-append `.js` for exports-map-resolved paths; resolved via `@modelcontextprotocol/sdk/client` + navigate to `stdio.js`.
- **Phase 2 (Wire into agent):** Added `source` field to parser's `LlmToolSchema`. MCP tools merged in `AdminAgentService.getTools()`. MCP dispatch branch in `AgentToolExecutorService.executeToolCall` before `getEndpoint`. `McpBridgeModule` imported in `AppModule` and `AdminAgentModule`.
- **Phase 3 (Render specs):** Added `source` to `ToolRenderMapping`. `buildRenderSpec` checks JSON error envelope for MCP source. Two MCP weather mappings added (`get_current_conditions` → `WeatherCurrent`, `get_forecast` → `WeatherForecast`) with markdown regex transforms. 7 tests passing.
- **Tool names:** Actual names from `@dangahagan/weather-mcp` are `get_current_conditions` (not `get_current_weather`) and `get_forecast`.
- **Output format:** MCP returns markdown text, not structured JSON. Transforms parse via regex.
- **Known gap:** MCP `isError` responses not detected in v1 (documented in plan).
- **Verification:** 94/94 backend tests pass (1 pre-existing `app.controller.spec.ts` fail). `tsc --noEmit` clean. Backend boots successfully.
- **Next:** Phase 4 (remove WeatherModule) gated behind manual verification. Phase 5 (docs).

## 2026-07-15 Session (continued — Remove LLM Prose Duplication of Card Data)

- After the render-spec fix landed, the weather forecast card rendered correctly with 5 day cards, but the LLM was still producing a duplicate markdown table of the same data above the card. User feedback: "הטבלה הראשונית מיותרת" (The initial table is redundant).
- Root cause: the system prompt in `system-context.constant.ts` did not tell the LLM that structured tool results are auto-rendered as visual cards. The LLM reasonably reproduced the data in prose as a "just in case" fallback.
- Fix: added a `VISUAL RESPONSE RULE` block to `SYSTEM_CONTEXT_BASE` in `backend/src/modules/admin-agent/constants/system-context.constant.ts`. The rule:
  - Lists the 11 render-bearing tool types by name so the LLM has an explicit enumeration (weather forecast, currency conversion, users table, analytics chart, system status, database storage, chat sessions, transcript, LLM test results, delete confirmation, register form).
  - Instructs the LLM to write only a short prose summary that adds context the visual cannot show.
  - Forbids markdown tables, bullet lists, or inline lists of the same numbers/rows the card will show.
  - Allows inline reproduction only when the user explicitly asks for raw text-only output (screen reader, copy-paste).
- Rule is generic and applies to all render-bearing tools without per-tool customization.
- Verification: `npm.cmd run build` from `backend` passes. No new code tests were added because the change is a system-prompt instruction; the live verification requires a dev server, JWT, and LLM credentials.
- Files touched: `backend/src/modules/admin-agent/constants/system-context.constant.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.

## 2026-07-15 Session (continued — RenderSpec Data Mapping Fix)

- Fixed the `RenderSpecService` data mapping bug that was causing all 16 render components to receive empty data and fall back to LLM prose rendering (e.g. weather forecast showing as a markdown table from the LLM instead of a 5-day card list).
- Root cause: every domain controller wraps its response in `ServiceResultContainer<T>` (shape: `{ success, message, result: T, error? }`), but the `TOOL_RENDER_MAPPINGS` transforms in `render-spec.service.ts` were reading from `data` directly, so all fields resolved to `undefined`. Zod (everything `.optional()`) accepted the empty candidate, and the service yielded a `render` event with empty data.
- Secondary bug: several transforms referenced wttr.in raw field names (`temp_C`, `FeelsLikeC`, `weatherDesc?.[0]?.value`) instead of the DTO field names (`tempC`, `feelsLikeC`, `description`). Even after unwrapping, values would be `undefined`.
- Fix: rewrote all 16 transforms to (a) unwrap `data.result` for `ServiceResultContainer`-wrapped endpoints, (b) handle the few admin-agent endpoints that return data directly (`getSessions` array, `getSessionMessages` `{messages, hasMoreImages}`), (c) map DTO field names to the contract names the Zod schemas and Angular components expect. Added `toNumber`/`toBool` helpers for DTOs that return string-encoded numerics/booleans.
- Updated 5 test fixtures in `render-spec.service.spec.ts` to wrap input as `ServiceResultContainer` so tests actually exercise the production unwrap path.
- Verification: backend build pass, backend tests 60/60 pass (1 pre-existing `app.controller.spec.ts` TS error), frontend build pass with existing warnings, frontend tests 121/123 pass (2 pre-existing `app.spec.ts` `MessageService` failures).
- Files touched: `backend/src/modules/admin-agent/render-spec/render-spec.service.ts`, `backend/src/modules/admin-agent/render-spec/render-spec.service.spec.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- Next: ~~manually test in running app — ask "מה תחזית מזג האוויר ל-5 ימים בתל אביב" — should show `WeatherForecastComponent` with 5 day cards, not the LLM prose table. If confirmed, move `genui-to-json-migration-plan.md` to `documents/done/`.~~ **Done.** User screenshot confirms `WeatherForecastComponent` renders 5 day cards (רביעי 32°/25° ☀️, חמישי 35°/28° ☁️, שישי 35°/29° 🌧️, שבת 33°/27° ⛈️, ראשון 31°/24° ☀️) with humidity and "Tel Aviv" location label. `genui-to-json-migration-plan.md` moved to `documents/done/`.

## 2026-07-15 Session (GenUI → JSON Migration — Phases 1 & 2)

- Completed Phase 1 (Backend) and Phase 2 (Frontend) of `genui-to-json-migration-plan.md`.
- **Phase 1 Backend**: Installed `zod`. Created `render-spec/` directory with 12 files: `RenderSpecType` enum (16 types), `RenderSpec` union type, 9 domain render spec files with TypeScript interfaces + Zod schemas, `RenderSpecService` with `buildRenderSpec()` mapping 16 tool names, 17 unit tests. Added `renderSpec` column to `ChatMessage` entity. Updated `AdminAgentService` to yield `{type:"render"}` SSE events after tool execution and persist `renderSpec` to DB.
- **Phase 2 Frontend**: Created `RenderHostComponent` with `@switch` for all 15 render types. Updated `ChatStreamEvent` with `render` type. Added `IRenderBlock`, `renderBlocks`, `renderSpec` to `IChatMessage`. Updated `ChatMessage` with `pendingRenderBlocks` signal, `renderBlocksForDisplay` computed, `handleStreamEvent()`, and `resetLocalState()` parsing. Updated `chat-message.html` with render host blocks. Updated `Chat` component to handle `render` stream events.
- Compatibility layer: both old ` ```component ` and new `render` events work simultaneously.
- Verification: backend build pass, backend tests 60 pass (1 pre-existing fail), frontend build pass, frontend tests 47 pass (2 pre-existing fail).
- Plan active at `documents/features/todo/genui-to-json-migration-plan.md`.
- Next: Phase 3 — Build Angular Components (Batch 1: WeatherCurrentCard, CurrencyCard, DeleteConfirmCard, SessionCreatedCard, RoleChangeCard).

- Implemented full-stack database storage monitor per `documents/features/todo/database-storage-monitor-plan.md`.
- Backend: `DatabaseMonitorModule` with `GET /database-monitor/storage` endpoint, TypeORM `DataSource` query on `information_schema.tables`, DTOs with Swagger decorators, GenUI spec for donut chart + table cards.
- Frontend: `DatabaseMonitorSettings` component in Settings page (third tab "מסד נתונים"), donut chart via CSS conic-gradient, per-table bar chart, summary cards with loading/error/empty states.
- Tests: 7 backend service tests (sorted summary, empty tables, byte formatting, zero-division, percentOfDatabase, fixed query, null rowCount).
- Verification: backend test 25 pass (1 pre-existing fail), backend build pass, frontend build pass.
- Plan moved to `documents/done/database-storage-monitor-plan.md`.

## 2026-07-07 Session (GenUI Speed and Quality Improvement — Implementation)

- Implemented all five phases of `documents/features/todo/genui-speed-and-quality-improvement-plan.md`.
- Phase 1: Progressive streaming rendering in `AiFormat` — partial parser, sanitizers, rAF-throttled preview, stable preview host, no-DOM-thrash finalization.
- Phase 2: Smarter chat-message flushing — component mode flushes 12-24 char chunks at 0ms; prose keeps 18-35ms cadence; cursor hidden in component mode.
- Phase 3: Backend prompt trimming — `SYSTEM_CONTEXT` split into `BASE` + `GENUI`; GenUI gated on visual-trigger keywords; per-template boilerplate trimmed.
- Phase 4: Streaming efficiency — rAF-coalesced token buffering in `Chat`; `AiFormat` progressive preview uses stable preview host.
- Phase 5: Documentation — architecture diagram updated with streaming event flow; `[AdminAgentStream]` log line added; `documents/architecture/genui-streaming-protocol.md` created.
- Moved plan to `documents/done/genui-speed-and-quality-improvement-plan.md`.
- Verification: frontend tests 47 pass (2 pre-existing failures), frontend build passes, backend tests 25 pass (1 pre-existing failure), backend build passes.

## Document Areas

| Area | Path | Purpose | Status |
| --- | --- | --- | --- |
| Active feature plans | `documents/features/todo/` | Approved or planned feature work that still needs implementation. | Active |
| Incomplete notes | `documents/features/incomplete/` | Drafts, partial plans, or work that needs cleanup before execution. | Active |
| Completed plans | `documents/done/` | Plans that were implemented or closed. | Existing |
| Audit reports | `documents/audit/` | Reviews, scans, and verification reports. | Existing |
| Architecture | `documents/architecture-diagram.md` | Current Mermaid architecture diagrams. | Existing |

## Current Rule

New planning documents should go under `documents/features/todo/` unless they are audits, completed work, or incomplete drafts.

## 2026-07-04 Session (continued — Strain Hunter Settings Filter Fix)

- Completed: fixed the genetics and terpenes filter fields in `frontend/src/app/features/settings/strain-hunter-settings/`. `onGeneticsFilter`/`onTerpeneFilter` are now `(value: string)` to match `(ngModelChange)`, and `filteredGenetics`/`filteredTerpenes` are `computed()` signals so change detection reacts to filter changes.
- Completed: added styled empty messages inside both `<p-table>`s. Genetics uses `ph-magnifying-glass-minus`, terpenes use `ph-leaf`. Each empty message contains a Hebrew title and a Hebrew subtitle, and the colspans match the column counts (7 for genetics, 5 for terpenes).
- Completed: added a `.table-empty-state` rule to `strain-hunter-settings.css` that mirrors the global `.page-state.empty-state` visual language (icon + title + subtitle) using only `var(--token)` values, nested under the root selector.
- Verified: `npx ng build` from `frontend` passes; mojibake scan on touched files is clean.
- No architecture diagram update was needed because this was local Strain Hunter Settings UI filter behavior only.

## Recent Status

- Planned: `documents/todo/dynamic-pharm-scraping-plan.md` — minimal: loop over the existing `favoritePharm` array in the backend service, build per-pharm Jane URLs dynamically, cross-pharm merge by normalized `enName` into a `prices: Record<pharmQuery, ...>` shape, and render one price column per entry in `strain-hunter.html`. Adds a single `pharmQuery: string` column to `Strain` (no FK, no entity, no CRUD, no settings tab, no sticky columns).
- Completed: `documents/done/llm-model-test-results-retention-plan.md`.
  - Added `deleteOldTestResults(retentionDays = 30)` to `LlmProviderService` — uses TypeORM `LessThan` on `createdAt` to delete old rows, returns affected count.
  - Added `cleanupOldLlmModelTestResults()` cron to `LlmTasksService` with `@Cron('0 0 2 * * 0')` (Sunday 02:00 server time), injecting `LlmProviderService`. Logs start, cutoff, and deleted row count. Errors are isolated to the cleanup job.
  - No new module wiring needed — `LlmProviderModule` already exports `LlmProviderService` and `LlmModule` already imports it.
  - Added `llm-provider.service.spec.ts` with 5 tests: `LessThan` operator verification, cutoff calculation accuracy, affected-count return, zero-affected handling, and custom retention.
  - Verified: `npm test` passes 25/25 (pre-existing `app.controller.spec.ts` FAIL unrelated); `npm run build` passes.
  - No architecture diagram update needed (scheduled task only, existing cron infrastructure).
- Cancelled: `documents/todo/google-search-plan.md` — Tavily fallback with Google Search not needed.
- Planned: `documents/features/todo/css-conventions-fix-plan.md` — converts 7 CSS audit findings into implementation tasks: global list-row pattern, input-shell pattern, card surface conversion, explicit transitions, hardcoded pixel tokenization, and nesting cleanup.
- Planned: `documents/features/todo/genui-progressive-streaming-rendering-plan.md` documents progressive frontend rendering for streamed GenUI `component` blocks in `AiFormat`, replacing skeleton-only streaming with safe partial HTML/CSS previews.
- No architecture diagram update was needed for this planning-only change; implementation must revisit the diagram only if it changes backend streaming protocol, event shape, or GenUI generation contract.
- Completed: `documents/done/llm-service-refactor-plan.md`.
- Rolled back: GenUI builder split and dedicated weather template experiment.
- Current GenUI source of truth: `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`.
- Verified: backend build passes after the rollback state.
- Completed: `documents/done/ai-format-directive-improvement-plan.md`.
- Candidate GenUI cleanup after AiFormat: larger backend prompt refinements can now assume frontend CSS/token protection exists.
- Completed: added protected `ExplorerModule`/`ExplorerController` for `ExplorerService`.
- Verified: backend build passes after the Explorer module addition.
- Completed: added Angular `Explorer` page with direct in-component API call and table rendering.
- Verified: frontend build passes after the Explorer page addition.
- Completed: updated `ExplorerService` to click dynamic product rows and extract structured strain genetics fields.
- Verified: backend build passes after the Explorer scraper update.
- Completed: moved Explorer source URL ownership to the backend and removed URL input from the client.
- Completed: Explorer page now loads data automatically on page entry.
- Verified: backend and frontend builds pass after the Explorer URL ownership change.
- Completed: fixed Explorer scraper selectors using the documented Jane table and expanded-row structure.
- Verified: backend build passes after the Explorer selector fix.
- Completed: added the selected product/commercial Explorer fields to the scraper payload and response DTO.
- Completed: removed redundant Explorer fields `fromPrice`, `thc`, and `cbd`.
- Verified: backend build passes after extending the Explorer payload.
- Completed: updated the Explorer page to use PrimeNG table sorting, global search, Hebrew page title, and Hebrew column headers.
- Verified: frontend build passes after the Explorer table update.
- Completed: replaced Explorer DOM row parsing with Jane `tiltan/` JSON API consumption and normalized response mapping.
- Verified: backend build passes after the Explorer Jane API integration update.
- Completed: fixed Explorer loader/error visibility for long or failed Jane API loads.
- Verified: backend and frontend builds pass after the Explorer UX fix.
- Completed: fixed frozen Explorer loader animation and added frontend/backend request timeouts.
- Verified: backend and frontend builds pass after the non-blocking loader fix.
- Completed: Explorer refresh no longer locks during loading; retry cancels the previous request and starts a fresh one.
- Completed: fixed missing Explorer rows where the Jane row had a `חדש!` ribbon before the real Hebrew name.
- Verified: backend build passes after the Explorer scraper name extraction fix.
- Completed: Explorer name column now stacks Hebrew name, English name, rating, and deal text in one cell.
- Completed: Explorer scraper now extracts visible row rating text.
- Verified: backend and frontend builds pass after the Explorer name-cell update.
- Completed: Explorer `NEW` indicator is now rendered inside the name cell and only when `isNew === true`.
- Completed: Explorer `catalogPrice` is now embedded inside the price cell with strikethrough instead of appearing as a separate column.
- Verified: frontend build passes after the Explorer table-cell updates.
- Completed: Explorer package type now renders as an icon for `צנצנת` or `שקית`, with a package fallback for unknown values.
- Verified: frontend build passes after the package-type icon update.
- Completed: Explorer `terpenes` now renders as a conditional full-width detail row instead of a standalone table column.
- Verified: frontend build passes after the terpenes row update.
- Completed: removed Hebrew comments from Explorer frontend files and aligned Explorer Swagger description with the current scraper implementation.
- Verified: frontend and backend builds pass after the Explorer cleanup.
- Completed: Explorer regular table cells now show `לא ידוע` instead of rendering those values as empty cells, fixing missing-looking `manufacturer` values.
- Verified: frontend build passes after the Explorer manufacturer display fix.
- Reviewed: Explorer strain filter behavior was inspected only; no implementation status changed.
- Completed: generalized Explorer table filters so strain, marketer, manufacturer, and brand values can all create active filter chips.
- Verified: frontend build passes after the generic Explorer filter update.
- Completed: Explorer table filter buttons now toggle their matching active filter on repeated clicks.
- Verified: frontend build passes after the Explorer filter toggle update.
- Completed: Explorer package type is now a clickable/toggleable table filter.
- Verified: frontend build passes after the Explorer package-type filter update.
- Completed: Explorer country of origin is now a clickable/toggleable table filter.
- Verified: frontend build passes after the Explorer country filter update.
- Completed: Explorer backend now uses Puppeteer network-response capture plus scrolling to collect lazy-loaded Jane product batches beyond the initial 25 rows.
- Completed: Explorer Jane JSON responses are normalized back into the existing `items` table payload without requiring frontend changes.
- Verified: backend build passes after the Explorer network-capture update.
- Completed: Explorer `isNew` is restored for the network-capture path by combining explicit JSON flags with visible `חדש!` DOM markers.
- Verified: backend build passes after the Explorer `isNew` fix.
- Completed: Explorer `NEW` badge is now a clickable/toggleable table filter.
- Verified: frontend build passes after the Explorer `isNew` filter update.
- Completed: Explorer `isNew` active filter chip now displays `חדש`, and the `NEW` badge hover contrast was fixed.
- Verified: frontend build passes after the Explorer `isNew` label/hover fix.
- Completed: Explorer terpenes now render as individual clickable/toggleable filters.
- Completed: Explorer country of origin now displays flags in the table.
- Verified: frontend build passes after the Explorer terpenes filter and country flag update.
- Completed: Explorer terpene buttons now keep percentage text visible when supplied by Jane while still filtering by terpene name.
- Completed: Explorer country flags now use local tiny SVG assets from `frontend/public/flags`.
- Verified: frontend and backend builds pass after the Explorer terpene percentage and SVG flag update.
- Completed: Explorer component CSS selectors are now fully nested under `.page-content`, including responsive rules.
- Verified: frontend build passes after the Explorer CSS nesting cleanup.
- Completed: Explorer CSS child selectors are now nested more deeply under their direct UI parents where practical.
- Verified: frontend build passes after the deeper Explorer CSS nesting update.
- Completed: Explorer CSS was checked against `css-conventions` and market-cell child button styling was nested under its parent.
- Verified: frontend build passes after the Explorer CSS conventions pass.
- Completed: Explorer backend no longer renders Jane zero/default terpene metrics as visible `0%` labels.
- Verified: backend build passes after the Explorer terpene zero-percent fix.
- Completed: Explorer header search now shows the filtered strain count under the search input and no longer shows the header refresh button.
- Verified: frontend build passes after the Explorer header count update.
- Documented: Explorer genetics connector line from origin strain to parents was removed from the current UI.
- Documented: the active GenUI cleanup focus is the AiFormat directive; `gen-ui-spec.constant.ts` is no longer listed as a cleanup candidate.
- Completed: AiFormat now preserves markdown text that appears before or after a streamed `component` block instead of replacing the whole assistant message with the GenUI template.
- Completed: Chat template detection no longer treats generic ` ```c ` code fences as GenUI rendering.
- Verified: `npx tsc -p tsconfig.app.json --noEmit` passes for the frontend after the AiFormat/chat-message fix.
- Completed: Explorer CSS budget blocker was fixed by removing duplicate PrimeNG sort-icon overrides from `frontend/src/app/features/explorer/explorer.css`; `npx ng build` now passes.
- Completed: Explorer price sorting now uses numeric custom table sorting, so price strings like `₪99`, `₪425`, and `₪499` sort by number instead of text.
- Verified: `npx ng build` passes after the Explorer numeric price sort fix.
- Completed: frontend Angular packages were upgraded to Angular `22.0.1` and TypeScript `6.0.3`.
- Completed: Angular 22 migrations were applied, including explicit `ChangeDetectionStrategy.Eager`, `withXhr()`, optional-chain safe navigation migration helpers, and extended diagnostic suppressions.
- Verified: `npx ng test --watch=false` passes after updating the stale root app spec.
- Verified: `npx ng build` passes after the Angular 22 upgrade.
- Open risk: `npm ls` reports a peer dependency problem because `primeng@21.1.8` still declares Angular `^21.0.7`, and no PrimeNG 22 package is currently available in npm.
- Documented: `documents/angular-22-update-guide.md` checklist items were marked as completed for the Angular 22 work that was performed or reviewed.
- Completed: removed Angular's temporary `$safeNavigationMigration(...)` helpers from frontend templates after the Angular 22 migration review.
- Verified: no `$safeNavigationMigration` usages remain under `frontend/src`; `npx ng test --watch=false` and `npx ng build` pass.
- Completed: moved the Angular 22 upgrade guide to `documents/done/angular-22-update-guide.md`.
- Remaining open work: decide how to handle PrimeNG's Angular 21 peer dependency range, clean existing frontend warnings, and continue the 2 remaining active feature plans (`dynamic-pharm-scraping-plan.md`, `provider-and-llm-db-plan.md`).
- Completed: AiFormat Phase 2/3 now sanitize GenUI component HTML before raw rendering, removing dangerous tags, unsafe token overrides, and unscoped global selectors while preserving local scoped CSS and `@keyframes`.
- Verified: `npx ng test --watch=false` passes 19 tests, and `npx ng build` passes after the AiFormat sanitizer update.
- Completed: AiFormat Phase 4/5/6 finished. Skeleton rendering now goes through `renderSkeletonOnce()`, Hebrew/English role parsing is covered by tests, CSS code fences render as markdown code, and the plan moved to `documents/done/ai-format-directive-improvement-plan.md`.
- Verified: `npx ng test --watch=false` passes 22 tests, `npx ng build` passes, and the AiFormat corrupted-character scan returned clean.
- Completed: `documents/done/chat-stop-stream-button-plan.md`.
- Completed: `documents/done/chat-message-actions-plan.md`.
- Chat submit now becomes a clickable stop button during streaming and cancels the active fetch through the existing stream Observable teardown.
- Chat messages now expose delete, resend, copy, and edit actions through a typed `ChatMessageActionEvent`.
- Added persistent backend deletion: `DELETE /admin-agent/sessions/:sessionId/messages/:messageId`, scoped to the authenticated user and deleting the selected message plus later messages to preserve conversation context.
- Updated `backend/swagger-spec.json` with the new message deletion operation.
- Updated `documents/architecture-diagram.md` for chat stream cancellation and message action deletion flow.
- Verified: `npx ng test --watch=false`, `npx ng build`, and `npm.cmd run build` pass after the chat action/stop work.
- Completed: implemented clickable strain-symbol filters in StrainHunter table; updated items computed property to handle symbol alt-text matching.
- Verified: frontend build passes after the strain-symbol filter update.
- Closed: `documents/features/todo/explorer-plan.md` was not an active implementation plan; it is now `documents/done/explorer-source-reference.md`.
- Active feature todo now contains: `dynamic-pharm-scraping-plan.md` and `provider-and-llm-db-plan.md`.
- Incomplete: `thinking-ux-cleanup.md`.
- Completed: Chat message action buttons now render without borders; hover/focus uses tokenized color/background only.
- Verified: `npx ng build` passes after the chat action-button border cleanup with existing warnings only.
- Completed: Angular 22 baseline documentation was updated in `frontend/README.md`, `AGENTS.md`, `CLAUDE.md`, and `C:\Users\porat\.claude\rules\angular-rules.md`.
- Documented: Angular/CLI `22.0.1`, TypeScript `6.0.3`, Node `22.22.3+` or `24.15.0+`, Angular 22 safe-navigation behavior, and the known PrimeNG peer mismatch.
- Completed: `C:\Users\porat\.claude\rules\angular-rules.md` was hardened into a strict checklist format for the local coding agent.
- Completed: reusable local-agent prompt snippets were created under `C:\Users\porat\.claude\prompts\code-agent\`.
- Completed: the local-agent Angular prompt/rules now tell the agent to proceed automatically after a clear pre-implementation report, clarify static pages do not need `PageStates`, and standardize frontend verification from `frontend/`.
- Completed: local-agent Angular prompts/rules now include Definition of Done gates for Hebrew UTF-8, CSS quality, route/menu connectivity, successful verification, and requirement-by-requirement self-review.
- Completed: local-agent Angular prompts/rules now require static placeholder pages to use the standard global page shell instead of custom wrapper classes or unnecessary component CSS.
- Completed: static placeholder page guidance now uses `glass-effect card` instead of `empty-state`; `empty-state` is reserved for real no-data states.
- Completed: Hebrew handling rules now forbid local agents from generating/reversing Hebrew; they must copy exact approved strings and verify with `Select-String -SimpleMatch`.
- Revised: Hebrew handling was simplified again; local agents may write Hebrew, with only lightweight mojibake safeguards retained.
- Completed: static page guidance now requires copying the exact standard page shell structure instead of improvising HTML around generic classes.
- Completed: Design System showcase color-token layout was tightened so color groups no longer stretch to the tallest panel and long token names no longer collide with the copy state.
- Completed: documented breakpoint tokens were added to `_variables.css`, and Design System media queries now use `var(--sm)` instead of hardcoded `900px`.
- Verified: `npx ng build` passes after the Design System update with existing unrelated warnings only.
- Completed: added `frontend/src/app/assets/styles/_primeng-overrides.css` and connected it from `frontend/src/styles.css`.
- Completed: moved PrimeNG datatable sort-icon overrides out of `_utilities.css` into the dedicated PrimeNG override stylesheet.
- Verified: `npx ng build` passes after the PrimeNG override stylesheet addition with existing unrelated warnings only.
- Completed: Users management now renders with PrimeNG `p-table` instead of the native global `.table`.
- Completed: Users table search now uses PrimeNG global filtering, and columns render sortable headers with `p-sortIcon` like Explorer.
- Verified: `npx ng build` passes after the Users PrimeNG table migration with existing unrelated warnings only.
- Completed: fixed the Users search placeholder to `חפש משתמש...`.
- Verified: `npx ng build` passes after the placeholder fix with existing unrelated warnings only.
- Completed: `documents/features/todo/TASK.md` design-system token upgrade.
- Completed: rewrote `frontend/src/app/assets/styles/_variables.css` with the audited WCAG-oriented theme token system.
- Completed: updated `frontend/src/app/assets/styles/_reset.css` `body::before` to use `--color-primary-glow-bg` and `--color-secondary-glow-bg`.
- Completed: moved the finished task to `documents/done/design-system-token-upgrade-task.md`.
- Verified: no missing CSS custom property references were found in app CSS, old transparent surface values were removed, and `npm.cmd run build` passes from `frontend` with existing unrelated warnings only.
- Completed: `documents/features/todo/DESIGN_UPGRADE_TASK.md` design-language glassmorphism upgrade.
- Completed: updated global glass, card, metric-card, table-container, logo, badge, error-badge, form input, primary button, and ambient body glow styles.
- Completed: added `--glass-*` theme tokens and stronger ambient glow token values to `_variables.css`.
- Completed: moved the finished task to `documents/done/design-language-glassmorphism-upgrade-task.md`.
- Verified: `npm.cmd run build` passes from `frontend` with existing unrelated warnings only.
- Completed: theme switching now temporarily disables CSS transitions while `data-theme` changes.
- Completed: `ThemeService.applyMode(...)` calls `blockTransitions()` and `_reset.css` defines `.no-transitions`.
- Verified: `npm.cmd run build` passes from `frontend` with existing unrelated warnings only.
- Completed: removed the duplicate dedicated rating color token and switched Explorer rating color to `--color-warning`.
- Completed: Design System color palette now lists all current color-related tokens from `_variables.css`.
- Completed: Design System semantic colors are separated into Success, Danger, Warning, and Info groups.
- Completed: Design System page padding was added, color swatches were reduced, and long gradient token values now truncate instead of overflowing.
- Verified: token coverage comparison is clean and `npm.cmd run build` passes from `frontend` with existing unrelated warnings only.
- Completed: `documents/done/light-mode-character-upgrade-task.md`.
- Completed: light mode now uses teal primary tokens, a cool blue-grey background, light glass tokens, adjusted borders, and updated light shadows.
- Verified: `.primary-btn.filled` uses acceptable light text on the new teal primary, and `npm.cmd run build` passes from `frontend` with existing unrelated warnings only.
- Completed: added global `.icon-tile` padded icon styling and applied it to Dashboard metric-card icons.
- Completed: Design System section-heading icons now reuse `.icon-tile` instead of local duplicated icon CSS.
- Verified: `npm.cmd run build` passes after the global icon-tile update with existing unrelated warnings only.
- Planned: `documents/features/todo/llm-model-test-results-retention-plan.md` documents weekly cleanup of `llm_model_test_results` rows older than 30 days.
- Reviewed: llm-provider-management code review found two critical data-binding bugs:
  - `result.logOutput` → corrected to `result.errorMessage` in the test-results table cell.
  - `model.modelId` → corrected to `model.key` in the model slug cell.
  - Removed unused `BadgeColor` and `RippleModule` imports from `LlmProvidersManagement`.
- Verified: `npx ng build` from `frontend` passes; `BadgeColor is not used` warning resolved. Remaining warnings are pre-existing `explorer.css` and `chat-message.css` budget warnings only.
- Open decisions: hard delete vs soft-disable for provider deletion, Hebrew vs English UI for the LLM providers page.
- Completed: added PrimeNG `p-dialog` forms for provider and model create/edit in `llm-providers-management`. Added "Add Provider" in page header and "Add Model" in expanded provider panel. Edit and delete (soft-disable) buttons wired for both providers and models.
- Verified: `npx ng build` passes. `llm-providers-management.css` has a new budget warning (6.43 kB over 4 kB limit).
- Completed: merged the LLM providers local `.icon-btn` styling into the global `icon-only` button pattern in `_buttons.css`.
- Completed: LLM providers action buttons now use `icon-only transparent-btn` / `icon-only danger-btn`, the local `.icon-btn` CSS block was removed, and the unnecessary `add-model-btn` class was replaced with `transparent-btn sm`.
- Verified: `npm.cmd run build` from `frontend` passes. `llm-providers-management.css` budget warning remains but is reduced to 4.36 kB over the 4 kB limit.

## 2026-07-18 Session (MCP Bridge Plan — Review and Rewrite)

- Reviewed `documents/todo/add-mcp-plan.md` against the actual code and rewrote it as `documents/features/todo/add-mcp-plan.md`. Old `documents/todo/add-mcp-plan.md` was removed (it was the untracked draft from the previous session).
- Key corrections applied during the review:
  - `LlmToolSchema` extension targets the **parser's local** type in `swagger-tools.parser.ts:14`, not `llm/types/llm.types.ts` — there are two distinct types in the codebase and the parser's is what `getTools()` actually returns.
  - The MCP dispatch branch in `AgentToolExecutorService.executeToolCall` must run **before** the existing `getEndpoint` lookup, because the current code returns `Unknown tool call` for any name not in the parser.
  - The render-spec adapter must read MCP output directly, not unwrap `data.result` (ServiceResultContainer). The plan adds a per-mapping `unwrapResult?: boolean` flag (default `true`, `false` for MCP).
  - `@dangahagan/weather-mcp` and `@modelcontextprotocol/sdk` go in **dependencies** (not devDependencies) because they ship in prod.
  - Phase 0 fixture capture is committed to disk under `__fixtures__/weather-mcp-{current,forecast}.json` and `__fixtures__/weather-mcp-tools.json`, so the adapter test is diffed against a known good output.
  - `callTool` failures return a `{error:true, source:'mcp', toolName, message}` envelope so render-spec's existing error short-circuit handles them cleanly.
- Confirmed `WeatherService` has no cross-module imports, so the Phase 4 deletion is safe. `admin-agent.service.spec.ts` `WeatherController_*` references are loop-breaker test data only and stay as-is.
- No code changes this session — plan only. No architecture diagram update was needed (pre-implementation).
- Files touched: `documents/features/todo/add-mcp-plan.md`, `documents/todo/add-mcp-plan.md` (deleted), `documents/HANDOFF.md`, `documents/STATUS.md`.
- Decisions made: prefer the `unwrapResult` flag over wrapping MCP results in `ServiceResultContainer`; ship v1 with `ph-gear` step icon for all MCP tools; keep the bridge module top-level under `src/modules/mcp-bridge/`, not as a sub-module of `admin-agent`.
- Next exact step: implement Phase 0 of `documents/features/todo/add-mcp-plan.md` by installing `@modelcontextprotocol/sdk` and `@dangahagan/weather-mcp` (both as `dependencies`), running a scratch script to capture `listTools()` and one `callTool` per tool, and committing those outputs to the `__fixtures__/` paths before starting Phase 1.

## 2026-07-18 Session (Agnes AI Multimodal Plan — Review and Rewrite)

- Reviewed `documents/features/todo/agnes-ai-multimodal-plan.md` against the actual codebase and rewrote it in place. No code was changed this session — plan only.
- Verified the plan's claims against source: confirmed `LlmProviderConfigService` lists `agnes-ai` (`llm-provider-config.service.ts:5`) and the seed writes the Agnes provider with `key: 'agnes'` and `baseUrl: 'https://api.agnes.ai/v1'` (`llm-providers.seed.ts:119-146`) — the chat model is currently unreachable through the DB path.
- Confirmed `LlmModelEntity` has no capability field, the OpenAI SDK is the only chat path, the nightly cron iterates all active models, and there is no `GET /llm/model-options` endpoint (the previous plan referenced one that does not exist).
- Key corrections applied during the review:
  - **Bug class A (provider wiring):** the seed must be updated-in-place (not delete+reinsert) for any pre-existing `agnes` row, to keep model FK rows intact and avoid a unique-key collision on the insert.
  - **Bug class B (nightly cron noise):** `LlmTasksService.handleNightlyLlmHealthCheck` would mark every image/video model as failed every night. The new plan gates Phase 2 (capability guard on chat + health check) as a hard prerequisite, not a nice-to-have.
  - **Stale `isDefault`:** the frontend `LlmModel` interface still has the dead `isDefault: boolean` field; the new Phase 6 drops it.
  - **SDK assumption:** the OpenAI SDK has no `videos` resource — video uses raw `fetch` against `{baseUrl}/videos` and `{baseUrl}/agnesapi?video_id=...` with `Authorization: Bearer`.
- Files touched: `documents/features/todo/agnes-ai-multimodal-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- Decisions made: video polling is on-demand (no background job), capability filtering goes through the existing `findAll()` path (no new endpoint), chat dropdown filters to `capability === 'text'` in one place.
- No architecture diagram update was needed because the new endpoints stay inside `LlmModule`.
- Next exact step: implement Phase 1 of the rewritten plan — update the Agnes seed block (key + baseUrl + capability), add the `capability` enum to `LlmModelEntity`, and add the idempotent update-in-place reconciliation for any pre-existing `agnes` row. Verify with `npm.cmd run build` from `backend` and `SELECT key, baseUrl FROM llm_providers`.
- Open questions: none for the plan itself. Implementation-time questions (rate limiting, free-tier cost, image upload UX) remain in the plan's "Out of Scope" section.


## 2026-06-27 Plan Audit

- Fixed: `favorite-strain-plan.md` was still in `todo/` but the feature was fully implemented:
  - `strain-hunter/`, `matching-engine.store.ts` with `calculateScore()`/`topScored()`, `matching-preferences-drawer.ts`, `matchScore` column with SVG rings, penalty badges.
  - Moved to `documents/done/favorite-strain-plan.md`.
- Fixed: `REVERT_TASK.md` was still in `todo/` but the light mode revert was already applied.
  - Moved to `documents/done/REVERT_TASK.md`.
- Bug fixed: `TerpeneModule` was not registered in `app.module.ts`, causing `/terpenes` to return 404 in an infinite loop.
  - Added `TerpeneModule` import to `AppModule`.
  - Backend and frontend builds pass after the fix.
- Completed: `documents/done/terpenes-details-plan.md`. Terpene reference catalog is fully implemented: NestJS `Terpene` entity + `TerpeneService` + `TerpeneController` + `TerpeneModule` + seed of 17 Hebrew-named terpenes, and Angular `ITerpene` interface + `TerpeneService` + `TerpeneStore` + `TerpeneTooltip` hover-popover component consumed by `MatchingPreferencesDrawer`. `TerpeneModule` is registered in `AppModule`.
- Completed: `documents/done/genetic-details-plan.md`. Genetics reference catalog is fully implemented: NestJS `Genetics` entity + `GeneticsService` + `GeneticsController` + `GeneticsModule` + idempotent seed of 209 Hebrew-named strains read from the JSON in the plan file (with parenthetical/`#`/three-parent handling and a loud-fail dedupe pass per §1.7), and Angular `IGenetics` interface + `GeneticsService` + `GeneticsStore` + a generic shared `Tooltip` component (replaces the terpene-only `TerpeneTooltip`) consumed by both `MatchingPreferencesDrawer` and the root `StrainHunter` page. `GeneticsModule` is registered in `AppModule`; `seedGenetics` runs after `seedLlmProviders` in `main.ts`. Tooltip shows an optional Hebrew role label above the strain name (`זן מקור` / `הורה #1` / `הורה #2`) so origin/parent chips are disambiguated on hover.
- Runtime wiring note: a backend agent's self-report claimed `GeneticsModule` and `seedGenetics` were wired, but `nest build` is type-check only and never executes `main.ts`. Both wirings were missing on disk and were applied directly before close-out; `npm.cmd run build` from `backend` and `npx ng build` from `frontend` both pass after the fix.
- Remaining active plans: `provider-and-llm-db-plan.md` (partial — Phases 1-3 done, 4-9 remain).

## 2026-06-28 Session (continued — Plan Cleanup)

- Moved `documents/features/todo/tooltip-merge-plan.md` to `documents/done/tooltip-merge-plan.md` — the shared `Tooltip` component integration into `StrainHunter` for both terpenes and genetics was already complete (documented in lines 216–219 above). The plan file was outdated ("NOT YET MIGRATED") but the code already used `Tooltip` with `category: 'terpene' | 'genetics'` for all hover popovers.
- Remaining incomplete: `thinking-ux-cleanup.md`.
- Completed: Integrated shared `Tooltip` component into `StrainHunter` table for terpenes and genetics.
- Fixed: Tooltip "no info" error by ensuring `TerpeneStore` and `GeneticsStore` are initialized in `StrainHunter.ngOnInit`.
- Fixed: Tooltip lookup failures by implementing normalized Hebrew name matching in `TerpeneStore` and `GeneticsStore` to handle punctuation/whitespace variations.
- Added: 500ms mouse hover delay for `Tooltip` and `ScoreTooltip` components in `StrainHunter` to prevent flickering on rapid mouse movement.
- Remaining active plans: `provider-and-llm-db-plan.md` (partial — Phases 1-3 done, 4-9 remain).

## 2026-06-28 Session (continued — Plan Cleanup)

- Moved `documents/features/todo/tooltip-merge-plan.md` to `documents/done/tooltip-merge-plan.md` — the shared `Tooltip` component integration into `StrainHunter` for both terpenes and genetics was already complete (documented in lines 216–219 above). The plan file was outdated ("NOT YET MIGRATED") but the code already used `Tooltip` with `category: 'terpene' | 'genetics'` for all hover popovers.

## 2026-06-28 Session (continued)

- Fixed p-tooltip opacity issue in PrimeNG overrides: added smooth show/hide transitions for `.p-tooltip` and `.p-tooltip-visible` with proper opacity handling for the glassmorphism `::before` pseudo-element.
- Added CREATE (POST) and UPDATE (PATCH) endpoints to `TerpeneController` and `GeneticsController` with full Swagger documentation, validation DTOs, and service layer implementations.
- Completed `documents/features/todo/silent-enrichment-plan.md` (moved to `documents/done/silent-enrichment-plan.md`):
  - Wired `GeneticsService.enrichBatch()` and `TerpeneService.enrichBatch()` into `StrainHunterService.fetchData()` after saving scraped items.
  - Enrichment runs silently on every `fetchData(forceRefresh=true)` call — extracts unique genetics names (originStrain, parent1, parent2) and terpene names, filters empties, calls both services in parallel via `Promise.all()`.
  - Idempotent: `enrichBatch` queries DB first, only calls LLM for truly missing names; TypeORM `save()` upserts (inserts new, updates partial).
  - Graceful LLM parse handling: try/catch in both services returns empty array on failure — scrape succeeds even if enrichment silently skips.
  - Removed admin-enrichment TODO comment from `tooltip.html` (line 33).
  - Frontend tooltip now shows real data on first hover — zero user interaction, zero frontend changes required.
- Verification: `npm.cmd run build` from `backend` passes. `npx ng build` from `frontend` passes with existing warnings only.
- No architecture diagram update needed (backend module boundaries unchanged, no new frontend API calls).


## 2026-07-01 Session

- Completed: refresh button in StrainHunter now shows a spinner on the button only — the table stays visible during refresh.
  - Added `refreshing` signal alongside `loading`; initial load still triggers full-page loader, refresh only spins the button.
  - `load()` only sets `loading.set(true)` when `forceRefresh=false`; on refresh it sets `refreshing.set(true)` instead.
  - Refresh button and match-drawer button use `refreshing()` for disabled/spinner state.
  - On refresh failure, `error` state replaces the table (same as current behavior).
- Verification: `npm.cmd run build` from `backend` passes. `npx ng build` from `frontend` passes with existing warnings only.
- No architecture diagram update needed (local UI behavior only).

## 2026-07-03 Session

- Completed: chat image upload, drag-and-drop, and clipboard paste for multimodal LLM conversations.
  - Backend DTO: added optional `image?: string` to `AgentRequestDto`, relaxed `prompt` from `@IsNotEmpty()` to `@IsOptional()`, relaxed `provider` from `@IsIn()` to `@IsString()`, removed `@IsNotEmpty()` from `model`.
  - Backend types: added `image?: string` to `LlmRequest`, widened `LlmMessage` user content to `string | ChatCompletionContentPart[]`.
  - Backend `LlmClientService`: added `buildUserMessage(prompt, image?)` helper that returns multimodal content array when image present; removed `as any` casts.
  - Backend `AdminAgentService`: both `queryDatabase` and `queryDatabaseStream` accept `image` param, pass to `LlmRequest`, skip title update when prompt is empty, added 15MB backend image size guard.
  - Backend `AdminAgentController`: passes `dto.image` to `queryDatabaseStream`, error response includes actual error message via `error.message`.
  - Backend `LlmClientService.generateStream`: changed from yielding error as token to **throwing** the error so controller catch block handles it properly.
  - Backend body-parser: `main.ts` uses `bodyParser: false` + `app.use(json({ limit: '20mb' }))` to override NestJS default 100KB limit.
  - Frontend `IChatMessage`: added optional `imagePreview?: string` field.
  - Frontend `ChatService.sendMessageStream`: accepts 4th optional `image?: string` param, includes in JSON body.
  - Frontend `chat.ts`: added `isDragging`, `selectedImageBase64`, `selectedImagePreview` signals; `canSend` computed; `@ViewChild('fileInput')`; methods: `openFilePicker`, `onFileSelected`, `onDragOver`, `onDragLeave`, `onDrop`, `processFile` (10MB client limit), `clearSelectedImage`, `onPaste`; removed `Validators.required` from prompt; `sendMessage` captures image before reset.
  - Frontend `chat.html`: drag overlay, hidden file input, upload button, image preview thumbnail with close button, `(paste)` binding on textarea, send button `[disabled]` uses `canSend()`.
  - Frontend `chat.css`: `position: relative` on `.chat-root-container`, `.chat-drop-overlay` styles, `.chat-file-input` hidden, `.chat-upload-btn` hover, `.chat-image-preview` with close button on hover.
  - Frontend `chat-message.html`: renders `message().imagePreview` thumbnail for user messages.
  - Frontend `chat-message.css`: `.message-attachment` styles nested under `.user-message`.
- Moved plan to `documents/done/chat-image-upload-and-drag-drop-plan.md`.
- Verified: `npx ng build` from `frontend` passes; `npm.cmd run build` from `backend` passes.
- Root cause fixes during implementation:
  - `PayloadTooLargeError`: NestJS default body-parser 100KB limit; resolved with `bodyParser: false` + 20MB limit.
  - `400 Bad Request` on image-only messages: ValidationPipe rejected `prompt: ""` due to `@IsNotEmpty()`; resolved by relaxing to `@IsOptional()`.
- No architecture diagram update needed (backend module boundaries unchanged, no new API endpoints).

## 2026-07-04 Session

- Completed: `documents/done/chat-message-content-too-long-fix-plan.md`.
  - Widened `chat_messages.content` from `TEXT` (64KB) to `MEDIUMTEXT` (~1.6M chars) in `chat-message.entity.ts`.
  - Added `truncateForStorage(content, maxBytes=50_000)` private helper to `admin-agent.service.ts`.
  - Helper cuts on `Buffer` bytes (not string chars), backtracks to valid UTF-8 char boundary, appends `_truncated` marker with original length.
  - Applied truncation at all 4 tool-related `saveMessage` call sites: assistant tool-call rows + tool-result rows in both `queryDatabase` and `queryDatabaseStream`.
  - Added 5 unit tests asserting `Buffer.byteLength(result, 'utf8') <= maxBytes` for Hebrew-heavy, mixed Hebrew+JSON, and ASCII payloads.
  - Verified: `npm run build` from `backend` passes; `npm run test` passes 19/19 (pre-existing `app.controller.spec.ts` FAIL unrelated).
- Completed: extracted `private mapToDto(entity: Terpene): TerpeneDto` in `terpene.controller.ts`, replacing 4 inline mapping sites (findAll, findOne, create, update).
- Completed: added `terpene.controller.spec.ts` (3 tests) and `genetics.dto.spec.ts` (4 tests) — DTO mapping coverage tests that fail at build time if a field is added to the DTO but not mapped from the entity.
- Completed: added `colorDark` and `colorLight` fields to `TerpeneDto`, `GeneticsDto`, `toGeneticsDto()`, and all 4 terpene controller mapping sites.
- Completed: backfilled all 18 terpenes and 246 genetics rows with WCAG AA-safe color variants (`colorDark`/`colorLight`) using `deriveThemeColors()`.
- Verified: frontend tooltip now uses `tooltipColor()` computed (theme-aware) instead of raw `t.color`/`g.color`.
- Verified: `npx ng build` from `frontend` passes; `npm run build` from `backend` passes; `npm run test` passes 19/19.

## 2026-07-05 Session (CSS Conventions Fix)
- Completed: `documents/done/css-conventions-fix.md`.
- Added 4 new tokens to `frontend/src/app/assets/styles/_variables.css`: `--color-family-indica`, `--color-family-sativa`, `--color-family-hybrid`, `--shadow-logo`.
- Replaced hardcoded hex colors in `frontend/src/app/features/strain-hunter/strain-hunter.css` with the new family badge tokens.
- Replaced the hardcoded `rgba(0, 0, 0, 0.3)` in `.logo`'s `box-shadow` in `frontend/src/app/assets/styles/_layout.css` with `var(--shadow-logo)`.
- Replaced hardcoded `11px` in `frontend/src/app/features/chat/chat-message/chat-message.css` with `var(--font-size-xs)`.
- Replaced hardcoded `10px` in `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css` with `var(--font-size-xs)`.
- Removed the duplicate `padding: 32px` override on `.chat-history` in `frontend/src/app/features/chat/chat/chat.css` (line 48) that was overwriting `padding: var(--space-4)` on line 41.
- Verification: `npx ng build` from `frontend` passes; all grep checks for remaining hardcoded values returned none.
- Out of scope (noted for follow-up): two additional `rgba(0, 0, 0, ...)` literals in `_utilities.css:273` and `_buttons.css:173` were discovered during the file move but were not included in this fix.
- Total files touched: 6 (`_variables.css`, `strain-hunter.css`, `_layout.css`, `chat-message.css`, `matching-preferences-drawer.css`, `chat.css`).
- No architecture diagram update was needed because this was local CSS token consumption only.

## 2026-07-06 Session (CSS Conventions Fix Plan — Audit Findings)

- Completed: `documents/features/todo/css-conventions-fix-plan.md` → moved to `documents/done/css-conventions-fix-plan.md`.
- Reviewed all 7 audit findings. Findings 1-3 and 6 were stale (referenced classes that no longer exist: `archive-item`, `nested-sessions-list`, `session-sub-item`, `.search-box`, `.search-container`). Finding 7 (inline styles) was already compliant.
- Finding 4 (broad transitions): replaced `transition: var(--transition-standard)` in `main-sidebar.css` with explicit `background-color` and `color` transitions.
- Finding 5 (hardcoded pixels): tokenized 40px in `.theme-toggle` and `.user-avatar` to `var(--space-10)`.
- Added `--space-10: 40px` to `_variables.css`.
- Verified: `npx ng build` from `frontend` passes.

## 2026-07-18 Session (LLM Default Model Per-User Fix)

- Completed: removed the legacy global-per-provider `isDefault` logic (backend `LlmProviderService.setDefaultModel` + `POST /llm-provider/models/:id/default` endpoint) so only `user_llm_defaults` (per-user, single model) is the default source.
- Completed: added `GET /llm/default-model` to `LlmController` for reading the authenticated user's current default model.
- Completed: frontend `LlmProviderService` now calls the user-level endpoints (`setUserDefaultModel`, `getUserDefaultModel`); `LlmProviderStore` holds `defaultModelId` and loads/sets it.
- Completed: chat + providers-management star buttons and dropdown default now use the per-user default; old `m.isDefault` rendering removed.
- Completed: created the missing `user_llm_defaults` table (root cause of `GET /llm/default-model` 500 — `synchronize:true` does not create raw-SQL-migrated tables) and cleared two stale `is_default=1` rows that caused dual stars.
- Verified: `npx ng build` (frontend) passes with existing unrelated warnings; `npx nest build` (backend) passes; user confirmed live selecting a new default works with one star only.
- Active todo: whether to add a repeatable migration runner or convert `user_llm_defaults` to a TypeORM entity, and whether to drop the dead `is_default` column.
- No architecture diagram update was needed (module boundaries and default-resolution path unchanged; only the dead legacy flag path was removed).

## 2026-07-18 Session (follow-up) — user_llm_defaults Entity + drop is_default

- Completed: `user_llm_defaults` is now a real TypeORM entity `UserLlmDefaultEntity` (registered in `LlmProviderModule.forFeature`); `LlmProviderService` reads/writes it via the repository instead of raw SQL.
- Completed: removed the dead `isDefault` field from `LlmModelEntity`; `synchronize: true` dropped the `is_default` column (verified `SHOW COLUMNS FROM llm_models`).
- Completed: added `migrations/DropLlmModelIsDefault1752860000000.ts` (portability only; project uses `synchronize: true`).
- Verified: `npm run build` (backend) passes; DB state confirmed (no `is_default`; `user_llm_defaults` matches entity); no `isDefault`/`is_default` references remain in code.
- No architecture diagram update was needed (module boundaries and default-resolution path unchanged; only the storage representation changed).
