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
- Next likely cleanup: improve GenUI output carefully in small scoped changes, starting with the AiFormat directive plan or a narrow `WEATHER_CURRENT` hint change.
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
