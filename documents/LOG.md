# Documentation Change Log

## 2026-08-17 W4 — RequiresConfirmation decorator relocated to core/decorators
- **Architectural decision — cross-cutting decorators belong in core:** `@RequiresConfirmation()` lived under admin-agent but was consumed by llm-provider + users (cross-module pollution, audit-dependency-map finding #1). Moved to `core/decorators/` with git mv (zero content change) — the decorator writes both NestJS metadata and the `x-requires-confirmation` OpenAPI extension, untouched; the C5 boot assertion in main.ts (3 expected ops) passed live after restart.
- **Hygiene:** swagger-tools.parser imported `REQUIRES_CONFIRMATION_KEY` but never used it (runtime check reads the literal string) — dead import removed while fixing the path.
- **No index.ts in core** — core has no index-file pattern; a new one would have been speculative. No architecture diagram change.

## 2026-08-17 W3 — ServiceResultContainer audit is now fully green
- **Finding — the audit doc drifted from the code:** the per-endpoint table still flagged ideas sessions ×2 + unread-count as ❌ after today's cluster commits. Verified against the controller: GET /sessions + /sessions/:id wrapped in 1aa5348, GET /nightly/unread-count already returns `{success, message, result: count}` (live-verified), favorite/mark-read already 204. Corrected the audit doc to match the code. Lesson: audit docs must be reconciled against code before quoting counts.
- **Environment discovery — not an npm-workspace monorepo:** there is NO root package.json; `npm run -w backend` fails (AGENTS.md is wrong about this). Backend commands run from `backend/`. The running backend executes `node dist/main` — src edits need `npm run build` (in backend/) + restart; there is no live watch in the current setup.
- **No architecture diagram change** — audits/docs only.

## 2026-08-17 W2 — strain-hunter cluster wrapped in ServiceResultContainer
- **Decision — wrap at the controller, keep the service raw:** the three strain-hunter endpoints (GET /fetch, GET/PUT /preferences) now return `{success, message, result}` with the original payload under `result`. Service methods stay raw so internal callers (none exist today) are unaffected; the wrap is a presentation concern. Same pattern as the calendar/llm clusters.
- **Consumer check (golden rule):** frontend parse sites updated — `strain-hunter.ts` unwraps `result.items`/`result.lastScrapedAt`; `matching-engine.store.ts` unwraps `result.prefs/weights` (PUT response unused). LLM agent tools receive container JSON like every other tool — no executor change.
- **Lesson — never write Hebrew via inline `curl -d` in git-bash:** the shell mangles UTF-8 on Windows, which corrupted a live PUT of matching preferences; restored byte-exact via `--data-binary @file` with a UTF-8 payload file.
- **No architecture diagram change** — same endpoints, same request flow; only response shape.

## 2026-08-17 W1 — httpResource `value()` throw guard (dashboard "0 users" fix)
- **Decision — never read `resource.value()` unguarded:** Angular throws when a resource is in error state (documented: "Reading the value signal on a resource that is in error state throws at runtime"). The `50e11c0` httpResource refactor introduced `computed(() => resource.value()?.result ?? [])` in 4 stores (users/terpene/genetics/llm-provider); any failed load (backend watch-mode restart) threw inside the computed, broke every consumer, and httpResource never retries → permanently stuck empty UI. All 4 now guard with `hasValue()`; stores with pageState (users, llm-provider) also surface the resource error instead of silently showing Empty.
- **Lesson — HTTP-failure handling is part of the reactive contract:** httpResource's `.value()` is NOT a safe default read, and its failures don't self-heal. Guards + explicit error states are required wherever a resource backs a store computed.
- **No architecture diagram change** — store-internal state handling only.

## 2026-08-16 A5 — site: operator client-side enforcement + PullPush channel sunset
- **Architectural decision — client-side `site:` enforcement:** SearXNG forwards the raw query to every engine; operator semantics are engine-dependent. Live evidence 2026-08-16: bing.com itself ignores `site:` for anonymous traffic (direct curl returned speedtest.net for `site:reddit.com test` — page title proves the operator was received), google cse and brave honor it, and SearXNG's result merge mixes both. Therefore `WebSearchService.search()` now parses `site:`/`-site:` from the original query (`parseSiteOperators`) and filters merged results by hostname (exact or subdomain, `urlMatchesSite`). The operator still travels in the query so honoring engines can use it — the filter only removes what ignoring engines leak in.
- **Architectural decision — PullPush removed:** the API now answers every request with 429 `"does not provide free scraping resources for agents"` (verified live, persistent across retries/waits). The 1.5s-serial-queue + retry + 10-min circuit breaker (A4) was correct engineering for a rate limiter, but this is a paywall — dead channel deleted, not throttled. Ideas signal fan-out is now 2 channels (SearXNG + HN Algolia). Reddit coverage when google cse/brave answer `site:reddit.com` queries + the new post-filter replaces it.
- **Open issue logged:** 5 SearXNG engines suspended/CAPTCHA from this residential IP (brave/ddg/qwant/startpage/mojeek) — separate investigation, not addressed here.
- **No architecture diagram change** — provider list in the diagram loses PullPush as an active channel; internal flow unchanged.

## 2026-08-16 A4 — Nightly ideas pipeline: resilience layer + model-class lessons (10-round incident)
- **Final outcome:** pipeline fully working — 2 grounded sessions × 5 ideas saved per run (~7.5 min end-to-end on `openrouter/google/gemma-4-31b-it:free`).
- **Architectural decision — direct-API query translation:** HN Algolia and PullPush receive operator-stripped queries (`toDirectApiQuery`: no `site:`, `-excl`, `OR`, quotes) because literal-text APIs treat search syntax as dead tokens (0 results; PullPush even 400s on unbalanced quotes). HN additionally gets only the first 3 significant words — Algolia ANDs every word, so long keyword chains match nothing (live-verified: 2-3-word queries return relevant stories).
- **Architectural decision — PullPush rate-limiter:** all PullPush calls pass a serialized in-service queue (1.5s min interval) with one 3s-backoff retry on 429; a double-429 opens a 10-minute circuit breaker that short-circuits calls (checked both at entry AND inside the queue task) with zero HTTP. External IP blocks outlast any client-side throttle — the breaker converts a dead channel from "30s wasted per phase" to "instant skip + self-healing probe".
- **Architectural decision — grounding fan-out:** `gatherSignals` fans its 5 queries to SearXNG + HN + PullPush like `discoverTopics`. Grounding must never depend on one channel: HN is the reliability workhorse (100% trusted-domain yield), SearXNG is flaky (only bing answers; engine rotation), PullPush is best-when-unblocked.
- **Lesson — thinking-model budget headroom:** reasoning models (OmniRoute `auto`, glm-4.7-flash) burn invisible reasoning tokens against `max_tokens`; symptoms are truncated JSON (`finish_reason=length`) or completely empty content, and the failure is intermittent per-routing. All ideas-pipeline budgets now assume thinking overhead (3072/4096–8192/4096/8192). The durable fix was switching the nightly model to a NON-thinking model (`google/gemma-4-31b-it:free`) via `IDEAS_NIGHTLY_MODEL`.
- **Decision — `IDEAS_NIGHTLY_MODEL` parses on the FIRST slash only:** model IDs may themselves contain slashes (`openrouter/google/gemma-4-31b-it:free`, `cloude-flare/@cf/...`); `split('/', 2)` truncated them. `resolveEffectiveModel` passes explicit overrides through unvalidated, so provider key + full model string is the contract.
- **Decision — retry covers parse, not just throw:** `discoverTopics` retries when the LLM call throws (empty content) AND when the returned JSON is null/truncated — both are the same underlying budget starvation. Retry warning logs `finish_reason`.
- **Decision — snippet diet:** discovery snippets capped at 280 chars × 12 per prompt. Long prompts amplify thinking-token burn on reasoning models.
- **No architecture diagram change** — same three signal providers already documented; all changes are internal resilience/budget tuning.

## 2026-08-16 A2 — Multi-channel signal discovery: SearXNG demoted to best-effort
- **Architectural decision:** topic-discovery signal gathering now fans each query to three parallel channels: SearXNG (best-effort), HN Algolia (`searchHackerNews`), and PullPush Reddit archive (`searchRedditArchive`). Rationale: every self-hosted SearXNG general engine died under bot detection from a single residential IP (brave/google cse "Suspended: too many requests", duckduckgo/startpage CAPTCHA — verified live via the JSON API); bing responds but silently drops `site:` (returns generic results); a single scraping channel could not deliver trusted-domain signals reliably. HN Algolia and PullPush are keyless public APIs without bot detection, and both return URLs on trusted domains by construction (news.ycombinator.com item links, reddit.com permalinks), so `isTrustedSignalUrl` keeps them without filtering.
- **Decision:** Reddit is reached via PullPush (pushshift successor), NOT `reddit.com/search.json` (403 without OAuth; `old.reddit` soft-blocks with empty results). Trade-off: archive freshness lags hours behind live Reddit — acceptable for nightly pain-point mining.
- **Decision:** SearXNG is kept (not replaced) — it still serves other consumers (genetics/terpenes enrichment) and remains a best-effort third channel when its engines are not suspended. `docker/searxng/settings.yml` now explicitly enables bing/mojeek/qwant as extra general engines.
- **Architecture diagram updated** — IdeasModule node + nightly-cron flow now list the three signal channels.

## 2026-08-16 A1 — Discovery fallback queries aligned with the trusted-domain filter
- **Architectural decision:** `FALLBACK_DISCOVERY_QUERIES` in `IdeasService` are now `site:`-scoped to `TRUSTED_SIGNAL_DOMAINS` (reddit ×2, news.ycombinator.com, indiehackers.com) instead of generic evergreen queries. Rationale: the fallback fires exactly when the LLM query-generation step fails, and the downstream `isTrustedSignalUrl` filter drops every non-trusted-domain result — generic fallback queries guaranteed a 0-topic night on any LLM failure (observed live: 40/40 results dropped). The fallback now encodes the same `site:` guidance `DISCOVERY_QUERY_GENERATION_PROMPT` already gives the LLM.
- **Context:** the triggering incident was NOT the fallback itself but an invalid DB model row (`openrouter`/`google` → OpenRouter 400). The fallback fix is defense-in-depth so one broken model no longer collapses the whole nightly run to zero.
- **No architecture diagram update needed** — internal constant change.

## 2026-08-14 A1 — Ideas validation: server-side riskPenalty + solo-dev actionable fields
- **Architectural decision:** the final idea score is now computed server-side as `competition + signalFit + feasibility + marketSize − riskPenalty` (clamped 1–10) in `validateSingle`. The LLM returns `riskPenalty` (0–3) inside `validationBreakdown`, but the subtraction and clamp happen in the service — the model cannot inflate the score by omitting or under-weighting the penalty. Previously `risks` were purely decorative and never affected the score.
- **Architectural decision:** a missing `riskPenalty` in LLM output defaults to 0 (`clampBreakdownScore` treats non-numbers as 0), keeping backward compatibility with models/outputs that predate the field.
- **Architectural decision:** the three new solo-dev fields (`techStackSuggestion`, `firstDistributionStep`, `estimatedMvpDays`) are nullable columns on `saved_ideas` with no migration file — TypeORM `synchronize: true` applies them, matching the precedent set when `validationBreakdown` was added. Frontend guards all three with `@if`, so pre-existing rows (nulls) render unchanged.
- **Architectural decision:** competitor names link out to Google search (`competitorSearchUrl`) rather than to competitor sites — competitor data is plain strings with no URLs; a search link needs no backend change.
- **Architectural decision:** `VALIDATION_PROMPT` now mandates concrete solo-dev outputs: real API/library names for the stack, one zero-budget distribution channel, and an honest MVP-days estimate (clamped 1–365 server-side).
- **No architecture diagram update needed** — scoring formula and card rendering are IdeasModule internals; module boundaries and request flow unchanged.

## 2026-08-13 A2 — `clampScore` accepts optional `validationScore`
- **Decision:** `ValidationResult.validationScore` is optional (`number | undefined`). `clampScore` parameter widened to match. No runtime change — existing `typeof` guard already returns 1 for `undefined`.

## 2026-08-13 A1 — Separate page-level vs per-item loading signals in `IdeasStore`
- **Architectural decision:** `loadSessions()` (full list) and `loadSession(id)` (single item) used to share the same `historyLoading` signal. This caused a visible flicker on first accordion expand because `loadSession` momentarily flipped `historyPageState` from `Ready` to `Loading`, unmounting the entire `@switch` block (sessions list + stagger animations) and remounting it on resolution.
- **Architectural decision:** the store now exposes a granular API — `historyLoading` (page-level, used by `loadSessions` only) and `loadingSessionIds: signal<Set<number>>` (per-item, used by `loadSession`) + `isSessionLoading(id)` helper. The component reads `ideasStore.isSessionLoading(session.id)` for per-row spinners without affecting the page-level state.
- **Architectural decision:** `toggleExpand()` in `ideas-history.ts` is now `async`: `await loadSession()` → `await requestAnimationFrame()` → `expandedSessionId.set()`. The 1-frame gap (~16ms) lets Angular commit the new `<app-idea-card>` children before the grid `0fr → 1fr` animation tries to interpolate to their height. Imperceptible to users; eliminates the "snap-from-60px-to-600px" content jump.
- **Architectural decision:** the `::ng-deep` block in `ideas-history.css` (12 lines) was deleted entirely. It targeted `.idea-card-wrapper` (a class that does not exist in the template — verified by grep) and was overriding `position: static` / `transform: none` / `transition: none` on `.idea-card` to fight a `position: absolute` that was never actually set. Dead code that was causing real style-recalculation cost on every first mount.
- **No architecture diagram update needed** — signal separation inside an existing store + 2 cosmetic CSS changes (`.glass-effect::before will-change: filter`, `.ideas-loading min-height: 220px`).

## 2026-08-12 A1 — SavedIdea as the frontend single source of truth
- The frontend now consumes `SavedIdea` everywhere (IdeaCard, ideas-history, ideas-page). `BusinessIdea` is retained ONLY as the SSE DTO in `idea.interface.ts`; the store maps it → `SavedIdea` via `toSavedIdea` (null arrays → `[]`, `validationReason` → `''`).
- `SavedIdea` fields (`risks`/`competitors`/`nextSteps`/`signalsReferenced`/`validationReason`) are normalized to non-null, with null coercion at the store boundary (`toSavedIdea`, `normalizeSaved`). This removes the 4 nullable-array computeds from `IdeaCard`.
- Generated (live) ideas have no `id` → favorite toggle hidden in `IdeaCard`; only persisted history ideas (with `id`) expose it.
- **Finalization:** `ideas-grid` component deleted; `ideas-page.html` renders `<app-idea-card>` directly with parent-managed `expandedIndex`. `IdeaCard` is a clean controlled component. Since the backend auto-saves every idea on generation, the `SavedIdea` shape is the single source of truth across the entire frontend; `BusinessIdea` is strictly an internal SSE streaming type.

## 2026-08-12 A2 — apiKey transformer must not clobber stored keys
- `llm-provider.entity.ts`: the `apiKey` transformer returns `undefined` when the input is `undefined` or empty, so a PATCH that omits the key leaves the existing encrypted column untouched (TypeORM `update()` skips `undefined` columns).

## 2026-08-05 C5 — Confirmation flow activated + H3 self-confirmation closed

- **Architectural decision:** the `@RequiresConfirmation` decorator now writes two things via `applyDecorators`: NestJS metadata (`SetMetadata`) for runtime Reflector checks, and an OpenAPI extension (`ApiExtension('x-requires-confirmation', true)`) so the swagger-spec.json reflects the dangerous operations. This was the minimal fix — a full `DiscoveryService` registry was considered unnecessary.
- **Architectural decision:** a boot assertion in `main.ts` verifies the exact set of operationIds with `x-requires-confirmation: true` in the spec against a hardcoded expected list. This prevents the exact regression that caused C5 (decorator writes metadata but spec never receives it). Fails loud — the app will not start if the list drifts.
- **Architectural decision:** `AdminAgentController_confirmAction` is excluded from `getTools()` via a static denylist (`SwaggerToolsParser.HIDDEN_FROM_LLM`). The endpoint still exists for the UI (humans confirm via the frontend `pendingConfirmation` signal), but the LLM can never see it as a callable tool. This closes H3 (self-confirmation) in the same pass as C5.
- **No architecture diagram update needed** — decorator rewrite + assertion + filter inside existing modules.

## 2026-08-05 C3 — `extendVideo` source video download: SSRF + size guard

- **Architectural decision:** user-controlled download URLs (`sourceVideoUrl`) are validated twice: fast sync DTO validation (`@IsSafeUrl()` — https-only, blocklist, private-range match) and authoritative runtime validation (`assertSafeUrl()` — DNS + ipaddr) inside `downloadBuffer()`, which is the single download funnel for both user URLs and provider-resolved videoId URLs.
- **Architectural decision:** `downloadBuffer()` uses `redirect: 'manual'` with per-hop re-validation (max 5 hops, relative locations resolved against the current URL) instead of letting fetch follow redirects silently to internal hosts. Body is streamed with a 100MB cap (plus a `content-length` pre-check) to prevent OOM.
- **No architecture diagram update needed** — a validator + hardened fetch inside the existing `LlmModule`.

## 2026-08-05 C4 — Google Calendar: server-side OAuth token storage + per-route authz

- **Architectural decision:** Google Calendar OAuth refresh tokens are now stored server-side, encrypted at rest (AES-256-GCM via the existing `EncryptionService`), in a new `google_calendar_tokens` table keyed by `userId`. They are never accepted from client input and never returned in responses.
- **Architectural decision:** the OAuth `callback` route is the only `/calendar` route without `JwtAuthGuard` (it is a browser redirect from Google, so no Authorization header can be sent). It is authenticated by the OAuth `state` parameter: a random 32-byte value persisted as an httpOnly `gcal_state` cookie plus a non-expired DB row bound to the user who started the flow. This closes the OAuth CSRF / account-binding vector without requiring a session middleware.
- **Architectural decision:** the shared singleton `google.auth.OAuth2` client was removed — `setCredentials()` on a shared client leaks tokens between concurrent users. Each call now constructs its own client.
- **Architectural decision:** a dedicated table (not `users` columns) holds the transient OAuth state so it doesn't pollute the `User` entity; migration `AddGoogleCalendarTokens1765000000000` declares the FK/`ON DELETE CASCADE` explicitly. Note: `app.module.ts` still runs `synchronize: true`, so the table would be auto-created on boot anyway — the migration is the documented DDL path and stays consistent with the encryption-migration precedent.
- **No architecture diagram update needed** — no new module boundary or external provider; the change stays inside the existing `GoogleCalendarModule`.

## 2026-08-05 Media Studio LLM Provider Payload Check

- Runtime finding: `/llm-provider` returns the `capability` field on every model object, but the live payload currently reports every model as `text`.
- Operational cause to verify/fix: `agnes-ai` media model rows are present but have stale capabilities (`agnes-image-2.0-flash`, `agnes-image-2.1-flash`, and `agnes-video-v2.0` all returned as `text`).
- No architecture decision changed. No architecture diagram update needed.

## 2026-07-25 CSS Cleanup — Labels, Compact Inputs, Number Steppers

- **Architectural decision:** consolidated bare `label` styles into one global rule in `_typography.css` (font-size sm, font-weight medium, color text-primary). Component-scoped label overrides (like `.composer-count label { white-space: nowrap }`) stay local for context-specific needs.
- **Architectural decision:** created global `.compact-input` class with `xs`/`sm`/`md`/`lg` size variants in `_forms.css` for inline toolbar inputs. This replaces duplicated input styles that existed in both `_composer.css` and `media-studio.css`.
- **Architectural decision:** number spinner hiding is now global for all `input[type='number']` via `_forms.css`. Custom `.number-stepper` with `ph-caret-up`/`ph-caret-down` buttons replaces native spinners.
- **No architecture diagram update needed** (CSS-only, no new components or endpoints).
- **Files touched:** `_typography.css`, `_forms.css`, `_composer.css`, `media-studio.css`, `media-studio.html`, `media-studio.ts`, `ideas-form.html`, `ideas-form.ts`.

## 2026-07-22 Main Sidebar — Chat History Dropdown Fix

- **Architectural decision:** the `.nav-item-chat` pattern (hover-to-reveal history button with dropdown, absolute positioning, RTL-aware `inset-inline-end`) is reusable. When adding history to Ideas (`/ideas`) and Media Studio (`/media`), extract this into a shared component or a shared CSS pattern in `_utilities.css` rather than duplicating per-page.
- **Architectural decision:** `<app-dropdown>` must sit outside `<button>` elements — `backdrop-filter` (glass-effect) does not work inside buttons due to opaque rendering context, and click events bubble to the parent `routerLink`.
- **Files touched:** `main-sidebar.html`, `main-sidebar.ts` (added `TooltipDirective`), `main-sidebar.css` (`.nav-item-chat` with absolute-positioned dropdown).

## 2026-07-22 Ideas Page — Chat-Style Composer Layout

- **Architectural decision:** lifted the shared composer shell (bottom-docked `.composer-area`, focus-glow `.composer-field`, circular send/stop `.composer-submit`) into a new global partial `frontend/src/app/assets/styles/_composer.css`, and refactored both chat and ideas to use it. This honors the project's CSS rule that reusable patterns belong in global files, not per-component copies, and prevents drift if a third "composer" UI is built later.
- **Architectural decision:** stop-while-loading on the ideas page is implemented entirely on the existing `controller.abort()` Observable teardown path inside `IdeasService.generateStream`. No new HTTP plumbing, no new API; the store simply unsubscribes the SSE subscription. The store filters `AbortError` from the error path so clean stops do not surface as a page error, matching the chat page's behavior.
- **Architectural decision:** ideas-form structure changed from a top-down `glass-effect card` (domain field, count slider, model select, submit stacked vertically) to a single bottom-docked composer-field with a top-aligned domain input and a meta row that splits the count slider (left) from the model select + circular submit (right). The model `<p-select>` template is unchanged because the group/item content is already component-local convention.
- **Files touched:** `frontend/src/app/assets/styles/_composer.css` (new), `frontend/src/styles.css`, `frontend/src/app/features/chat/chat/chat.html`, `frontend/src/app/features/chat/chat/chat.css`, `frontend/src/app/features/ideas/ideas-page/ideas-page.html`, `frontend/src/app/features/ideas/ideas-page/ideas-page.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.html`, `frontend/src/app/features/ideas/ideas-form/ideas-form.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.ts`, `frontend/src/app/core/store/ideas.store.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.

## 2026-07-21 Business Idea Generator — Closed (Verification Session)

- **Architectural decision:** the Ideas module was already fully implemented before this session. This was a verification + documentation close-out session only — no code changes.
- **Architectural decision:** `ThrottlerModule.forRoot` uses two named throttlers (`ideasCostShort`: 30 hits/60s, `ideasCostLong`: 150 hits/3600s) with `skipIf` scoping to `/ideas` routes so existing authenticated routes are unaffected. The custom `IdeasThrottlerGuard` extends `ThrottlerGuard` and loops `storageService.increment()` `weight = max(count, 1)` times to implement weighted rate limiting, since throttler v6 removed the `weight` parameter.
- **Architectural decision:** the controller uses `JwtAuthGuard` (authenticated, not public). The plan's open decision said "Default to public with rate limiting for now, lock down later if needed" — the implementation chose to lock down immediately. This is acceptable given the cost amplification risk (each request triggers SearXNG × 3 + LLM × (N+1) calls).
- **Architectural decision:** SSE progress streaming (`GET /ideas/generate/stream`) coexists with synchronous `POST /ideas/generate`. The frontend uses the SSE endpoint exclusively (via raw `fetch` + `ReadableStream`, not `EventSource`, to preserve cookie-based auth). The synchronous POST exists for tests, GenUI tool calls, and non-streaming consumers.
- **Architectural decision:** the `IdeasThrottlerGuard` is applied globally as `APP_GUARD`. Because `skipIf` excludes non-`/ideas` routes at the throttler config level, the guard is effectively a no-op for all other routes. This avoids needing per-controller `@UseGuards` decoration.
- **Files touched:** `documents/done/business-idea-generator-plan.md` (moved), `documents/done/chat-idea.md` (moved), `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- **Architecture diagram needs update:** new `IdeasModule` (imports `LlmModule` + `WebSearchModule`), `IdeasController` (`POST /ideas/generate` + SSE `GET /ideas/generate/stream`), `IdeasThrottlerGuard`, and frontend `IdeasPage` with 5 components. Deferred — the diagram update is noted but not done this session.

## 2026-07-20 Loader Shimmer — Implemented (Phases 1, 2, 3, 5, 6)

- **Architectural decision:** the shimmer primitive is now live in `_utilities.css` and `_animations.css`. Three pill sizes (sm/md/lg) plus a text-shimmer variant, all driven by `@keyframes shimmer-sweep` with an RTL mirror keyframe. Gradient uses `color-mix()` over existing tokens — no new color tokens introduced.
- **Architectural decision:** the chat step loading indicator now shows `טוען...` with shimmer-text (gradient sweep on the text) instead of a pill placeholder. The user chose visible text over a structural pill for the chat's inline loader. A spinner icon (`ph-spinner ph-spin`) accompanies the text.
- **Architectural decision:** the dead `.response-loader` rule and the `responseLoaderPulse` keyframe were removed from `chat-message.css` (zero consumers verified by grep). The `.loading-dots` block inside `.step-item.is-loading` was also removed since the template now uses `.shimmer-text`.
- **Architectural decision:** strain-hunter's `.loading-dots` (static) and `.dots-loader` (animated) were both replaced with `<span class="shimmer shimmer--sm">` using the global utility. The `dot-bounce` keyframe was removed.
- **Architectural decision:** text shimmer wraps `טוען...` in login/register buttons and `מבצע העשרה...` in strain-hunter-settings bulk-enrich buttons, plus `טוען נתוני מסד נתונים...` in database-monitor-settings. The underlying text stays in the DOM for screen readers.
- **Phase 4 (`.custom-loader` rebrand) remains deferred.** The 6 page-level consumers and the duplicate in `chat.css:27-34` are unchanged. The audit-report section 1.10 stays open.
- **Files touched:** `_animations.css`, `_utilities.css`, `chat-message.html`, `chat-message.css`, `strain-hunter.html`, `strain-hunter.css`, `login.html`, `register.html`, `strain-hunter-settings.html`, `database-monitor-settings.html`.
- **No architecture diagram update needed** — CSS-only changes with no new components, endpoints, or cross-module boundaries.

## 2026-07-20 Loader Shimmer — Plan written, chat loader fix landed

- **Architectural decision:** the project currently has 6 distinct animated loader patterns (rotating border, three-pulse rectangles, three-bounce circles, static three-dots, icon-font spinner, PrimeNG ProgressSpinner). The plan unifies them under a single shimmer primitive (`.shimmer`, `.shimmer-text`, `.shimmer-circle`) defined in `_utilities.css`, driven by one `@keyframes shimmer-sweep` and one `@keyframes shimmer-rotate` in `_animations.css`. This matches the project's "one keyframe, one declaration" rule (`css-duplicate-styles-remediation-plan.md:37`).
- **Architectural decision:** two shape variants on a single primitive — inline pill for empty/structural loading, text shimmer for in-line strings. The user's preference (from the planning conversation) was Option 1 (pill) as the empty-step fallback + Option 2 (text shimmer) when a message is present. The plan codifies this as `.shimmer--md` (120×6px pill) for chat steps and `.shimmer-text` (gradient on text node) for `טוען...` / `מבצע העשרה...` strings.
- **Architectural decision:** the 48×48 page-level `.custom-loader` becomes a *shimmer ring* (conic gradient masked to an arc, rotating 1.5s), not a 6px pill. Visual weight matters at page scale; a 6px pill would feel like a downgrade. The class name stays `.custom-loader` so the 5 templates that reference it need no template changes. **DEFERRED to Phase 4 — see "Deferred work" in the plan.** The user chose to validate the inline shimmer (Phases 2/3/5) for a sprint before committing to the highest-blast-radius change. Until Phase 4 is unblocked, the rotating border stays as-is across the 6 page-level consumers.
- **Architectural decision:** PrimeNG `<p-progressSpinner>` in `media-studio.ts:6` is *out of scope*. It is the media studio's deterministic generation progress, not a generic loader. Replacing it with a shimmer would lose determinism. If the user later wants to align the media-studio progress look with the rest of the app, it is a separate plan.
- **Architectural decision:** the icon-font spinner (`<i class="ph ph-spinner ph-spin">`) is also *out of scope*. It is a different visual family and the user's complaint was specifically about the chat's three dots. The `_utilities.css:216-218` `ph-spin` rule is left untouched. **This is now explicit and applies to both the active phases and the deferred Phase 4** — earlier drafts proposed rebranding it to a "shimmer ring" inside the same `<i>` element, but that has been dropped: it would create a third visual family that doesn't match either the inline pill or the existing rotating border, and the icon font cannot render a CSS gradient sweep meaningfully anyway.
- **Architectural decision:** the dead `.response-loader` rule in `chat-message.css:177-199` is removed as part of Phase 2. Verified by `rg -n "response-loader" frontend/src/app` — zero consumers in code, only one mention in a done/ plan document.
- **Architectural decision:** strain-hunter's `.loading-dots` (static, line 226) and `.dots-loader` (animated, line 243) are renamed to `.shimmer--sm` (Phase 3). The `dot-bounce` keyframe at line 494 is removed as unused. No test file references the old names.
- **Architectural decision:** RTL — the shimmer keyframe direction is mirrored in RTL via `[dir="rtl"] .shimmer::before`. Without this, the sweep would appear to move "the wrong way" in the Hebrew chat UI. Tested mentally against the chat's existing RTL layout; will need a visual confirmation during Phase 2.
- **Architectural decision:** `prefers-reduced-motion: reduce` is mandatory on every loader. The shimmer animation is disabled but the static shape (pill / ring / gradient text) remains, so the loader still reads as "loading" without movement.
- **Architectural decision:** the chat step `isLoading: true` empty step is the *first* consumer of the new primitive. The plan orders it as Phase 2 so Phase 1 (the primitive definition) lands first and Phase 2 is a one-line template change against it.
- **Files touched:** `frontend/src/app/features/chat/chat-message/chat-message.ts` (mark last active tool step as `isLoading: true`), `frontend/src/app/features/chat/chat-message/chat-message.html` (reorder so render blocks render before the steps), `documents/features/todo/loader-shimmer-plan.md` (new), `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- **No architecture diagram update needed** — the plan is CSS-only with no new components, endpoints, or cross-module boundaries.

## 2026-07-18 Agnes AI Multimodal Plan — Review and Rewrite

- Reviewed `documents/features/todo/agnes-ai-multimodal-plan.md` against the actual codebase and rewrote it in place. No code was changed in this session — plan only.
- Architectural decision: the seed's mis-keyed provider row (`agnes` instead of `agnes-ai`) plus the legacy `baseUrl: 'https://api.agnes.ai/v1'` (instead of `https://apihub.agnes-ai.com/v1`) means the Agnes chat model is currently unreachable through the DB path even with `AGNES_API_KEY` set. The plan now mandates a single reconciliation step (update-in-place, do not delete-and-reinsert) so existing model foreign keys stay intact. This is the project's first case of "rename an existing seed key" and the plan's reconciliation must come before the insert, otherwise the unique constraint on `key` will reject the new `agnes-ai` row.
- Architectural decision: the LlmModel `capability` field is an entity enum defaulting to `'text'`, seeded per Agnes model. The frontend `LlmModel` interface already drives the chat dropdown through the providers store; the plan filters the chat `<p-dropdown>` to `capability === 'text'` in one place, no new endpoint required.
- Architectural decision: the previous plan's Phase 1 added `capability` and called it done, but the nightly `LlmTasksService.handleNightlyLlmHealthCheck` cron iterates **all** active models and would start failing every image/video model nightly, polluting `llm_model_test_results`. The rewritten plan gates Phase 2 on the health-check guard — a hard prerequisite, not a nice-to-have.
- Architectural decision: video polling is on-demand per `GET /llm/video/:videoId` (not a background job) to match the project's existing "no scheduled retries for user-triggered long work" pattern. Free-tier models make abandoned `video_id`s cheap to discard.
- Architectural decision: the previous plan referenced a `GET /llm/model-options` endpoint that does not exist (`LlmController` only exposes `models/:id/test`, `test-results/:id`, `set-default-model`, `default-model`). The new plan removes that assumption and routes frontend capability filtering through the existing `findAll()` → providers store path.
- Architectural decision: the rewritten plan also drops the dead `isDefault: boolean` field from the frontend `LlmModel` interface (backend already removed it on 2026-07-18). Flagged as a follow-up so it does not get lost.
- Files touched: `documents/features/todo/agnes-ai-multimodal-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- No architecture diagram update was needed because the new endpoints stay inside `LlmModule` — no cross-module boundary changes.

## 2026-07-18 MCP Bridge — Implementation Phases 1-3

- Architectural decision: MCP tool output is markdown text (not structured JSON). `callTool` flattens `content[].text` to a string. Render-spec transforms parse key values from markdown using regex. This is more fragile than JSON key access — pinned fixtures + snapshot-style field-existence tests mitigate drift.
- Architectural decision: `buildRenderSpec` checks for JSON error envelope even for MCP source (attempts `JSON.parse` on the string; if the result is an object with `error: true`, returns `null`). This catches the error envelope from `callTool`'s catch block. MCP `isError` responses (successful JSON-RPC but tool failed) are a known v1 gap.
- Architectural decision: SDK import workaround for Node 24. The SDK's `exports` map `./*` wildcard maps `./client/stdio` → `./dist/cjs/client/stdio` (no `.js` extension). Node 24 doesn't auto-append `.js` for exports-map-resolved paths. Fix: resolve via `@modelcontextprotocol/sdk/client` (which has a named export), navigate to `stdio.js` in the same directory. `sdk.d.ts` provides type declarations for TS; `require()` gives `any` at runtime but the actual types are correct.
- Architectural decision: standardized `MCP_ENABLED` to `process.env.MCP_ENABLED` in both `mcp-bridge.config.ts` and `admin-agent.service.ts` with `'false'` default. Removed `ConfigService` from `AdminAgentService` constructor to avoid DI complexity.
- Architectural decision: `source` field on `ToolRenderMapping` (not an `isMcp` boolean) because it's extensible if more sources appear later. Default is `'swagger'`.

## 2026-07-18 MCP Bridge Plan — Review and Rewrite

- Moved `documents/todo/add-mcp-plan.md` to `documents/features/todo/add-mcp-plan.md` per the project rule that new feature plans should go under `documents/features/`.
- Moved remaining 3 files from `documents/todo/` to `documents/features/todo/`, deleted the empty `documents/todo/` folder, and updated `HANDOFF.md` to reflect the new structure.
- Architectural decision: the `LlmToolSchema` extension goes on the parser's local type in `swagger-tools.parser.ts:14`, not on `llm/types/llm.types.ts`. There are two types in the codebase; the parser's is what `SwaggerToolsParser.getTools()` actually returns and the agent consumes, while `llm.types.ts` is the LLM-facing wire type. Keeping `source` off the LLM-facing type also means it cannot accidentally leak into the LLM's view of the tool list.
- Architectural decision: the render-spec adapter uses a per-mapping `unwrapResult: boolean` flag (default `true`, `false` for MCP). The alternative — wrapping MCP results in `ServiceResultContainer` — would force every future MCP server to match the backend's wrapper shape and defeat the "generic bridge" goal. The `unwrapResult` flag keeps each mapping explicit about its input contract.
- Architectural decision: the MCP bridge module is a top-level NestJS module under `src/modules/mcp-bridge/`, not a sub-module of `admin-agent`. Reasoning: it owns its own lifecycle (spawn/close), has no internal coupling to admin-agent types, and should be reusable in other NestJS apps. The bridge is opt-in via `MCP_ENABLED=false` default so the system boots unchanged when the bridge is off.
- Architectural decision: the bridge's `callTool` wraps thrown errors in a `{error:true, source:'mcp', toolName, message}` JSON envelope so render-spec's existing error short-circuit handles them cleanly. Without this, a transient MCP failure bubbles into `executeToolCallSafely`'s generic catch and produces a less informative error to the user.
- No code was changed in this session. No architecture diagram update was needed because the plan is still pre-implementation.

## 2026-07-15 Remove LLM Prose Duplication of Card Data

- Added a `VISUAL RESPONSE RULE` block to `SYSTEM_CONTEXT_BASE` in `backend/src/modules/admin-agent/constants/system-context.constant.ts` that tells the LLM structured tool results are auto-rendered as visual cards and that prose should not duplicate the same numbers/rows in markdown tables, bullet lists, or inline lists.
- Listed the 11 render-bearing tool types by name (weather forecast, currency conversion, users table, analytics chart, system status, database storage, chat sessions, transcript, LLM test results, delete confirmation, register form) so the rule has an explicit enumeration.
- Allowed inline reproduction only when the user explicitly asks for raw text-only output (screen reader, copy-paste).
- Architectural decision: the rule is generic across all render-bearing tools; no per-tool or per-component instruction list was added to the codebase.
- Architectural decision: the LLM still produces natural prose around the render event for the brief intro, the system-protection warnings, and the data-integrity confirmations — only the duplication of structured data is suppressed.
- No architecture diagram update was needed because this was a system-prompt instruction only; the streaming event flow, render spec contract, and `RenderSpecService` are unchanged.
- Files touched: `backend/src/modules/admin-agent/constants/system-context.constant.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.

## 2026-07-07 GenUI Speed and Quality Improvement — Implementation

- Implemented all five phases of the GenUI speed and quality improvement plan.
- **Phase 1 — Progressive Streaming Rendering:** Added `extractProgressiveComponentParts`, `sanitizeProgressiveComponentHtml`, `sanitizePartialComponentCss`, `scheduleProgressivePreview` (rAF-throttled), and `renderProgressivePreview` (stable preview host) to `AiFormat`. Closed-fence finalization reuses the preview host to avoid DOM thrash. Added `OnDestroy` cleanup.
- **Phase 2 — Smarter Chat Message Flushing:** Added `isInsideComponentStream()` to `ChatMessage`. Component streams flush 12-24 char chunks at 0ms delay; prose keeps 18-35ms cadence. Cursor hidden in component mode.
- **Phase 3 — Backend Prompt Trimming:** Split `SYSTEM_CONTEXT` into `SYSTEM_CONTEXT_BASE` and `SYSTEM_CONTEXT_GENUI`. Added `buildSystemContext({ includeGenui })` and `VISUAL_TRIGGER_KEYWORDS`. `AdminAgentService.getDynamicSystemContext()` conditionally includes GenUI. Trimmed per-template boilerplate from `gen-ui-spec.constant.ts`.
- **Phase 4 — Streaming Efficiency:** Added rAF-coalesced token buffering (`pendingTokenBuffer`, `scheduleTokenFlush`, `flushPendingTokens`) in `Chat`. Tokens flushed before `loading.set(false)`, on error, and on stream stop.
- **Phase 5 — Documentation:** Updated `documents/architecture-diagram.md` with streaming event flow sequence diagram. Added `[AdminAgentStream]` log line (firstTokenMs, totalMs, tokens, components). Created `documents/architecture/genui-streaming-protocol.md`.
- Architectural decision: progressive rendering is the default without a feature toggle; the skeleton fallback handles edge cases safely.
- Architectural decision: GenUI keyword list is simple and in code for easy reversion; a future phase can move it to per-tool metadata.
- Architectural decision: token coalescing uses rAF with setTimeout fallback for environments without requestAnimationFrame.
- No additional architecture diagram update was needed beyond the streaming event flow sub-diagram added in Phase 5.

## 2026-07-07 GenUI Speed and Quality Improvement Plan

- Added `documents/features/todo/genui-speed-and-quality-improvement-plan.md` covering five phases: frontend progressive streaming rendering, smarter chat-message flushing, backend prompt trimming, streaming and store efficiency, and documentation/observability.
- The new plan replaces the older `documents/done/genui-progressive-streaming-rendering-plan.md` as the source of truth for GenUI rendering work. The older plan is kept as historical reference and the new plan's Phase 1 is the implementation of what the older plan proposed.
- Planning decision: keep the streaming protocol (`step` / `token` / `done` JSON lines) unchanged in version 1; speed wins come from prompt trimming, rAF-coalesced token updates, a stable preview host in `AiFormat`, and a small parsed-markdown cache for the text before the ` ```component ` fence.
- Planning decision: split the backend system context into `SYSTEM_CONTEXT_BASE` and `SYSTEM_CONTEXT_GENUI`, and gate the GenUI spec on simple visual-trigger keywords to shrink prompts for short tool-call / prose requests.
- Planning decision: the architecture diagram and a new `documents/architecture/genui-streaming-protocol.md` document the streaming event flow in one place so future GenUI work does not have to rediscover the pipeline.
- No architecture diagram update was needed for this planning-only session; Phase 5 of the plan contains the explicit diagram update step.

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

## 2026-07-05 — CSS Conventions Fix Closed
- Added semantic family badge tokens + logo shadow token to `_variables.css` to retire the last hardcoded hex colors and the only remaining hardcoded `rgba` in `_layout.css`'s `.logo` rule.
- Removed the duplicate hardcoded `padding: 32px` in `chat.css`'s `.chat-history` rule that was silently overriding `padding: var(--space-4)`.

## 2026-07-06 — LLM Model Test Results Retention Implemented
- Added `deleteOldTestResults(retentionDays = 30)` to `LlmProviderService` using TypeORM `LessThan` on `createdAt`.
- Added `cleanupOldLlmModelTestResults()` cron to `LlmTasksService` with `@Cron('0 0 2 * * 0')` (Sunday 02:00 server time).
- No new module imports needed — existing wiring between `LlmProviderModule`, `LlmModule`, and `LlmTasksService` already had the dependency.
- Added `llm-provider.service.spec.ts` with 5 focused tests.
- Decision: hardcode 30-day retention and Sunday 02:00 cron for version 1.

## 2026-07-18 LLM Default Model — Per-User Fix

- Removed the legacy global-per-provider `isDefault` path: deleted `LlmProviderService.setDefaultModel()` and `POST /llm-provider/models/:id/default`. The `is_default` column/entity field remains but is now dead code.
- Added `GET /llm/default-model` to `LlmController` returning the authenticated user's current default model id from `user_llm_defaults`.
- Architectural decision: `user_llm_defaults` (one row per `user_id`) is the single source of truth for the default model; `resolveEffectiveModel()` already reads it via `getUserDefaultModel()` before any legacy fallback, so the runtime resolution was already correct — only the write path and UI flag were inconsistent.
- Architectural decision: created the missing `user_llm_defaults` table directly via the existing migration SQL because `synchronize:true` only auto-creates TypeORM entities, not raw-SQL-migrated tables. Left as a manual step; a repeatable migration runner or a real entity conversion is a future open question.
- No architecture diagram update was needed: module boundaries, request flow, and the default-resolution path are unchanged; only the dead legacy flag path was removed.

## 2026-07-18 user_llm_defaults Entity + drop is_default (follow-up)

- Converted `user_llm_defaults` into a real TypeORM entity `UserLlmDefaultEntity` (unique `user_id`, `model_id` FK to `llm_models` with `onDelete: 'CASCADE'`) and registered it in `LlmProviderModule.forFeature`, so `synchronize:true` now owns the table instead of raw SQL.
- Refactored `LlmProviderService.setUserDefaultModel`/`getUserDefaultModel` to use the repository (removed the `INSERT ... ON DUPLICATE KEY UPDATE` / `SELECT model_id` raw queries).
- Removed the dead `isDefault` field from `LlmModelEntity`; under `synchronize:true` the `is_default` column was dropped from `llm_models` and verified absent.
- Added `migrations/DropLlmModelIsDefault1752860000000.ts` for portability (the project runs `synchronize:true`, so migrations are not auto-run).
- No architecture diagram update was needed: storage representation changed but the module boundaries and default-resolution data flow are identical.

## 2026-08-17 A6 — Regression sweep (stage 1 of full audit)
- tsc --noEmit: backend 0, frontend (solution/app/spec) 0×3. jest --runInBand: 381/389, 8 fails — byte-identical set to pre-commit baseline (agent-session 3, llm-client 4, swagger-parser 1) → all pre-existing, zero new regressions from last night's commits. Hook suite 92/92. `.claude`/`css-nesting-check.mjs` clean. Finding: `frontend/tsconfig.spec.new.json` is tracked + vitest-flavored — dead-config candidate (stage 3).
- Stage 2 (ServiceResultContainer audit): 76 endpoints / 15 controllers mapped → documents/audit-service-result-container.md. 56 conform (6 documented exceptions: SSE×2, 204×3, OAuth redirect×1), 3 partial, 17 non-conform (raw passthrough clusters: admin-agent sessions, calendar events, llm image/video, ideas reads, strain-hunter). Decision: no auto-wrap — ❌ fixes are breaking changes requiring coordinated frontend sweep.
- Stage 3 (dependency map): file-level import graph across backend/src → documents/audit-dependency-map.md. 11 graph cycles ALL type-level (entities/DTOs/decorators/seeds) — zero runtime DI cycles, zero forwardRef, zero orphan modules/services. Findings: dead file math.utils.ts, 16 over-exported symbols, misplaced RequiresConfirmation decorator (admin-agent owns it, llm-provider+users consume), core/seeds reach into feature entities, frontend/tsconfig.spec.new.json = dead vitest leftover. No code modified.
- Stage 4 (SearXNG engines): fresh probe 2026-08-17 — brave "too many requests", ddg CAPTCHA, qwant CAPTCHA, startpage "Suspended: CAPTCHA", mojeek responds-but-0-results, google cse NEWLY suspended "too many requests" (was the site:-honoring workhorse yesterday). Live engines = bing only (ignores site: → our post-filter is the only correctness layer). Root cause: single static egress IP (5.29.22.109, docker bridge, NO outgoing.proxies in settings.yml, image_proxy false) — every engine rate-limits the same IP. Backlog proposal: outgoing.proxies (residential/rotating socks5-http) per engine or global in settings.yml; alternative: engine rotation cooldowns or external metasearch API. Not fixed — documented as backlog.

## 2026-08-17 A7 — Audit fixes applied: 3 partial endpoints + dead-code cleanup
- confirm-action: unified to `{success, message, result}` both branches (cancel result = `{cancelled}` nested); 4 new controller tests; frontend chat.service type updated (consumer only reads `result` — backward compatible).
- ideas PATCH /ideas/:id + POST /nightly/mark-read → HTTP-204 (aligned with delete siblings; frontend already `patch<void>`/`post<void>`).
- Dead code removed: math.utils.ts (file), user-role enum backend mirror (getUserRoleData/UserRoleOptions/UserRoleDescription — frontend has its own used copy), 12 internal symbols un-exported. Net −50 lines. Deferred: tsconfig.spec.new.json, RequiresConfirmation relocation, seeds boundary.
- SearXNG recheck: google cse STILL suspended (too many requests); duckduckgo RECOVERED and honors site: (reddit-only results). Live: bing + ddg.
- Verified: backend tsc 0, frontend tsc 0×2, targeted jest 45/45 (admin-agent.controller 15 incl. 4 new, ideas ×3).

## 2026-08-17 A8 — Mojibake fix + full-codebase foreign-char scan
- chat.ts:593 fixed: 'hoặc' (Vietnamese) → 'או' in confirmPendingAction 404 message. chat.spec 23/23, tsc 0.
- Scan (503 files, Hebrew-line + foreign-char detector): 104 hits, ALL legitimate (🚀 comments, ₪, →, ⚠️/≠ inside LLM prompts). ZERO additional mojibake. One borderline: main-sidebar.html:101 'צʼאט' uses U+02BC instead of Hebrew geresh ׳ (U+05F3) — identical display, not mojibake, left as-is.
- No mojibake-scan spec exists in project (per instruction, not created).
- CORRECTION to audit-dependency-map: frontend tests run on VITEST v4.1.7 via ng test — tsconfig.spec.new.json is ACTIVE config, NOT a dead leftover. Backlog item retracted.

## 2026-08-17 A9 — Cluster 1/5: admin-agent sessions wrapped (×4)
- GET /sessions, GET /sessions/:id/messages, POST /messages/images, POST /sessions → ServiceResultContainer, wrapped in CONTROLLER (service signatures untouched — analytics/system callers unaffected; x-has-more-images header preserved).
- Frontend: chat.service unwraps via shared core/models/service-result-container.model (first pass mistakenly invented local ApiResult — user caught, fixed to shared model). Public service API unchanged → chat.store + chat.ts untouched.
- Tests: backend controller 14/14 (incl. new wrap asserts), frontend chat.service + chat 29/29, tsc 0 both sides.
- Cluster 2/5 (calendar events ×3): GET/POST/PATCH /calendar/events wrapped in ServiceResultContainer. KEY FINDING: sole consumer = the admin-agent LLM (tools execute via internal HTTP loopback to localhost:PORT with internal JWT, built from swagger operationIds) — NO frontend consumer exists. Google Schema$Event payloads preserved verbatim under result; LLM gains shape-consistency with all other tools. 3 new shape tests; calendar specs 21/21, tsc 0.
- Cluster 3/5 (llm image/video ×4): exception check per manager — NO streaming/SSE on any endpoint (all plain request/response; createVideoTaskAndWait polls internally server-side), b64Json is regular JSON (wrap adds ~50 bytes). Consumers are DUAL: frontend media-studio (via media.service) AND the LLM agent (internal HTTP tools). All 4 wrapped; frontend media.service unwraps via shared ServiceResultContainer (public API + media-studio component untouched); LLM side needs no code change (reads container JSON like every other tool). extend has NO frontend consumer at all. llm.controller 13/13, media+media-studio 15/15, tsc 0 both.
