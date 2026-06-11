# Project Documentation Status

Last updated: 2026-06-11

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

## Recent Status

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
- Completed: `documents/done/chat-stop-stream-button-plan.md`.
- Completed: `documents/done/chat-message-actions-plan.md`.
- Chat submit now becomes a clickable stop button during streaming and cancels the active fetch through the existing stream Observable teardown.
- Chat messages now expose delete, resend, copy, and edit actions through a typed `ChatMessageActionEvent`.
- Added persistent backend deletion: `DELETE /admin-agent/sessions/:sessionId/messages/:messageId`, scoped to the authenticated user and deleting the selected message plus later messages to preserve conversation context.
- Updated `backend/swagger-spec.json` with the new message deletion operation.
- Updated `documents/architecture-diagram.md` for chat stream cancellation and message action deletion flow.
- Verified: `npx ng test --watch=false`, `npx ng build`, and `npm.cmd run build` pass after the chat action/stop work.
- Remaining warnings are unchanged: unused `AccessToDirective` in `ChatHistory`, `chat-message.css` warning budget, and `explorer.css` warning budget.
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
