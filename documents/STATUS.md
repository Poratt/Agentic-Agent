# Project Documentation Status

Last updated: 2026-07-04

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
- Remaining open work: decide how to handle PrimeNG's Angular 21 peer dependency range, clean existing frontend warnings, and continue the active feature plans under `documents/features/todo/`.
- Completed: AiFormat Phase 2/3 now sanitize GenUI component HTML before raw rendering, removing dangerous tags, unsafe token overrides, and unscoped global selectors while preserving local scoped CSS and `@keyframes`.
- Verified: `npx ng test --watch=false` passes 19 tests, and `npx ng build` passes after the AiFormat sanitizer update.
- Completed: AiFormat Phase 4/5/6 finished. Skeleton rendering now goes through `renderSkeletonOnce()`, Hebrew/English role parsing is covered by tests, CSS code fences render as markdown code, and the plan moved to `documents/done/ai-format-directive-improvement-plan.md`.
- Verified: `npx ng test --watch=false` passes 22 tests, `npx ng build` passes, and the AiFormat corrupted-character scan returned clean.
- Active todo: `documents/features/todo/chat-stop-stream-button-plan.md` documents replacing the disabled chat submit button during streaming with a clickable stop/cancel button.
- Completed: moved `documents/audit/backend-llm-documentation-audit.md` to `documents/done/backend-llm-documentation-audit.md`.
- Removed: `documents/audit/phosphor-icons.web.instruction.md` because `@phosphor-icons/web` is already in active use and the file was reference material, not an audit finding.
- Current audit folder contains only the active CSS conventions audit: `documents/audit/css-conventions-component-audit.md`.
- Planned: `documents/features/todo/provider-and-llm-db-plan.md` now contains the full provider/model DB plan, including entities, admin endpoints, service refactor phases, Angular Settings UI phases, security notes, and verification checklist.
- Planned: provider/model DB plan now includes scheduled/manual LLM test runs every 6 hours by default, persisted test results, model rankings, provider/model forms, and a Settings test-results table.
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
- Active feature todo now contains only `documents/features/todo/database-storage-monitor-plan.md`.
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
- Remaining active plans: `llm-model-test-results-retention-plan.md`, `provider-and-llm-db-plan.md` (partial — Phases 1-3 done, 4-9 remain), `database-storage-monitor-plan.md`.

## 2026-06-28 Session (continued — Plan Cleanup)

- Moved `documents/features/todo/tooltip-merge-plan.md` to `documents/done/tooltip-merge-plan.md` — the shared `Tooltip` component integration into `StrainHunter` for both terpenes and genetics was already complete (documented in lines 216–219 above). The plan file was outdated ("NOT YET MIGRATED") but the code already used `Tooltip` with `category: 'terpene' | 'genetics'` for all hover popovers.
- Remaining incomplete: `thinking-ux-cleanup.md`.
- Completed: Integrated shared `Tooltip` component into `StrainHunter` table for terpenes and genetics.
- Fixed: Tooltip "no info" error by ensuring `TerpeneStore` and `GeneticsStore` are initialized in `StrainHunter.ngOnInit`.
- Fixed: Tooltip lookup failures by implementing normalized Hebrew name matching in `TerpeneStore` and `GeneticsStore` to handle punctuation/whitespace variations.
- Added: 500ms mouse hover delay for `Tooltip` and `ScoreTooltip` components in `StrainHunter` to prevent flickering on rapid mouse movement.
- Remaining active plans: `llm-model-test-results-retention-plan.md`, `provider-and-llm-db-plan.md` (partial — Phases 1-3 done, 4-9 remain), `database-storage-monitor-plan.md`.

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
