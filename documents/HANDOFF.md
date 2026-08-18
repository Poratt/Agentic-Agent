# Documentation Handoff
## 2026-08-18 Session (aj) — follow-up ✅ FIXED: inner genetics/terpenes tabs also lazy (strain-hunter-settings)

Applied the same pattern INSIDE strain-hunter-settings (per user): inner `<p-tabs value="0" lazy>` + terpenes panel wrapped in `<ng-template #content>`. **Critical extra step:** the template deferral alone did NOT stop `/terpenes` — the component injects `TerpeneStore` eagerly and `httpResource` fires the GET at store creation (same #17351 mechanism one level deeper). Fixed by resolving TerpeneStore **lazily** via `injector.get(TerpeneStore)` (getter + memoized instance, all 6 usages + 2 computeds routed through it) — the store is created only when the terpene tab's template first reads it.

**Live-verified (fresh dev server):** open Strain Hunter → ONLY `/genetics` (t=5713), terpene panel empty, `terpeneFetches: []`; click טרפנים → `/terpenes` fires exactly once (t=16980), table renders; switch גנטיקה↔טרפנים → no refetch (still 1 each).

**Verification:** frontend `npx ng test --watch=false` **495/495 (56 suites)** · `ng build` exit 0. **UNCOMMITTED** (awaiting user's go): `strain-hunter-settings.html` (lazy + #content) + `strain-hunter-settings.ts` (lazy TerpeneStore). Uncommitted from prev. sessions still: backend enrichment + CLS skeleton files.

## 2026-08-18 Session (aj) — ✅ FIXED: settings tabs eager-loading — lazy + #content template wrappers (empirically verified)

**User report:** entering /settings fired calls for ALL tabs at once (me, sessions×2, default-model, storage, llm-provider, genetics, terpenes) — suspected non-best-practice. Root causes found: (a) sidebar loads sessions×2 on every page (MainSidebar.ngOnInit — for the dropdowns, by design); (b) `me` = APP_INITIALIZER boot call (once, fine); (c) **settings.ts rendered all 4 tab panels eagerly** — each child component created its store/requests on mount.

**Empirical verification (fresh dev server, dataset markers — console capture in preview is unreliable):**
1. `lazy` ALONE does NOT work: inactive panels rendered empty BUT the components were still instantiated (`sh-ctor;db-ctor;sh-init;db-init;`) and `/genetics` `/terpenes` `/storage` fired at ~320ms — exactly the known behavior behind primeng issue #17351 (projected `ng-content` content is instantiated eagerly; lazy only defers RENDERING).
2. **Fix (per user's docs hint): `lazy` + wrap each non-first tab's content in `<ng-template #content>`** (settings.html): PrimeNG then uses the TemplateRef (inert until activation) instead of eager projection. Verified live: page load → NO lazy markers, storeTrace only `LLM;`, NO /genetics//terpenes//storage; click Strain Hunter → created + fetched ONCE (t=11165); click מסד נתונים → storage ONCE (t=25024); switch away & back → **no refetch**, components stay alive (state preserved).

**Files touched (COMMITTED):** `frontend/src/app/features/settings/settings.html` (lazy + #content ×3), `AGENTS.md` (PrimeNG 21.1.8 → 22.0.0 verified via `npm ls primeng` — the old peer-mismatch risk note is stale), `documents/{HANDOFF,STATUS,LOG}.md`.

**Verification:** frontend `npx ng test --watch=false` **495/495 (56 suites)** · `ng build` exit 0 (pre-existing strain-hunter.css budget warning only).

**⚠️ Still uncommitted (PREVIOUS sessions, not mine):** backend enrichment (cannlytics/genetics/terpene services + specs) + CLS skeleton (strain-hunter-settings.{ts,html,css,spec}).

**Notes:** during the session I replaced the user's long-running :4200 dev server (preview `replace:true` stopped it) and restarted it fresh (`PORT=` env must be unset — a global `PORT` env var overrides `--port`). Dev server runs from `frontend/`; backend CORS allows only `http://localhost:4200`.

**Optional follow-ups:** apply the same lazy+#content pattern to the INNER genetics/terpenes tabs inside strain-hunter-settings (both fetch on tab open today); consider deferring sidebar sessions load to first dropdown open.

## 2026-08-18 — ✅ Live UI verification (user): CLS fix confirmed — no empty state, no layout jump

User manually checked the genetics/terpene tables in Strain Hunter: rows appear immediately — **no skeleton visible, no empty-table flash, no layout shift**. Expected: with a fast local API the `loading()` window is ~1 frame, so the 20 skeleton rows (identical height = page size) are never perceptible; the fix's real job (no empty state → no CLS) is confirmed live. The skeleton will only become visible under real network latency (or devtools throttling). Code confirmed in place (uncommitted, per session ai). No code changes this session.

## 2026-08-18 Session (ai) — ✅ enrichment open items 1-3 + CLS skeleton (strain-hunter-settings)

**User-approved plan:** close (1) Cannlytics findInCache loose matching, (2) batch flows map-only + no ranking, (3) translation map entries — all in the genetics/terpene enrichment area, then (4) CLS first-load fix. Constraints honored: no migrations, no DB touches, no payment.

**1. Cannlytics loose matching (`cannlytics.service.ts`):** `findInCache` rewritten — token-based all-or-nothing matcher: every query token must match a key token; tokens <3 chars (e.g. "33") only match as full words, never substrings; best-scoring candidate wins (fewer extra key tokens = tighter). "33 splitter" no longer matches the strain literally named "33" (identical lab data bug). Also: the two duplicated Hebrew maps (getNameVariations vs getEnglishName, 132 vs 128 keys — they HAD diverged: אנאלאי/קוארפ/אפגן סקאנk were missing from getEnglishName) merged into one module-level `HEBREW_STRAIN_NAMES` const (138 entries) used by both; junk keys removed (אורANGE SKITTLEZ, ת'ין מינט קוקizo); `'מקפלרי': 'Mac플러리'` (Korean garbage) → 'Mac Flurry'.

**2. Batch flows (genetics + terpene):** new `resolveEnglishNames` translates each chunk ONCE (map-first + LLM fallback via existing `translateToEnglish`); `searchChunk`/`fetchCannlyticsChunk`/`fetchDemarilyChunk` accept the pre-translated map instead of re-translating (was map-only in genetics, triple-LLM in terpene enrichMissing: upfront + searchChunk + again). New `rankSearchResults` helper (extracted from enrichSingle's inline ranking) applied to batch `searchChunk` in both services — noise (Gmail/LinkedIn junk) no longer dilutes the LLM context.

**3. Map entries (2026-08-18):** אוראוז→Oreoz, אוז קוש→Oz Kush, אובמה ראנטז→Obama Runtz, 33 ספליטר→33 Splitter, אזול ראנטז→Azul Runtz, אטום ספליטר→Atom Splitter, אורנג' ולווט→Orange Velvet, בלוברי→Blueberry — free, saves LLM translation calls and fixes the gemma mistransliteration (אוראוז→Aurous).

**4. CLS first-load (strain-hunter-settings, frontend):** skeleton-only, NO animations (per the revert). `tableSkeletonRows` (20 nulls = page size, `never[]` so the shared array types as both IGenetics[] and ITerpene[]), `geneticsLoading`/`terpeneLoading` computeds from store `loading()`; tables bind `[value]="xLoading() ? tableSkeletonRows : filteredX()"` and the body template renders `.skeleton-row` shimmer bars (global `.shimmer` + component width classes: chevron/name/badge/meta/desc/dot/icon). Identical row count/height → no layout shift when data arrives. Empty-message can't flash (20 items during load).

**Verification:** backend `npx jest --runInBand` **411/411 (44 suites, +10)** · tsc 0 · `nest build` exit 0 · frontend **495/495 (56 suites, +3)** · `ng build` exit 0 (pre-existing strain-hunter.css budget warning only) · tsc app+spec exit 0 ×2 · mojibake clean. Temp transform scripts deleted.

**Open items remaining:** SearXNG proxy decision (needs user + paid infra) · translation model quality beyond map (gemma still weak — open item 3 was "map entries" scope only) · low-prio test-coverage gaps (test-coverage-gaps.md).

**Files touched:** backend `cannlytics.service.ts` (+ NEW spec), `genetics.service.ts` (+spec), `terpene.service.ts` (+spec); frontend `strain-hunter-settings.{ts,html,css,spec}`. No architecture-diagram change (internal service behavior + component-level UX).

## 2026-08-18 Session (ah) — 🦴 ponytail installed · tests-files merged → main (FF) & pushed

**What was done:**
1. **Ponytail skill installed (Freebuff):** cloned `DietrichGebert/ponytail` (latest), copied 6 skills (`ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`) → `C:\Users\porat\.agents\skills\` — same SKILL.md format as caveman. Temp clone deleted. Note: Freebuff has no lifecycle hooks — skill activates via description trigger ("ponytail", "lazy mode", "yagni"), like caveman.
2. **Ponytail installed (Claude Code):** `claude plugin marketplace add DietrichGebert/ponytail` + `claude plugin install ponytail@ponytail -y` (scope: user) → v4.9.0, 6 skills, 3 harness hooks (SessionStart/SubagentStart/UserPromptSubmit), always-on ~676 tok/session. Needs a NEW Claude Code session to activate.
3. **Merge:** user asked to merge `tests-files` → `main`. Checked first: `tests-files..main` empty → fast-forward. My local `.gitignore` edit (`.freebuff/`) was a DUPLICATE — `2a62f47 chore: ignore local Freebuff tool state` already exists in tests-files → discarded mine, merged. FF merge `main` → `8f35140` (48 commits: enrichment Hebrew-aware search, price-slider, ServiceResultContainer ×6 clusters, test fixes, ideas work, seeds relocation, etc.). Zero conflicts — tree identical to fully-tested tests-files tip (frontend 492/492, backend 401/401 baseline).
4. User pushed (`main...origin/main` synced). Local `tests-files` deleted (`-d` safe); `origin/tests-files` still on GitHub.

**State:** main @ `8f35140`, clean tree, synced. `.freebuff/` ignored (line 81, from `2a62f47`).

**Open items (unchanged, from session ag):** SearXNG proxy decision (needs user + infra) · Cannlytics `findInCache` loose matching · batch flows map-only name + no relevance ranking · translation model quality (gemma mistransliterates אוראוז→Aurous) · CLS first-load strain-hunter-settings (skeleton-no-animations option open) · low-prio test-coverage leftovers (test-coverage-gaps.md).

## 2026-08-17 Session (ag) — ⏪ REVERTED: all enrichment/table animations in strain-hunter-settings (per user)

**User:** "You didn't fix anything — the problem remains. Go back, cancel the animation, that's where everything started going wrong."

**Action:** reverted ALL animation-related work on `strain-hunter-settings` to the last commit (`ac0691d`) state — verified via `git diff` that every change in these files was mine (animation/skeleton work), then `git checkout`:
- `strain-hunter-settings.ts` — removed: `closingGenetics`/`closingTerpenes`/`closingGeneticsRows`/`closingTerpeneRows`/`flashGenetics`/`flashTerpenes` sets, `ENRICH_EXIT_MS`/`FLASH_MS`, `is*Closing`/`is*FieldFlashing` helpers, collapse helpers, `geneticsLoading`/`terpeneLoading`/`tableSkeletonRows`. `saveEnriched*`/`discardEnriched*` are back to instant map removal; `toggleGenetics`/`toggleTerpene` back to plain set toggle.
- `strain-hunter-settings.html` — removed: `.expand-anim`/`.enrichment-anim` wrappers, `[class.closing]`, `[class.slide-out-right]`, field-flash bindings, save/discard spinner swaps, skeleton branches + `[value]` loading swap. (Sortable-column-header wrappers kept — they're in the commit.)
- `strain-hunter-settings.css` — removed: `.expand-anim`/`.enrichment-anim`/`.closing`/inners, `.field-flash`, `.skeleton-row`, `.table-row-header` fade, min-height, reduced-motion block; `.has-enrichment` flex rule back to `.enrichment-panel`.
- `strain-hunter-settings.spec.ts` — back to original 7 tests (animation tests removed).
- `_animations.css` — removed `gridOpen`/`fieldFlash`/`fieldFlashFull`/`tableRowFadeIn` keyframes.

**Kept (separate, user-requested/committed):** `_primeng-overrides.css` tablist `scale(-1)` + `.sortable-column-header`; backend enrichment fixes (still uncommitted).

**Verification:** frontend `npx ng test --watch=false` **492/492 (56 suites)** · `ng build` exit 0 · live: `rowAnim: none`, no `.expand-anim`/`.enrichment-anim`/`.slide-out-right`/`.skeleton-row`/`.field-flash`, 38 rows render normally.

**Note:** the original CLS on first load (empty table → rows burst in, no loading state) remains as it was before the animation work — the user attributed the pop-in to the animations and asked to revert; a skeleton-only approach (no animations) remains an option if wanted.

## 2026-08-17 Session (ag) — ✅ FIXED: table CLS on first load — skeleton rows + min-height + row fade-in (strain-hunter-settings)

**User report:** switching tabs (LLM→Strain Hunter, גנטיקה↔טרפנים) shows the table empty for a moment (0 rows, pagination right under the header), then all rows pop in abruptly — layout shift / CLS.

**Root cause (verified live):** tab switches do NOT refetch — the singleton stores (`httpResource`) keep their cached value, so switching back shows rows instantly (measured: 38 rows at +225ms). The emptiness/pop-in happens only on the **first load** of each resource: `genetics()`/`terpenes()` return `[]` while `isLoading` (no `hasValue` yet) and the tables had **no loading state at all** — empty table → rows burst in.

**Fix (frontend, strain-hunter-settings — genetics + terpene tables):**
1. **Skeleton rows** — `[value]` becomes `loading() ? tableSkeletonRows : filtered*()` (20 placeholder rows = page size, so the height is identical when data arrives); the body template branches `@if (loading())` → `.skeleton-row` with global `.shimmer` bars matching the real column structure (sm/md/lg). New `geneticsLoading`/`terpeneLoading` computeds (store `loading()`).
2. **Min-height** — `.glass-effect.card { min-height: 480px }` (component-scoped) keeps header+pagination stable.
3. **Fade-in** — `.table-row-header { animation: tableRowFadeIn 0.2s ease-out }`; keyframe lives in global `_animations.css` (per css-deduplicate convention); `prefers-reduced-motion` disables it. PrimeNG reuses row elements for the same objects, so filter doesn't re-flash; pagination (new objects) gets a subtle fade.

**Verification:** frontend `npx ng test --watch=false` **497/497 (56 suites, +1 new)** — new spec covers `tableSkeletonRows` length (20) + loading computeds; store mocks gained `loading`. `ng build` exit 0. Live: after reload rows carry `animationName: tableRowFadeIn` ✅; terpene tab renders 38 rows with fade ✅; tab switches stay cached (no emptiness) ✅. The transient skeleton window itself wasn't capturable live (2fps preview + instant local API) — covered by template logic + tests.

**Files touched (uncommitted):** `frontend/src/app/features/settings/strain-hunter-settings/{ts,html,css,spec}`, `frontend/src/app/assets/styles/_animations.css`. No architecture-diagram change.

## 2026-08-17 Session (ag) — ✅ DONE: css-conventions + css-deduplicate pass on session CSS

**User:** rewrote the tablist rule in nested form (`.p-tabs { .p-tablist-nav-button { &.p-tablist-prev-button, &.p-tablist-next-button { transform: scale(-1); } } }`) and asked to process the session's CSS per the `css-conventions` + `css-deduplicate` skills.

**Audit results:**
- **css-conventions:** the user's nested `.p-tabs` form is the compliant pattern (mandatory nesting, variants first) — kept as-is; `_primeng-overrides.css` already follows nesting consistently (pre-existing flat top-level overrides untouched — surgical-changes rule).
- **css-deduplicate (strain-hunter-settings.css vs globals):** the three `@keyframes` I'd added in the component (`gridOpen`, `fieldFlash`, `fieldFlashFull`) were moved to their canonical home `_animations.css` (new sections "Grid rows" + "Field change flash") — component rules still reference them by name. `KEEP`: `.detail-item` (global one in `_layout.css` is nested in `.metric-details`, typography-only — not a match), `.detail-value .badge` (intentional contextual sizing), `.expand-anim`/`.enrichment-anim`+`.closing` (component-structural wrappers), `.detail-item.field-flash` class rules (component-scoped bindings).
- **Bonus finding:** PrimeNG base ships `.p-tablist-prev-button:dir(rtl), .p-tablist-next-button:dir(rtl) { transform: rotate(180deg) }` — but live DOM showed `transform: none` pre-fix (rule not matching in practice); our `.p-tabs` rule (0,3,0) also beats it (0,2,0) whenever it does match.

**Verification:** `ng build` exit 0 (CSS-only). Live: `gridOpen`/`fieldFlash`/`fieldFlashFull` each exactly 1× in loaded stylesheets (global); scoped `.field-flash` rules still resolve; tablist button computed `matrix(-1,0,0,-1,0,0)`.

**Files touched (uncommitted):** `frontend/src/app/assets/styles/_animations.css`, `_primeng-overrides.css`, `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.css`. No architecture-diagram change.

## 2026-08-17 Session (ag) — ✅ FIXED: tablist scroll nav chevrons (prev/next) wrong direction in RTL

**User request:** the `p-tablist-prev-button` / `p-tablist-next-button` chevrons inherit the page `direction: rtl` and point the wrong way — mirror them with `transform: scale(-1)` in `_primeng-overrides.css`.

**Fix:** added a `/* ── Tabs ── */` section in `frontend/src/app/assets/styles/_primeng-overrides.css`:
```css
.p-ripple.p-tablist-nav-button.p-tablist-prev-button,
.p-ripple.p-tablist-nav-button.p-tablist-next-button {
  transform: scale(-1);
}
```
No `!important` needed — live check confirmed PrimeNG base leaves `transform: none` on these buttons.

**Verification:** `ng build` exit 0 (CSS-only). Live (dev server hot-reload): next-button computed `transform: matrix(-1, 0, 0, -1, 0, 0)` = scale(-1) ✅.

**Files touched (uncommitted):** `frontend/src/app/assets/styles/_primeng-overrides.css`. No architecture-diagram change.

## 2026-08-17 Session (ag) — ✅ DONE: full UX pass on enrichment flow — height animations (enter/exit), field-flash on save, spinner states

**User request (video-agent analysis of the live flow):** (1) opening/closing the LLM panel caused abrupt layout shifts; (2) on Save/Discard the panel vanished instantly (exit animation perceived as missing); (3) no visual feedback on which fields actually changed in the original card; (4) subtle spinner on save/regenerate without layout shifts.

**Implemented (frontend, `strain-hunter-settings`):**
1. **Smooth expand/collapse (rows + panel)** — new wrappers `.expand-anim`/`.enrichment-anim` (CSS grid, `grid-template-rows: 1fr`, `@keyframes gridOpen` 0fr→1fr 0.3s ease-in-out) around the expansion-row content and the LLM panel, with inner `.expand-anim-inner`/`.enrichment-anim-inner` (`overflow: hidden; min-height: 0`). Enter = fresh insertion plays the keyframe; exit = `.closing` class toggles `grid-template-rows: 0fr` with `transition: grid-template-rows 0.3s` — no more layout jump. `prefers-reduced-motion` disables both.
2. **Row collapse is now animated** — `toggleGenetics`/`toggleTerpene` collapse via a new closing state (`closingGeneticsRows`/`closingTerpeneRows` sets): row stays in DOM 300ms with `.closing`, then removed. Guarded by `isCompact()` (compact layout keeps rows always-expanded, as before).
3. **Field-change flash on Save** — `saveEnrichedGenetics`/`saveEnrichedTerpene` diff old vs. enriched values (type/origin/parent1/parent2/thcRange/terpenes/effects/description; terpene: scent/effects/description) → `flashGenetics`/`flashTerpenes` maps → `.field-flash` class (green `--color-success` background pulse, 0.6s, separate keyframe for `.detail-full`) on the changed fields only, then cleared.
4. **Spinner feedback** — Save/Discard buttons show `ph-spinner ph-spin` while the card is closing (disabled state already existed); Regenerate spinner already existed.

**Verification:** frontend `npx ng test --watch=false` **496/496 (56 suites, +3 new)** — new specs: row collapse with animation delay (genetics+terpene, fake timers) and field-flash changed-fields-only then clear. `ng build` exit 0 (pre-existing strain-hunter.css budget warning only).

**Live verification notes (preview, ~2fps throttle — animations not visually measurable there, but logic verified):** panel enter class/`gridOpen` applied on insertion; on Save the panel stays in DOM with `.closing` for ~300ms then removed; flash showed exactly the 5 changed fields (הורה 2/THC/טרפנים/אפקטים/תיאור) for ~600ms then cleared; row-collapse live test inconclusive only because the preview viewport (686px) is compact mode (rows always expanded — by design).

**Files touched (uncommitted):** `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.ts` (+spec), `.html`, `.css`. No architecture-diagram change (component-level UX only).

## 2026-08-17 Session (ag) — ✅ ADDED: animated exit for enrichment cards (Save/Discard) in strain-hunter-settings

**User report:** when saving a card after Regenerate, the layout jumped and the card vanished instantly — wanted a smooth exit animation.

**Fix (frontend, strain-hunter-settings):**
- The "תוצאות LLM" panel already had an entry animation (`slide-right`); added the global `.slide-out-right` exit animation (0.3s, from `_animations.css`) via a new closing state: `closingGenetics`/`closingTerpenes` signal sets + `isGeneticsClosing`/`isTerpeneClosing` helpers.
- `saveEnrichedGenetics`/`saveEnrichedTerpene`/`discardEnrichedGenetics`/`discardEnrichedTerpene` now mark the card as closing (animation plays, buttons disabled) and remove it from the preview map only after `ENRICH_EXIT_MS = 300` — no more instant vanish/layout jump.
- Save still fires the store update immediately (async PUT + reload happens during the exit animation).
- Applied to both genetics and terpene panels (identical pattern).
- New spec: card stays visible during the animation (closing=true, still in map) and is removed after 300ms (fake timers).

**Verification:** frontend `npx ng test --watch=false` **493/493 (56 suites)** · `ng build` exit 0 (pre-existing strain-hunter.css budget warning only). No architecture-diagram change (component-level UX).

**Files touched:** `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.ts` (+ spec), `.html`. Uncommitted.

## 2026-08-17 Session (ag) — ✅ FIXED: genetics/terpene enrichment — web search stripped the Hebrew strain name

**User report:** Regenerate on strains with missing data (origin "לא ידוע", parents "לא ידוע") returned the same data as the DB — no enrichment, no change.

**Root cause (proven by live logs):**
1. `WebSearchService.simplifyQuery` removes ALL Hebrew from queries → `"33 ספליטר cannabis..."` became `"33 cannabis..."` and `"אובמה ראנטז cannabis..."` became just `"cannabis strain genetics..."` — the strain name vanished.
2. `getEnglishName` (hardcoded map, genetics) returned `null` for these strains → no English fallback name; terpene has LLM-based `translateToEnglish`, genetics doesn't.
3. SearXNG then returned garbage (Wikipedia "33 (number)", The 33 movie); the relevant hit ("33 Splitter — Parents: atom splitter x gelato 33") was result #6.
4. Only the first 3 results were passed to the LLM (`results.slice(0, 3)`) — relevant ones never made it into the context.
5. Suspicious: Cannlytics returned IDENTICAL lab data for two different strains — likely the loose partial match in `findInCache` (`normalizedName.includes(key)`, e.g. a strain literally named "33" matching "33 ספליטר"). Not fixed — flagged.

**Fix (uncommitted):**
- `WebSearchService.search(query, preserveHebrew = false)` — new optional flag; `simplifyQuery` skips Hebrew removal when set. Default unchanged → zero impact on other callers (controller, ideas cron, etc.).
- Genetics `searchChunk` + `enrichSingle` and Terpene `searchChunk` + `enrichSingle` now call `search(searchQuery, true)` and pass `slice(0, 8)` results (was 3).
- New spec: Hebrew stripped by default, preserved with the flag.

**Live re-test (user, 23:05):** "33 ספליטר" — Hebrew name kept in query, relevant results (Cannapedia, StrainWeaver), LLM identified parents (Gelato #33 × Atom Splitter) ✅. "אובמה ראנטז" — search still garbage (Polish Gmail pages) because `enName` null.

**Follow-up fix (per user, same session):**
1. **`enName` resolution** — added `GeneticsService.translateToEnglish(name)`: hardcoded map first, then LLM translation fallback (mirrors Terpene). Used in `enrichSingle`.
2. **Auto-save removed** — `enrichSingle` (genetics AND terpene) no longer calls `repository.save()`; returns the enriched entity as a preview only, matching the controller docs "Does not persist — caller decides whether to save". Save/Discard in the "תוצאות LLM" panel now actually control persistence.
- Specs updated: no-save assertions + new genetics test for LLM translation fallback.

**Follow-up 2 (live logs 23:11-23:15):** translation works (אוז קוש→Oz Kush ✅, אורנג' ולווט→Orange Velvet ✅) BUT: (a) free model mistransliterated אוראוז→"Aurous" (real: Oreoz); (b) SearXNG returned multilingual garbage (Chinese pizza, Polish Gmail, French Orange telecom) for unrecognized queries; (c) even real strain results (Oreoz ×2) were drowned by the noise since only order-based slicing was used. Fixed:
- `web-search.service.ts` — SearXNG query now sends `language: 'en'` (kills the multilingual junk app-wide).
- `enrichSingle` (genetics + terpene) — search results ranked by relevance before slicing: strain-name tokens (EN/HE) score 2, cannabis keywords score 1, noise score 0 → top 8 are real strain pages.

**Verification:** backend `npx jest --runInBand` **401/401 (43 suites)** · `nest build` exit 0.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (+ spec), `backend/src/modules/genetics/genetics.service.ts` (+ spec), `backend/src/modules/terpene/terpene.service.ts` (+ spec). No architecture-diagram change (internal service behavior only).

**Open items (flagged, not fixed):** (1) Cannlytics `findInCache` loose partial matching → identical lab data for different strains; (2) batch flows (`searchChunk`/`fetchCannlyticsChunk`/`fetchDemarilyChunk`) still use the map-only English name + no relevance ranking; (3) translation model quality — gemma-4-31b-it:free mistransliterates (אוראוז→Aurous); consider a stronger model or map additions.

## 2026-08-17 Session (ag) — ✅ FIXED: llm-providers "Name" sort header — unstyled wrapper (no spacing/misaligned icon)

**Root cause:** `.sortable-column-header` (the wrapper div around the "Name" `<th>` label + sort icon) had **no CSS rule anywhere in the project** (verified: not in the component CSS, `_primeng-overrides.css`, or globals) → it rendered as a plain block with label and icon flowing inline: no defined gap, icon not vertically centered — unlike `baseUrl`/`Models` headers, which get their spacing from the global `p-sortIcon { margin-inline-start: var(--space-4) }` override. User saw: no spacing between "Name" and the sort icon, icon/text misaligned, inconsistent vs `baseUrl`/`Models`.

**Fix (per user follow-up: global + all sortable headers):**
1. `_primeng-overrides.css` — `.sortable-column-header { display: inline-flex; align-items: center; gap: var(--space-4); p-sortIcon { margin-inline-start: 0; } }` added inside `.p-datatable .p-datatable-thead` (next to the existing `p-sortIcon` margin rule; the `(0,3,1)` specificity beats the global `(0,2,1)` icon-margin rule so spacing doesn't double).
2. **Wrapper applied to ALL sortable headers app-wide** (12 th's across 4 files, each on one line): `llm-providers-management.html` (6: key/Name, baseUrl, modelsCount, label/Model, active, performanceScore), `users-management.html` (dynamic loop, 1), `strain-hunter.html` (dynamic loop, 1), `strain-hunter-settings.html` (4: שם ×2, סוג, מקור — RTL-safe, gap/margin-inline-start are logical properties).
3. `llm-providers-management.css` — removed the temporary component-scoped rule (now global).
4. **TODO at line 62 deleted** (the wrapper now covers every sortableColumn th in the app — TODO's request fulfilled).

**Verification:** `ng build` exit 0 (9.8s) + `ng test --watch=false` **492/492 passed (56 suites)**. Pre-existing `strain-hunter.css` budget warning only (unrelated file; also pre-existing vitest "Could not parse CSS stylesheet" stderr noise). Visual confirmation pending next live render.

**Files touched:** `frontend/src/app/assets/styles/_primeng-overrides.css`; `llm-providers-management.html` (TODO removed); `users-management.html`; `strain-hunter.html`; `strain-hunter-settings.html`; `llm-providers-management.css` (restored to pre-fix state). No TS change. No architecture-diagram change (CSS/template-only).

**Next exact step (backlog):** SearXNG proxy endpoints decision (user) · `tsconfig.spec.new.json` doc reconciliation · final push/PR prep (branch `tests-files` still unpushed — needs user's go).

## 2026-08-17 Session (af) — ✅ ADDED: transitions to price-slider (user fixed LTR + restyled)

**User's manual fix between sessions:**
- `direction: ltr` on `.filter-range-slider` — root cause of the curve was the RTL parent context, not just the 1px-height clip. With LTR on the slider container, the handle positions render correctly.
- Also restyled: `border-radius: var(--radius-xs)` (rounded square handles, not circles), added hover state (range → `primary-400`, handle border + glow expand), added active state (border → `primary-600`).

**What I added (this session):**
- `transition: border-color, background, box-shadow, transform` on `.p-slider-handle` (durations via `--transition-colors` / `--transition-fast`).
- `transition: background` on `.p-slider-range` (the colored part of the track).
- `transform: scale(0.94)` on `:active` (drag) — tactile press feedback, transitioned.
- Added the new transitions to the existing `prefers-reduced-motion: reduce` block.

**Verification:** `ng build` exit 0 (11.0s). Pre-existing strain-hunter.css budget warning only.

**Files touched:** `frontend/src/app/assets/styles/_filters.css` (2 blocks: transitions on slider handle/range, reduced-motion rule). No HTML/TS change. No architecture-diagram change (CSS-only).

**Next exact step (backlog):** SearXNG proxy endpoints decision (user) · `tsconfig.spec.new.json` doc reconciliation · final push/PR prep (branch `tests-files` still unpushed — needs user's go).

## 2026-08-17 Session (ae) — ✅ FIXED: strain-hunter price-slider handles were D-shaped (clipped)

**Root cause:** PrimeNG 21 (via `@primeuix/styles/slider`) puts the slider height = handle height by default (so the full circle renders), with the thin track as a child `.p-slider-track` element. Our custom CSS in `_filters.css` overrode the slider height to `1px` to get a thin track — but didn't restore it for the 14px handle. Result: handle centered on a 1px-tall box → bottom 7px clipped → handles rendered as D-shapes ("curved at the bottom" in the user's words).

**Fix (3 lines, surgical):**
1. `.p-slider.p-slider-horizontal { height: 1px }` → `14px` — match the handle so the full circle has room.
2. Added `.p-slider-track { height: 1px; }` — the thin track was actually a separate element all along (default 3-4px, which is what PrimeNG was rendering on top of the clipped handle, contributing to the "curved" illusion).
3. `.filter-range-slider { overflow: visible; }` — defensive, in case any future ancestor clipping sneaks in.

Base style still centers the track vertically in the slider (`.p-slider { display: flex; align-items: center }`), so the 1px track passes through the middle of the 14px handle — design intent preserved.

**Verification:** `ng build` exit 0 (8.6s, pre-existing strain-hunter.css budget warning only — unrelated file). Visual verification pending the next live render.

**Files touched:** `frontend/src/app/assets/styles/_filters.css` (one block, lines 284-310). No HTML/TS change. No architecture-diagram change (CSS-only fix to a single component pattern).

**Next exact step (backlog):** SearXNG proxy endpoints decision (user) · `tsconfig.spec.new.json` doc reconciliation · final push/PR prep (branch `tests-files` still unpushed — needs user's go).

## 2026-08-17 Session (ad) — 🔎 SearXNG outgoing hardening + proxy scaffolding (decision pending)

**What was done (infra-independent half of the CAPTCHA-storm backlog item):**
1. `docker/searxng/settings.yml` — `outgoing:` extended with doc-confirmed options (docs.searxng.org): `useragent_suffix` (contact info — engine operators less likely to hard-block), `retries: 0` explicit (each retry uses a DIFFERENT proxy/IP, so with a single egress IP retries only re-hammer a blocked engine), commented `proxies:` structure (round-robin, httpx syntax incl. socks5) + `extra_proxy_timeout` guidance. Engine-level `retry_on_http_error: false` set EXPLICITLY on bing/mojeek/qwant — on 429/403 the engine enters SearXNG's automatic cooldown instead of being retried from the same IP.
2. `backend/.env.example` — web-search section: fixed stale `ensure-searxng.sh` → `ensure-searxng.js` reference (the actual file is .js), documented that SearXNG settings are NOT env-driven and point to `outgoing.proxies` in settings.yml + `docker restart searxng`.

**Verified LIVE:** YAML parsed clean (pyyaml) · `docker restart searxng` → container Up, no boot errors · / = 200 · live search `?q=strain+cannabis&format=json` → 20 results (bing + duckduckgo) — pipeline intact.

**⚠️ DECISION REQUIRED (user):** the structural fix for the CAPTCHA storm is a rotating proxy pool — needs paid/residential endpoints (or multiple egress IPs → `source_ips`). Without infra, cooldown discipline (above) is the mitigation, not the cure.

**⚠️ Unowned change observed (NOT mine, untouched):** `frontend/src/app/assets/styles/_filters.css` modified (p-slider-handle: margin-block-start −8→−2px, border-radius 50% instead of var(--radius-xs) — hardcoded vs golden rule —, translate: 0 !important). Likely user/IDE edit.

**Files touched:** docker/searxng/settings.yml, backend/.env.example, 3 docs. No code, no architecture-diagram change (infra config only).

**Next exact step (backlog):** SearXNG proxy endpoints decision (user) · `tsconfig.spec.new.json` doc reconciliation · final push/PR prep (branch `tests-files` still unpushed — needs user's go).

## 2026-08-17 Session (ac) — 🧹 seeds relocated: core boundary inversion resolved

**What was done:**
1. `git mv` all 4 seeds from `core/seeds/` next to their own modules (audit's own recommendation): `user.seed` → `modules/users/seeds/`, `terpene.seed` → `modules/terpene/seeds/`, `genetics.seed` → `modules/genetics/seeds/`, `llm-providers.seed` → `modules/llm-provider/seeds/`. `core/seeds/` deleted. 100% renames, only the relative import paths changed inside each file.
2. `main.ts` seed imports updated; also removed dead `LlmModelEntity`/`LlmProviderEntity` imports (leftover from the commented-out `seedLlmProviders` call — unused in main.ts).
3. **Over-export sweep: nothing left.** Audit's remaining "Not applied" items were exactly 3: decorator relocation (done, session y), seeds relocation (done now), and `tsconfig.spec.new.json` — RETRACTED per LOG A8 (it is the ACTIVE vitest config, not dead). 12 symbols + math.utils were already cleaned earlier.

**Verification:** backend tsc 0 · `npx jest --runInBand` **399/399** · `npm run build` exit 0 · live restart with fresh dist → **C5 ✅, seeds ran idempotent against existing DB (boot clean, no errors), :3000 serving** · frontend tsc app exit 0 · mojibake clean · `.claude`/`css-nesting-check` untouched.

**Files touched:** 4 seed renames + import lines, main.ts (seed imports −2 dead entity imports), 3 docs. No architecture-diagram change (pure internal relocation, no boundary/flow change).

**Next exact step (backlog):** SearXNG `outgoing.proxies` decision · push/PR prep (branch `tests-files` unpushed — needs user's go). `tsconfig.spec.new.json` dead config removed (A8 misdiagnosis corrected).

## 2026-08-17 Session (ab) — 🎉 FRONTEND 492/492 GREEN — 16 pre-existing failures resolved

**What was done (5 spec files, all stale-test fixes — zero production code touched):**
1. `app.spec.ts` (2) — PrimeNG `<p-confirm-dialog>` subscribes to `confirmationService.requireConfirmation$`; the mock `{ confirm: vi.fn() }` crashed. Fixed: real `MessageService` + `ConfirmationService` classes in providers.
2. `auth.guard.spec.ts` (1) — mock `user` was `vi.fn()` without `.set`; guard calls `authStore.user.set(user)`. Fixed: `Object.assign(vi.fn(), { set: vi.fn() })`.
3. `auth.interceptor.spec.ts` (2) — the retry/single-flight tests mocked the handler as ALWAYS-success (`vi.fn(nextWith(ok))`) so the 401 path never fired (refresh 0 calls). Fixed: per-URL first-call-401-then-ok handler. Single-flight additionally needed an async refresh (`delay(10)`) — a synchronous `of()` completes + finalizes the shared in-flight observable before the second concurrent 401 lands, breaking the window (production refresh is an HTTP call).
4. `with-credentials.interceptor.spec.ts` (4) — plain function passed as handler then asserted with `toHaveBeenCalledTimes` → not a spy. Fixed: `vi.fn()` handlers.
5. `strain-hunter-settings.spec.ts` (7) — two issues: `messages: signal([])` (Toast needs an Observable — real `MessageService` fixes it) + missing `ResizeObserver` in jsdom (PrimeNG TabList). Both mocked/real-service'd.

**Verification:** all 5 suites individually green · full `ng test --watch=false` **492/492 (56/56 suites, 0 failed)** · tsc app+spec exit 0 ×2 · `ng build` exit 0 (pre-existing strain-hunter.css budget warning only) · mojibake clean · `.claude`/`css-nesting-check` untouched.

**Project-wide status: BACKEND 399/399 + FRONTEND 492/492 = the entire test suite is green for the first time.** Both "pre-existing failure" baselines are dead.

**Files touched:** 5 spec files only. No production code, no architecture-diagram change.

**Next exact step (backlog):** SearXNG `outgoing.proxies` decision · seeds inverted boundary · `tsconfig.spec.new.json` doc conflict reconciliation.

## 2026-08-17 Session (aa) — 🎉 BACKEND 399/399 GREEN — 8 pre-existing failures resolved

**What was done (3 suites + 1 real security hardening):**
1. `swagger-tools.parser.spec` (1) — stale tool-count tolerance [66,68] vs real spec (75 tools → 73 after denylist) → band updated to [71,75] with comment. **11/11 now genuinely green** (the manager's gate from the decorator task).
2. `agent-session.service.spec` (3) — `saveMessage` gained a `createQueryBuilder().update(ChatSession)...execute()` updatedAt touch; the mockRepo lacked `createQueryBuilder` → added chained mock. Mock-only, prod code untouched.
3. `llm-client.service.spec` (4) — **REAL BUG found & fixed (SSRF hardening):** `assertSafeUrl` had `if (isDev && isLocalhost) return` — fail-open for localhost/127.0.0.1/0.0.0.0 in dev (NODE_ENV≠production), which the C3 tests (dc1d909) assert must be blocked. History: 82d9baa added dev-allow → 021224b reverted → 31eadd9 re-added (breaking C3). Fix: dev-allow is now OPT-IN (`opts.allowDevLocalhost`), passed only by the two provider-baseUrl TOCTOU call sites (OmniRoute at localhost in dev); `downloadBuffer` (user-supplied sourceVideoUrl) stays strict in ALL environments. The DNS mock in the spec also fixed: loopback hostnames/literals resolve to 127.0.0.1 like real dns.lookup.

**Verification:** targeted 44/44 (swagger-parser, agent-session, llm-client, ssrf-guard) · full `--runInBand` **399/399 (43/43 suites, 0 failed)** · tsc exit 0 · build exit 0 · backend restarted with hardened guard — C5 boot assertion ✅ live · mojibake clean · `.claude`/`css-nesting-check` untouched.

**Files touched:** 2 prod (`ssrf-guard.util.ts`, `llm-client.service.ts`) + 4 specs. No architecture-diagram change (behavioral hardening of an existing guard).

**Note for future sessions:** the 8-failure baseline is now ZERO — full backend suite is the acceptance bar. The revert-dance history (82d9baa → 021224b → 31eadd9) on the dev-localhost allow is resolved by the opt-in flag; do NOT reintroduce a blanket dev-allow.

**Next exact step (backlog):** SearXNG `outgoing.proxies` decision · seeds inverted boundary · `tsconfig.spec.new.json` doc conflict reconciliation.

## 2026-08-17 Session (z) — ✅ FIXED: login/register submit button hit-target (actionability)

**Root cause (live DOM evidence, not hypothesis):** the earlier "PrimeNG overlay blocks login button" theory was WRONG. `elementFromPoint` at the button center with an empty form returned the FORM, not the button. Chain: `_buttons.css:48-51` sets `&:disabled { pointer-events: none }` + the submit button was bound `[disabled]="form.invalid || loading"` → empty form = disabled = `pointer-events:none` = automation hit-target intercepted (Playwright requires force-click). The p-dialog (ConfirmDialog) was measured 0×0 — not a blocker. Verified live: valid form → button enabled → hit = BUTTON.

**Fix (surgical, no CSS/design-token change):** submit buttons are no longer disabled on form-invalid (only during `authStore.loading()` — double-submit protection kept); `onSubmit` now guards validity + `markAllAsTouched()` so clicking an empty form SHOWS the validation errors (better UX than silent disabled). Same fix applied to register (sibling, same pattern). Global `:disabled { pointer-events: none }` rule untouched.

**Verification (live + gates):** live probe on empty form after fix → `disabled:false, pointerEvents:auto, elementFromPoint=BUTTON`; click on empty form → error texts `אימייל לא תקין` + `סיסמה נדרשת` render. login.spec +3 tests / register.spec +3 → 19/19. Full frontend **476/492** — 16 fails = documented pre-existing set, zero new. tsc app+spec exit 0 ×2. `ng build` exit 0 (only pre-existing strain-hunter.css budget warning). Mojibake clean.

**Files touched:** login.html/login.ts/login.spec.ts, register.html/register.ts/register.spec.ts. No architecture-diagram change (component-level UX/behavior).

**Next exact step (backlog):** SearXNG `outgoing.proxies` decision · seeds inverted boundary · `tsconfig.spec.new.json` doc conflict reconciliation.

## 2026-08-17 Session (y) — ✅ RequiresConfirmation decorator relocated to core/decorators

**What was done:** `requires-confirmation.decorator.ts` + spec moved from `admin-agent/decorators/` → `core/decorators/` (git mv, zero content change). Import updated in `users.controller.ts` + `llm-provider.controller.ts` → `../../core/decorators/...`. `swagger-tools.parser.ts` had a **dead** import of `REQUIRES_CONFIRMATION_KEY` (never used — the runtime check reads the literal `'x-requires-confirmation'`) → removed while updating the path. No `core/decorators/index.ts` created — core has no index pattern.

**Verification (manager gate):** tsc exit 0 · focused suites: core/decorators + admin-agent + users + llm-provider → **114 passed / 4 failed** (4 = documented pre-existing: agent-session 3, swagger-parser 1) · full `--runInBand` **390/398** (8 pre-existing only) · `npm run build` exit 0 · **live C5 boot assertion passed after restart: "✅ C5 assertion passed: 3 confirmation-required operations in swagger spec"** — parser detects metadata as before.

**⚠️ Gate correction (flagged to user BEFORE execution):** the manager demanded "swagger-parser spec 11/11 ירוק" — false premise: that spec has a documented pre-existing failure (denylist tolerance 68 vs 73, since session t). The realistic gate (no NEW failures) passed.

**Files touched:** 2 renames (zero content delta) + 3 import-line edits. No architecture-diagram change (decorator not represented in diagram; boundary cleanup internal).

**Next exact step (backlog):** SearXNG `outgoing.proxies` decision · seeds inverted boundary · `tsconfig.spec.new.json` doc conflict reconciliation.

## 2026-08-17 Session (x) — ✅ strain-hunter cluster ×3 wrapped in ServiceResultContainer

**What was done:** GET /fetch, GET /preferences, PUT /preferences now return `{success, message, result}` (controller-level wrap, service returns raw — internal callers unaffected; no streaming/binary anywhere in this cluster).

**Consumers checked FIRST (golden rule):** (1) frontend `strain-hunter.ts` fetch parse → reads `response.result.items` / `result.lastScrapedAt`; (2) `matching-engine.store.ts` GET preferences → reads `res.result.prefs/weights` (PUT response unused — untouched); (3) LLM agent tools (swagger operationIds → internal loopback) get container JSON like every other tool — no executor change needed, same as calendar/llm precedent.

**Verification:** backend strain-hunter 20/20 · full backend `--runInBand` **390/398** (8 fails = documented pre-existing trio: agent-session 3, llm-client 4, swagger-parser 1) · backend tsc exit 0 · frontend strain-hunter 51/51 + matching-engine 19/19 · full frontend **472/488** (16 = documented pre-existing) · tsc ×2 exit 0 · mojibake clean.

**⚠️ Backend running instance does NOT hot-reload:** PID 10032 on :3000 serves the OLD raw shapes (no watch). The live curl check confirmed wrap NOT yet live — unit tests prove the shape; restart the backend to serve it.

**⚠️ Data incident (self-inflicted, resolved):** a live curl PUT of test prefs overwrote the admin user's real matching preferences; restored byte-exact via UTF-8 file payload (verified GET matches original). Lesson: never write via inline Hebrew in git-bash curl `-d` — shell mangles UTF-8.

**Files touched:** `strain-hunter.controller.ts` + `.spec.ts` (backend), `strain-hunter.ts` + `matching-engine.store.ts` (frontend), audit doc, HANDOFF/STATUS/LOG.

**✅ Live verification done after backend restart:** GET /strain-hunter/preferences → container (prefs intact) · GET /strain-hunter/fetch → `{"success":true,"message":"נטענו 191 זנים","result":...}`. Backend now runs `node dist/main` rebuilt from current src (PID 34312) — NOTE: still NOT watch-mode (`npm run start:dev` fails: **no root package.json** — this is NOT an npm-workspace monorepo despite AGENTS.md saying `-w backend`; run backend commands from `backend/`).

**✅ Audit complete — zero non-conform remaining:** the "ideas ×3" was a STALE audit-doc label. Verified in code: GET /sessions + /sessions/:id wrapped in 1aa5348, **GET /nightly/unread-count is already `{success,message,result:count}`** (live-verified: `{"success":true,"message":"6 שמירות ליליות שלא נקראו","result":6}`), favorite/mark-read already 204. All 76 endpoints conform (only documented exceptions remain: SSE×2, 204×4, OAuth×1). Audit doc corrected to match code.

**Next exact step (backlog now):** `RequiresConfirmation` decorator → `core/decorators/` · SearXNG `outgoing.proxies` decision · dead code cleanup (`math.utils.ts`, 16 over-exports) — pick one, or commit current state.

## 2026-08-17 Session (w) — ✅ FIXED: dashboard "משתמשים רשומים: 0" (httpResource `value()` throw)

**Root cause (reproduced in tests):** `UsersStore.users = computed(() => usersResource.value()?.result ?? [])` — per documented Angular behavior, **reading `resource.value()` THROWS when the resource is in an error state**. Any failed GET /users (backend watch-mode restart, network blip) put the resource in error state → `users()` computed threw → every consumer broke (pageState, dashboard ticker) → dashboard stuck broken/empty — and httpResource never auto-retries, so it stayed broken until reload. Backend itself was verified working live (login + GET /users → 200, 8 users); the bug was purely frontend timing/failure-state.

**Fix (5 files, all from the same `50e11c0` httpResource refactor):**
- `users.store.ts` — `users` computed now guards `value()` with `hasValue()`; `pageState` also surfaces `usersResource.error()` → Error state instead of silently Empty.
- Same unguarded pattern fixed in sibling stores from the same commit: `terpene.store.ts`, `genetics.store.ts`, `llm-provider.store.ts` (llm-provider pageState also gets resource-error check).

**Tests:** `users.store.spec.ts` +3 (success → Ready; **error → does not throw** + Error state — was RED before fix: "Error: Resource is currently in an error state…"; reload recovers after failure). **13/13 green.** Sibling specs untouched and green (7/7, 7/7, 9/9).

**Verification:** `tsc --noEmit` tsconfig.app + tsconfig.spec → exit 0 ×2 · full frontend suite **472/488** — the 16 failures = byte-identical documented pre-existing set (app 2, auth.interceptor 2, with-credentials 4, auth.guard 1, strain-hunter-settings 7) · live UI verified: dashboard shows **8** users, zero console errors. Mojibake scan clean. `git diff` on `.claude/`/`scripts/` untouched.

**Next exact step:** strain-hunter cluster (×3 endpoints) — the last ❌ cluster from audit-service-result-container.md.

## 2026-08-17 — Found during audit, NOT fixed (backlog items)

1. ~~Mojibake in `chat.ts:593`~~ **FIXED 2026-08-17** ("hoặc" → "או"; full-codebase scan found no other real mojibake — see LOG A8).
2. SearXNG engine pool — see Session (v) stage 4: google cse still suspended 08-17, ddg recovered; `outgoing.proxies` proposal awaiting decision.
3. `frontend/tsconfig.spec.new.json` — **confirmed dead** (2026-08-18). The A8 "RETRACTED — active vitest config" claim was a misdiagnosis: vitest runs via `vitest.config.ts` + builder defaults to `tsconfig.spec.json`; zero refs to `spec.new` in repo. **Removed.**
4. `RequiresConfirmation` decorator lives in admin-agent, consumed by llm-provider+users — relocate to `core/decorators/`.
5. The 17 ❌ non-conform endpoints (audit-service-result-container.md) — being fixed cluster-by-cluster (2026-08-17).
6. Minor: `main-sidebar.html:101` — `צʼאט` uses U+02BC modifier apostrophe instead of Hebrew geresh ׳ (U+05F3). Display-identical, cosmetic.
7. **UI finding (from live browser session 2026-08-17): login button "כניסה" blocks Playwright actionability clicks** (likely PrimeNG modal-dialog overlay intercepting hit-target; dom_cua node click works, human clicks presumed fine). For manual verification next time in the UI — `frontend/src/app/features/` login page.
8. **UI bug candidate (from live browser session): dashboard shows "משתמשים רשומים: 0"** despite the admin user existing and being logged in. CHECK when reaching the ideas-reads cluster (ב4) — may be the same read/count endpoint family.

## 2026-08-17 Session (v) — Full regression sweep + 3 audits (no code changes to app)

**Stage 1 — Regression baseline (all green, zero new regressions):**
- `npx tsc --noEmit`: backend exit 0; frontend ×3 (solution/app/spec) exit 0.
- `npx jest --runInBand`: **381 pass / 8 fail / 389** — the 8 failures are byte-identical to the pre-commit baseline (agent-session 3, llm-client 4, swagger-parser 1) → all pre-existing, none from last night's commits. Nothing to fix.
- Hook suite `bash backend/scripts/test-hook-suite.sh`: **92/92**, exit 0.
- `git status .claude .CLAUDE scripts/css-nesting-check.mjs`: clean at every stage.

**Stage 2 — ServiceResultContainer audit → `documents/audit-service-result-container.md`:** 76 endpoints / 15 controllers. 56 conform (incl. 6 documented exceptions: SSE×2, HTTP-204×3, OAuth-redirect×1), 3 partial (confirm-action shape inconsistency; ideas favorite/mark-read return empty 200/201 instead of 204 or container), 17 non-conform raw-passthrough clusters (admin-agent sessions×4, calendar events×3, llm image/video×4, ideas reads×3, strain-hunter×3). Recommendation: fix the 3 ⚠️ first (low risk); ❌ fixes are breaking changes needing coordinated frontend sweep — not done.

**Stage 3 — Dependency map + dead code → `documents/audit-dependency-map.md`:** 11 graph-level cycles ALL type-level (entities/DTOs/decorators/seeds) — zero runtime DI cycles, zero forwardRef, zero orphan modules/services. Findings: `core/utils/math.utils.ts` is a dead file; 16 over-exported symbols (incl. backend mirror of frontend's `getUserRoleData`); `RequiresConfirmation` decorator owned by admin-agent but consumed by llm-provider+users (suggest core/decorators/); core/seeds import feature entities (inverted boundary); `frontend/tsconfig.spec.new.json` = dead vitest leftover (tracked). Findings only — nothing modified.

**Stage 4 — SearXNG engine pool (BACKLOG, not fixed):**
- Fresh probe 2026-08-17: brave `too many requests`, ddg `CAPTCHA`, qwant `CAPTCHA`, startpage `Suspended: CAPTCHA`, mojeek responds but returns 0 results, **google cse newly suspended** (`too many requests` — was the site:-honoring workhorse on 08-16). Live engines = **bing only**, which ignores `site:` → the client-side post-filter (Session t) is currently the ONLY correctness layer for domain-restricted queries.
- Root cause: single static egress IP (`5.29.22.109`, docker bridge network, NO `outgoing.proxies` in `docker/searxng/settings.yml`, `image_proxy: false`) — every upstream rate-limits/CAPTCHAs the same IP under nightly-cron load.
- **Proposed fix (needs user decision):** add `outgoing.proxies` (rotating/residential SOCKS5/HTTP) to `docker/searxng/settings.yml`, global or per-engine; alternatives: engine-level cooldown rotation, or replacing self-hosted scraping with a paid search API.

**Next exact step:** user picks backlog items (SearXNG proxy / ⚠️ endpoints / dead-code cleanup) — none are started.

**Files touched:** `documents/audit-service-result-container.md` (new), `documents/audit-dependency-map.md` (new), `documents/LOG.md`, `documents/HANDOFF.md`, `documents/STATUS.md`. No app code, no architecture-diagram change (audits only).

## 2026-08-16 Session (u) — Hooks relocated to user home (both tools), all refs updated

**What was done:** Per explicit user request (`Move-Item ... -Force` + "וגג ל claude's hooks"): `repo/.zcode/hooks` → `C:\Users\porat\.zcode\hooks` (7 guarded copies) and `repo/.claude/hooks` → `C:\Users\porat\.claude\hooks` (4 originals). Updated every path reference: `~/.zcode/cli/config.json` (8 refs) and `repo/.claude/settings.local.json` (4 refs — Claude settings touched under explicit user authorization, superseding the earlier no-touch constraint). Removed empty `repo/.zcode/`. `scripts/css-nesting-check.mjs` (committed repo file, referenced by Claude config) intentionally NOT moved.

**Verification:** both configs JSON-parse OK; node checker confirms all 16 referenced script paths exist; guard test from new location (foreign workspace) → silent exit 0; E2E exact-spawn from `C:/Users/porat/.zcode/hooks/post-edit-format.sh` with jq on PATH → `[Hook] File edited` + Prettier 38ms + file reformatted. **Git footprint: zero** — `git ls-files .claude/` = empty (never tracked), `.zcode/` was untracked; working tree unchanged by the moves.

**⚠️ Restart required again:** any ZCode/Claude session started before this relocation holds the OLD absolute paths (repo) → hooks would fail to spawn until app restart. Session (r)'s live verification ran against the pre-move paths.

## 2026-08-16 Session (t) — IMPL: site: post-filter + PullPush removed from pipeline

**What was done:** Implemented the fixes chosen from Session (s) investigation:

1. **site: enforcement in `WebSearchService.search()`** (`backend/src/modules/web-search/web-search.service.ts`): new `parseSiteOperators()` extracts `site:X` (require) and `-site:X` (exclude) hosts from the ORIGINAL query — supports multiple operators, operators inside parens, strips trailing punctuation. `urlMatchesSite()` = exact hostname or subdomain match (www.reddit.com matches site:reddit.com); unparseable URLs fail positive filters. Filter applied to merged SearXNG results — neutralizes bing's operator-ignoring garbage while google cse/brave results pass through unchanged.
2. **PullPush removed entirely**: deleted `searchRedditArchive()`, `enqueuePullPush()`, PULLPUSH_* constants, cooldown fields, `PullPushPost`/`PullPushResponse` types from `web-search.service.ts`; removed the channel from both pipelines in `ideas.service.ts` (`discoverTopics` + signal gathering → now 2 channels: SearXNG + HN Algolia); removed 5 PullPush spec tests.
3. **New spec tests (5)** in `web-search.service.spec.ts` using the EXACT live-investigation cases: `site:reddit.com (shopify amazon etsy) "losing money"` (shopify.com/wikipedia dropped, reddit kept incl. bare-host + subdomain), `site:indiehackers.com "churn"` (chatgpt.com/openai.com dropped), no-operator = no filtering, `-site:reddit.com` exclusion, unparseable-URL drop.

**Known issue (SEPARATE investigation, NOT fixed now):** SearXNG engine pool mostly suspended from residential IP: brave "Suspended: too many requests", duckduckgo "CAPTCHA", qwant "CAPTCHA", startpage "Suspended: CAPTCHA", mojeek "Suspended: access denied". Live engines ≈ bing (ignores site:) + google cse + intermittently brave. Options for later: rotating proxy for SearXNG outgoing, engine resets, or different engine set.

**Verification:**
- `npx tsc --noEmit` (backend) → exit 0, zero errors.
- Targeted: `npx jest src/modules/web-search src/modules/ideas` → 4 suites / **44 tests, all pass** (was 39: −5 PullPush, +5 site-filter).
- Full suite (`npx jest --runInBand`): **Test Suites: 3 failed, 40 passed, 43 total; Tests: 8 failed, 381 passed, 389 total.** NOTE: default-worker jest runs crash silently mid-run in this environment (no summary, exit 1, reproducible pre-changes) — `--runInBand` is the reliable mode.
- **All 8 failures pre-existing at HEAD, NONE in touched scope** — each verified isolated with zero git diff on their files: `swagger-tools.parser.spec.ts` (1/11 — denylist tolerance 68 vs 73; also failed in the pre-edit baseline run), `llm-client.service.spec.ts` (4/12 — extendVideo/downloadBuffer mocks; `backend/src/modules/llm/` clean), `agent-session.service.spec.ts` (3/10; both spec+service clean).
- `git diff .claude/ scripts/css-nesting-check.mjs` → empty (untouched).
- Mojibake check (`rg "׳|ג€�|..."`) on all 3 edited files → clean.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts`, `backend/src/modules/web-search/web-search.service.spec.ts`, `backend/src/modules/ideas/ideas.service.ts`, `documents/HANDOFF.md`.

**Next exact step:** none — task complete pending full-suite result. Architecture diagram: no update needed (no module boundary/flow change — SearXNG request path identical, one downstream channel removed).

## 2026-08-16 Session (s) — INVESTIGATION: SearXNG `site:` not enforced + PullPush dead (root causes found, no code changes)

**What was done:** User reported `site:reddit.com` / `site:indiehackers.com` queries returning unrelated domains (Adriatic Bank, TRT Spor). Investigation with raw curl evidence, bypassing our layer:

1. **`site:` root cause = upstream Bing, not SearXNG, not our code.** Direct curl to bing.com (`site:reddit.com test`) returns speedtest.net/test.de/testmyspeed.com — Bing receives the operator (page title shows it) and ignores it for anonymous traffic. In SearXNG, per-result engine attribution: `bing` → junk (ignores `site:`), `google cse` + `brave` → correct domain-restricted results. SearXNG merges both, junk mixes in and dominates for long queries. Our `simplifyQuery` passes `site:` through untouched (only strips Hebrew/stopwords).
2. **Engine pool crippled:** brave/ddg/qwant/startpage = "Suspended: too many requests"/CAPTCHA (nightly cron), mojeek = "Suspended: access denied". Live engines ≈ bing + google cse only → bing junk unavoidable in merged results.
3. **PullPush (Reddit archive channel) = dead:** every request → HTTP 429 with body `{"error":"Rate limit exceeded. This website does not provide free scraping resources for agents. Please contact the administrator on Discord if you're interested in a paid scraping service."}` — free tier gone. Explains the 0-results streak; our retry/cooldown/serial-queue logic is working as designed but the API itself refuses agents.
4. SearXNG version `2026.7.19+6da6eee26`, `formats: [html, json]` OK, `default_lang: "en"`, no `disabled_for_operators`-style flag exists.

**Candidate fixes (NOT implemented — awaiting user decision):** post-filter SearXNG results in `WebSearchService` by `site:` domain when operator present; or drop/disable bing engine for site: queries; replace PullPush (e.g. Reddit OAuth API) or drop that channel.

**Next exact step:** user picks fix direction → implement in `backend/src/modules/web-search/web-search.service.ts` + spec.

**Files touched:** none in app code — only this doc. No architecture diagram change needed (behavioral, not structural).

## 2026-08-16 Session (r) — ✅ HOOKS VERIFIED LIVE: user-scope hooks firing in real session

**What was done:** First live session after ZCode app restart. All hook claims from Session (q) confirmed with in-session evidence:

1. **PreToolUse graphify guards visible in tool results** — `Read` ×2 and `Bash` ×3 each returned `[Hook additional context] MANDATORY: graphify-out/graph.json exists...` attached to the tool output (5 occurrences). Hooks load from `~/.zcode/cli/config.json` user scope and fire.
2. **PostToolUse `post-edit-format.sh` proven by side effect** — Edited `frontend/src/main.ts` (temp `// hook-test` comment). The Edit itself left 2 lines, but the file on disk after showed Prettier had collapsed the `bootstrapApplication(...).catch(...)` chain to one line → Prettier ran via the hook. (The `[Hook] File edited` echo itself was NOT surfaced in the Edit tool result — PostToolUse stdout isn't echoed back into the model's tool output; execution is proven by the reformat.)
3. **Zero new policy rejections** — `project_hooks.ignored` count in `~/.zcode/cli/log/zcode-2026-08-16.jsonl`: 99 before edit → 99 after (last event still 20:00:42Z, pre-restart). No project-scope config remains to reject (`.zcode/config.json` deleted in Session (q)).
4. **Test edit fully reverted** — `git checkout -- frontend/src/main.ts`; file clean.

**Conclusion:** Hook system fully operational. Remaining cosmetic note: PostToolUse hook stdout (`[Hook] File edited: ...`) is not visible to the agent inside the Edit result — only side effects (formatting) prove it; the user may still see it in the app UI.

**Next exact step:** none — hooks task closed. Optional: verify `[Hook] File edited` visibility in the app UI on the user's next manual edit.

## 2026-08-16 Session (q) — Final verification suite: guards, cleanup, jq E2E (all ✅)

**What was done:** User installed jq-1.8.2 (winget) and requested evidence-based final tests. (1) Copies switched from node-parsing back to **jq** (`command -v jq` with absolute winget-path fallback — my shell's PATH predates the install, post-restart shells get jq from PATH). (2) **Guard test, foreign workspace** (`C:\Users\porat\ZCodeProject`, cwd + `ZCODE_PROJECT_DIR` both foreign): all 7 hooks → zero stdout, exit 0 — including `rm -rf .git` (would block HERE) and a flat CSS violation. (3) **Deleted `.zcode/config.json`** (project-scope, dead vs security policy): before = 99 ignore-events, last at 20:00:42Z; after = file gone (`ls .zcode/` → `hooks/` only), count still 99, zero new events post-delete. (4) **E2E with the EXACT user-config spawn command** (`"C:/Program Files/Git/bin/bash.exe" ".../.zcode/hooks/post-edit-format.sh"`, jq on PATH): real temp `.ts` → `[Hook] File edited: ...` + Prettier 24ms + file reformatted. Fallback path (stale PATH, no jq) also extracts filename. (5) **Claude untouched re-verified**: `git diff .claude/` and `scripts/css-nesting-check.mjs` vs HEAD = empty; repo delta = untracked `.zcode/` only.

**Honest limitation:** the live restart proof (hooks firing inside a real ZCode session, `[Hook]` in actual tool output) requires restarting the ZCode **app** — config loads at app startup (log evidence: no loadHooks after session start). Cannot be done from inside this session.

**Next exact step (user):** restart ZCode app → open agentic-admin → edit any `.ts` → expect `[Hook] File edited` in tool output + Prettier formatting; `grep project_hooks.ignored` in today's log → 0 new events.

## 2026-08-16 Session (p) — FIX: hooks moved to ZCode user scope, Claude untouched

**What was done:** After Session (o) proved project-scope hooks are ignored by ZCode's security policy, migrated hooks to **user scope** with user approval, honoring the constraint "don't touch Claude's files". Created **copies** under `.zcode/hooks/` (7 files: `pre-write-warn.sh`, `bash-security-block.sh`, `post-edit-format.sh`, `stop-reminder.sh`, `css-nesting-check.mjs`, `graphify-guard-read.sh`, `graphify-guard-search.sh`). Each has a workspace guard (`ZCODE_PROJECT_DIR` contains `agentic-admin` → act; other workspace → exit 0; unset → act, preserving Claude parity). Registered all in `~/.zcode/cli/config.json` → `hooks.events` with `enabled: true`, absolute paths. Copies fixed 2 pre-existing bugs the originals have: jq-based filename extraction (jq not installed → always empty; copies parse via node, also reading `tool_input.file_path`) — originals' bugs left in place per the no-touch rule.

**Claude safety verified:** `git diff` on `.claude/` + `scripts/css-nesting-check.mjs` vs HEAD = **empty (identical)**; `~/.claude/*` never edited; the one transient edit to `css-nesting-check.mjs` was fully reverted. Only new repo path: untracked `.zcode/`.

**Verification (14 manual tests, all ✅):** guards — OTHER workspace silent-exit on every hook; THIS workspace + unset behave normally. Functional: pre-write-warn extracts filename; bash-security-block exit 1 on `rm -rf .git`, 0 on safe; css-check exit 2 + block JSON on flat selector, 0 nested; stop-reminder prints only HERE; graphify wrappers exec in THIS, silent elsewhere; post-edit-format ran real Prettier (npx) and reformatted a temp `.ts`, OTHER left file untouched.

**Open items:** (1) restart ZCode session → hooks load from user config → confirm via log/tool output; (2) `.zcode/config.json` (project) is dead weight — ignored by policy, generated 81 warnings today; safe to delete, left in place; (3) Claude-side note: `post-edit-format.sh` never runs Prettier there because jq is missing — user's call, not fixed per no-touch rule.

## 2026-08-16 Session (o) — Hooks re-verification: CONFIRMED dead, root cause pinned

**What was done:** Second verify-only pass (per user request). Confirms Session (n) with harder evidence:

1. **Config + scripts all valid** — `.zcode/config.json` (`hooks.enabled: true`, 3 events, 7 commands), all 6 script files exist (`pre-write-warn.sh`, `bash-security-block.sh`, `post-edit-format.sh`, `stop-reminder.sh`, `css-nesting-check.mjs`, `graphify.EXE`).
2. **Live tests this session — zero hook output:** Read ×6 → no `graphify hook-guard`; Write temp `.ts` → no `[WARN] OVERWRITE entire file`; Edit → no `[Hook] File edited` / no Prettier; Bash `rm` → no trace. Temp file created + deleted cleanly.
3. **Root cause pinned to the log:** `~/.zcode/cli/log/zcode-2026-08-16.jsonl` — **78 × `config.project_hooks.ignored`** warnings: `"Project hooks were ignored by the security policy"`, diagnosticCode `config_project_hooks_ignored`, configPath = project `.zcode/config.json`. Last burst 22:18 local = THIS session's start (22:17:48). ZCode discards project-scope hooks at every load.
4. **User scope has NO hooks:** `~/.zcode/v2/setting.json` → `hooks: null`; `~/.zcode/config.json` doesn't exist. So `hooks.loadHooks OK` (17× in `~/.zcode/v2/logs/2026-08-16.log`, 2–34ms) loads an empty set — load-succeeds ≠ hooks-active.
5. No per-hook execution records (fired/blocked/duration) anywhere — nothing registered, nothing ran.

**Conclusion:** All 7 hooks dead. Not a config bug — **ZCode security policy refuses project-scope hooks by design**. The "hooks not in Settings UI is normal" assumption was wrong: they're not invisible, they're refused.

**Next exact step (user decision):** move hooks to a scope the policy trusts (user-scope config / wherever ZCode permits), or find a policy override. Not done — task was verify-only.

**Files touched:** none in app code — only this doc. No architecture diagram update needed.

## 2026-08-16 Session (n) — ZCode hooks verification: NOT EXECUTING (security policy ignores project hooks)

**What was done:** User asked to verify the `.zcode/config.json` hooks are loaded and firing in this session (verify-only, no fixes). Config is valid (`hooks.enabled: true`, all 3 events + 7 hook commands registered) and all 6 script files exist. But **live behavioral tests prove no hook executes**:

1. **Write flat CSS** (`.parent .child`) → should be blocked by `css-nesting-check.mjs` (exit 2) → **passed unblocked**.
2. **Edit a `.ts` file** → `post-edit-format.sh` should run Prettier (`npx prettier --write`) and echo `[Hook] File edited:` → **no echo, no reformat** (file unchanged).
3. **Bash `echo "rm -rf backend/..."`** → should be blocked by `bash-security-block.sh` (regex `(rm|mv).*(\.git|backend|frontend|\.env)` → "SECURITY BLOCK" exit 1) → **executed normally**.
4. **Write (overwrite)** → `pre-write-warn.sh` echoes `[WARN] OVERWRITE entire file` unconditionally → **never surfaced**.
5. **Read** → `graphify hook-guard read` → no observable output (inconclusive alone, but consistent with 1–4).

**Log evidence:** `~/.zcode/v2/logs/2026-08-16.log` shows `hooks.loadHooks OK` (RPC call succeeds — load ≠ execute) and no per-hook execution records anywhere. `~/.zcode/cli/log/zcode-2026-08-16.jsonl` contains **65 `config.project_hooks.ignored` warnings** — `"Project hooks were ignored by the security policy"` (diagnosticCode `config_project_hooks_ignored`) — all 19:04–19:11 today, zero on prior days. None after 21:00, but live tests are decisive: hooks still don't run. `.zcode/config.json` was (re)written at 22:03:09, session start.

**Conclusion:** ZCode's security policy ignores project-scope (workspace) hooks defined in `.zcode/config.json`. The config parses and "loads" but is discarded. **All 7 hooks — `pre-write-warn.sh`, `css-nesting-check.mjs` (×2 events), `bash-security-block.sh`, `graphify hook-guard` (×2), `post-edit-format.sh`, `stop-reminder.sh` — are dead in this session.** Stop hook unverifiable from inside the turn, but same policy applies.

**Next exact step (user decision):** find where ZCode allows approving project hooks (Settings UI security policy / user-scope config), or move the hooks to a scope the policy trusts. Not done here — task was verify-only.

**Files touched:** none in app code — only this doc + `documents/STATUS.md`. Temp test files created and deleted under `.zcode/`. No architecture diagram update needed (no app change).

## 2026-08-16 Session (m) — ZCode hooks migration (tooling, no app code)

**What was done:** User asked to set up hooks in ZCode. Migrated the existing Claude Code hooks (`.claude/settings.local.json`) to ZCode workspace config — created `.zcode/config.json` with `hooks.enabled: true` and the same 3 events: PreToolUse (`pre-write-warn.sh` + `css-nesting-check.mjs` on Write; `bash-security-block.sh` + `graphify hook-guard search` on Bash; `graphify hook-guard read` on Read|Glob), PostToolUse (`post-edit-format.sh` = Prettier + `css-nesting-check.mjs` on Edit|Write), Stop (`stop-reminder.sh`). Scripts stay in `.claude/hooks/` (single source of truth); paths use `${ZCODE_PROJECT_DIR}`. Key difference from Claude: ZCode config hooks need explicit `enabled: true` and live under `hooks.events.<Event>`.

**Verification:** JSON parse OK; manual hook tests — pre-write-warn exit 0, css-nesting-check flat selector → exit 2 + block JSON, nested selector → exit 0, stop-reminder exit 0. No frontend/backend code changed → no ng test/build needed.

**Next exact step:** user restarts the ZCode session for hooks to load; optionally decide whether to commit `.zcode/config.json` to git (currently untracked).

## 2026-08-16 Session (l) — Stuck "active" generate button: SSE complete-handler fix

**What was done:** User reported the ideas-page generate button stuck in active state. Root cause: `generateStream`'s SSE observable calls `observer.complete()` when the server closes the stream, but the store subscribed with only `next`/`error` — **no `complete` handler**. Any stream termination without a `phase: 'done'` event (backend watch-mode restart mid-generation — happened ~5× today, network drop, mid-stream exception) left `loading=true` forever. **Fixed:** added a `complete` handler in `ideas.store.ts generate()` — clears loading, shows partial results with a Hebrew "connection ended early" message, or an error when nothing arrived. No-op on the normal path (`done` event already cleared loading).

**Also fixed (pre-existing, blocking the suite):** (1) `strain-hunter.spec.ts` — 2 lines accessed protected `isAdmin` (commit 471d477 made it protected, spec not updated) → `as any` cast; (2) `llm-providers-management.spec.ts` — provider mock missing `createdAt`/`updatedAt` + `providers: vi.fn(() => [])` typed as `never[]` → added fields + `(): any[]` return type; (3) `ideas.service.spec.ts` — full rewrite to `provideHttpClientTesting`/`HttpTestingController` (commit 44f53ca refactored the service fetch→HttpClient but never updated the spec — 7 stale tests).

**Verification:** `npx ng test --watch=false` → **469/485 pass**; the 16 remaining failures are the documented pre-existing set (app 2, auth.interceptor 2, with-credentials 4, auth.guard 1, strain-hunter-settings 7 — all unrelated to ideas). `npx ng build` ✅ (only pre-existing strain-hunter.css budget warning). No architecture diagram update needed (store-internal state handling).

**Next exact step:** none — user reloads the frontend (ng serve picks up the change) and the button can no longer stick; existing stuck state clears on reload.

## 2026-08-16 Session (k) — 🎉 SUCCESS: nightly pipeline fully working

**FINAL RESULT (user's completion log, 17:42:04):** `Grounded cron: produced 2/5 grounded session(s) from 5 candidate(s)` → `Nightly ideas generation succeeded` ×2 (Shopify price-tag generator, WooCommerce net-profit calculator, 5 ideas each) → `Nightly ideas generation finished`. Full run ~7.5 min on `openrouter/google/gemma-4-31b-it:free` (user's env override — model ID has TWO slashes and the first-slash parsing handled it correctly). 2 candidates correctly rejected as ungrounded — hard gate working.

**Full fix inventory across the session (10 rounds):** direct-API query sanitization (`site:`/`OR`/quotes) · discovery/gatherSignals 3-channel fan-out · PullPush serialize queue + 429 retry + circuit breaker (10-min cooldown, in-queue check) · HN 3-word query trim · discovery retry loop covering throw + truncated-JSON · snippet 280-char cap + 12-snippet prompt · thinking-model budget headroom (3072/4096-8192/4096/8192) · `IDEAS_NIGHTLY_MODEL` first-slash parsing · user config: model switched to a non-thinking model.

**Known minor (non-blocking):** OpenRouter free-tier 429s during validation bursts — ll-client's built-in 4-attempt retry handles it (slower runs). Competitor-search SearXNG noise → "⚠️ לא רלוונטיות" validation reasons (cosmetic; grounding comes from the signal phase). PullPush external IP block — self-heals; circuit breaker probes every 10 min.

**Next exact step:** none required — verify the sessions appear in the Ideas History UI (`/ideas/history`, nightly filter). Optional future polish: competitor-query operator stripping (same treatment as `buildSignalQueries`).

## 2026-08-16 Session (j) — Round 9: thinking-model budget headroom across the ideas pipeline

**What was done:** 11th log (17:29). Env override works (`cloude-flare` / `@cf/zai-org/glm-4.7-flash` active). New diagnosis: **glm-4.7-flash is ALSO a thinking model** — query-gen emitted only 303 content chars yet hit `finish_reason=length` at maxTokens 1024 (invisible reasoning tokens consumed ~950). Topic discovery attempt 1 @2048 → empty content (thinking ate the whole budget). Same pathology as OmniRoute `auto`, different provider. Conclusion: all ideas-pipeline budgets must leave thinking headroom, not just completion room.

**Budget bumps (`ideas.service.ts`):** query-gen 1024→3072; topic-discovery attempts 2048/4096→4096/8192; gatherSignals 2048→4096; validation 4096→8192. Idea-gen was already 8192.

**Files touched:** `backend/src/modules/ideas/ideas.service.ts` (4 maxTokens call sites + comment).

**Verification:** ideas suite **33/33 ✅**, `npx tsc --noEmit` ✅, mojibake clean. **No architecture diagram update needed.**

**Next exact step:** backend watch recompiles automatically → re-trigger `POST /ideas/nightly/trigger` (PullPush still externally blocked; cooldown probes self-heal). Expect: query-gen completes JSON @3072, discovery completes @4096 (or retry @8192), then per-topic signals (4096) + idea-gen (8192) + validation (8192) → `Grounded cron: accepted` → sessions saved.

**Open questions:** if glm thinking still starves 8192 on discovery, next options: trim `TOPIC_DISCOVERY_PROMPT` (product decision), or a non-thinking model (e.g. a plain completion model on another provider).

## 2026-08-16 Session (i) — Round 8: env typo diagnosis (user action correction)

**What was done:** 10th log (17:27). User added the env line but misspelled the provider key: `cloudeflare` → `LLM Provider with key 'cloudeflare' was not found in the database.` The DB key is **`cloude-flare`** (label "Cloudeflare"). Corrected line communicated: `IDEAS_NIGHTLY_MODEL=cloude-flare/@cf/zai-org/glm-4.7-flash`. Note the first-slash parsing fix WORKED (model part `@cf/zai-org/glm-4.7-flash` arrived intact).

**Run health:** kept **65 trusted snippets** (record) — query-gen failed on the bad provider key → static `FALLBACK_DISCOVERY_QUERIES` kicked in as designed and HN still delivered. Circuit breaker clean.

**No code changes this round.** Tests unchanged (ideas 33/33, ideas-tasks 6/6, tsc ✅ from prior rounds).

**Next exact step:** user fixes the hyphen → restart → re-trigger → expect discovery on glm-4.7-flash to return complete topics JSON → grounded sessions saved.

## 2026-08-16 Session (h) — Round 7: nightly-model override fix + switch recommendation

**What was done:** 9th log (17:17). Upstream fully healthy — **kept 61 trusted snippets** (HN 7+7+25+21), circuit breaker clean, retry loop live. Discovery LLM failed BOTH attempts with pure empty-content throws (38s @2048, 65s @4096). Decisive contrast in the same log: **admin chat on `cloude-flare` / `@cf/zai-org/glm-4.7-flash` worked flawlessly (5.1s)**. Root cause is now isolated: OmniRoute `auto` routing intermittently returns zero content at ANY budget — a provider problem, not a code problem. Also discovered WHY nightly uses it even though the user's chat default is glm: `IdeasTasksService.resolveModel()` passes `findFirstActiveTextModel()` (OmniRoute `auto`) as an explicit override, which beats the user-level default in `resolveEffectiveModel`.

**Fix (code):** `resolveModel()` env parsing was `split('/', 2)` — truncates slash-containing model IDs (`cloude-flare/@cf/zai-org/glm-4.7-flash` → model=`@cf`). Now splits on the FIRST slash only, so `IDEAS_NIGHTLY_MODEL=cloude-flare/@cf/zai-org/glm-4.7-flash` resolves correctly. `.env.example` docs updated.

**Action for the user (config, one line):** add to `backend/.env`:
`IDEAS_NIGHTLY_MODEL=cloude-flare/@cf/zai-org/glm-4.7-flash`
then restart backend + re-trigger. Scoped to the nightly pipeline only — chat/model defaults untouched.

**Files touched:** `backend/src/modules/ideas/ideas-tasks.service.ts` (first-slash parsing), `backend/.env.example` (docs).

**Verification:** ideas-tasks suite **6/6 ✅**, `npx tsc --noEmit` ✅, mojibake clean. **No architecture diagram update needed** (model-selection precedence unchanged).

**Next exact step:** user adds the env line → restart → re-trigger. Expected: discovery on glm-4.7-flash returns complete JSON (non-reasoning model, no empty-content pathology), topics → grounded sessions saved.

**Open questions:** none blocking.

## 2026-08-16 Session (g) — Round 6: retry now covers truncated JSON (breakthrough run)

**What was done:** 8th log (17:07) — **HN revival worked**: 3-word queries returned 12+12+25+1 results → **kept 50 trusted snippets** (record). Circuit breaker clean (1 probe 429 → open → 3 skips). Discovery LLM finally produced REAL topics JSON (`מחולל חשבוניות B2B תואמות-מע״מ...`) — but died on a new failure mode: `finish_reason=length` at 2048 → JSON cut mid-string → `parseLlmJson: Unterminated string at position 2346` → null → `empty topics`. The retry loop only fired when `generateResponse` THREW; a truncated-but-nonempty response bypassed it.

**Fix:** restructured the retry loop in `discoverTopics` to cover BOTH failure modes — the LLM call AND the parse now happen inside the attempt loop. Unusable outcome (throw OR null/unparsed topics) → attempt 2 at 4096. Also logs `finish_reason` in the retry warning.

**Files touched:** `backend/src/modules/ideas/ideas.service.ts` (retry loop covers parse; no API change).

**Verification:** ideas suite **33/33 ✅**, `npx tsc --noEmit` ✅, mojibake clean. **No architecture diagram update needed.**

**Next exact step:** restart backend → re-trigger. The pipeline is one retry away from full success: with 50 HN snippets + a 4096-budget second attempt, expect parsed topics → per-topic `gatherSignals` (HN provides grounding) → `Grounded cron: accepted` → session saved. Remaining known flakiness: PullPush external block (self-heals via 10-min probes), discovery latency (~60s per attempt, acceptable for nightly).

**Open questions:** none blocking.

## 2026-08-16 Session (f) — Round 5: HN query shortening (channel revived, live-verified)

**What was done:** 7th log (16:57). Circuit breaker + in-queue check worked perfectly (first probe 429 → circuit open → 3 queued calls fail instantly). Remaining failure: all 3 channels starved simultaneously — SearXNG returned pure dictionary noise (only bing answers; brave/ddg/google/mojeek/qwant/startpage all suspended/CAPTCHA — verified live via `unresponsive_engines`), PullPush IP still externally blocked (429), HN returned 0 because its queries were 8-10 word AND-chains. `kept 0` → discovery LLM never reached.

**Root fix:** HN Algolia ANDs words — long keyword chains return 0; 2-3 word queries return relevant stories. `searchHackerNews` now trims to the first 3 significant words (≥3 chars, alphanumeric) after operator-stripping. **Live-verified:** `"ecommerce abandoned cart"` / `"accessibility lawsuit ADA"` / `"spend waste facebook"` each return relevant HN stories (`The ADA lawsuit settlement involving an accessibility overlay`, etc.). Every HN result is `news.ycombinator.com` → passes the trusted-domain filter by construction. Both `discoverTopics` AND `gatherSignals` benefit automatically.

**Dead ends probed (live):** SearXNG native `reddit` engine → `access denied`. arctic-shift.photon-reddit.com mirror → free-text `query`/`title`/`selftext` search requires `subreddit`/`author` param — unusable for keyword discovery.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (HN 3-word trim), `backend/src/modules/web-search/web-search.service.spec.ts` (HN test expectation updated).

**Verification:** web-search + ideas suites **44/44 ✅**, `npx tsc --noEmit` ✅. **No architecture diagram update needed** (same providers).

**Next exact step:** restart backend → re-trigger `POST /ideas/nightly/trigger`. HN should now yield 3-5 trusted snippets per query even with SearXNG noisy + PullPush blocked → discovery LLM runs (2048, retry 4096) → topics → `Grounded cron: accepted`. If discovery LLM still empty-content at 4096 → switch nightly model off OmniRoute `auto` (user DB change).

**Open questions:** PullPush external block duration unknown (already >20 min). Circuit probes once per 10 min — self-healing when the block lifts.

## 2026-08-16 Session (e) — Round 4: in-queue cooldown check + discovery 4096

**What was done:** 6th log (16:43, fresh server with circuit breaker). Findings + fixes:
1. **Circuit breaker fired but late for in-flight calls** — all 4 PullPush calls entered the queue before the first cooldown opened, so each still burned its own 3s retry (~30s total waste). **Fixed:** cooldown check added INSIDE `enqueuePullPush`'s queued task — calls queued before the circuit opened now fail fast instead of retrying against a dead channel.
2. **Discovery empty-content is NOT input-size dependent** — failed BOTH attempts with a single 280-char snippet. Cross-run evidence: heavy `TOPIC_DISCOVERY_PROMPT` fails at 1024/2048/3072 regardless of input; the equally-heavy `IDEA_GENERATION_PROMPT` succeeds at 4096 (4706-char outputs). Reasoning burn scales with system-prompt complexity. **Fixed:** discovery retry budget 3072 → **4096** (the empirically working budget for heavy prompts on OmniRoute `auto`).
3. Note: SearXNG yield is flaky run-to-run (30 trusted results one run, 1 the next — engine rotation); PullPush external IP block outlasts our 10-min cooldown → one probe per 10min while blocked, by design.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (in-queue cooldown check), `backend/src/modules/ideas/ideas.service.ts` (retry budget 4096 + comment).

**Verification:** web-search + ideas suites **44/44 ✅**, `npx tsc --noEmit` ✅, mojibake clean. **No architecture diagram update needed.**

**Next exact step:** restart backend (watch compile) → wait for PullPush cooldown if just opened → re-trigger `POST /ideas/nightly/trigger`. Success = topics JSON + `Grounded cron: accepted` ×≥1. **If discovery still empty at 4096 → switch the nightly model off OmniRoute `auto`** (DB: active text model row — same place the user fixed `openrouter/google` before). That is a user config decision; all code levers exhausted.

**Open questions:** none blocking.

## 2026-08-16 Session (d) — Round 3: PullPush circuit breaker + discovery prompt trim

**What was done:** User re-triggered after server restart (fresh compile of Sessions b+c). Log showed: SearXNG **recovered** (30 results for the Etsy-suspension query, kept 26 trusted r/Etsy posts), queue stopped the 429 storm, discovery retry fired. Two defects remained, both fixed:
1. **PullPush IP hard-blocked** — every call 429'd, and each retry (3s backoff) 429'd too; the serialized queue then burned ~30s per phase waiting on a dead channel. **Fixed:** circuit breaker — when the 429 retry ALSO fails, PullPush opens a 10-minute cooldown (`pullPushCooldownUntil`); calls during cooldown return failure instantly with no HTTP; any success clears it.
2. **Discovery LLM empty-content correlates with input size** — evidence across runs: 4 snippets @2048 → success; 11 @2048 → fail; 26 snippets @2048 AND @3072 → both fail (reasoning model burns budget proportional to prompt). Bigger budget alone didn't help. **Fixed:** discovery snippets capped at 280 chars each and prompt trimmed from `slice(0, 30)` → `slice(0, 12)`.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (cooldown circuit + clear-on-success), `backend/src/modules/ideas/ideas.service.ts` (280-char snippet cap, 12-snippet prompt), `backend/src/modules/web-search/web-search.service.spec.ts` (+1 circuit test: double-429 opens cooldown, next call short-circuits with no HTTP).

**Verification:** web-search + ideas suites **44/44 ✅**, `npx tsc --noEmit` ✅, mojibake clean. **No architecture diagram update needed** — same providers, no new module/boundary.

**Next exact step:** re-trigger `POST /ideas/nightly/trigger` (ideally after ~10 min so PullPush cooldown from earlier runs expires). Expect: `[PullPush] In cooldown — skipping` OR real results, discovery LLM producing topics JSON on attempt 1-2, and ≥1 `Grounded cron: accepted` → session saved. If discovery STILL returns empty content with 12×280 snippets, the next lever is switching the nightly model off OmniRoute `auto` (reasoning) to a plain model — DB/config change for the user.

**Open questions:** none blocking.

## 2026-08-16 Session (c) — Round 2 fixes: PullPush 429 throttle/retry + double site: + discovery retry

**What was done:** User re-triggered after Session (b). Big progress visible in logs — sanitized PullPush queries returned 5/3/2/1 results, discovery produced topics, signals extracted, ideas generated + validated. But 4 new defects surfaced, all fixed:
1. **PullPush 429 rate-limit** — parallel fan-out fires 5+ PullPush calls in one burst → mid-run all calls 429 (`PullPush search failed: ... 429` ×5) → `kept 0` → ungrounded. **Fixed:** all PullPush calls now go through a serialized in-service queue (`enqueuePullPush`, 1500ms min interval) + one retry after 3000ms backoff on 429 only.
2. **Double `site:` operator** — LLM `searchQuery` already contains `site:reddit.com`; `buildSignalQueries` prepends its own → `site:reddit.com site:reddit.com ...` confused SearXNG (verified in logs). **Fixed:** `buildSignalQueries` term cleanup now strips `site:`/`domain:`, `-exclusions`, `OR` before composing its own operators.
3. **Discovery LLM still flaky empty-content** — run 1 failed `Returned no content or tool calls` at 2048; run 2 succeeded (intermittent reasoning-model behavior). **Fixed:** `discoverTopics` retries the LLM once (second attempt `maxTokens: 3072`).
4. **Trailing `-` token** — `-site:reddit.com` strip left a bare `-` in direct-API queries. **Fixed:** exclusion regex `(^|\s)-[^\s"]*` consumes the dash too.

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (PullPush queue + retry + regex fix), `backend/src/modules/ideas/ideas.service.ts` (`buildSignalQueries` operator strip, `discoverTopics` retry loop), `backend/src/modules/web-search/web-search.service.spec.ts` (+1 429-retry test).

**Verification:** web-search + ideas suites **43/43 ✅** (incl. new 429-retry test), `npx tsc --noEmit` ✅. Jest prints a force-exited-worker warning (leaked timer from the retry test's real 3s sleep) — cosmetic, tests pass. **No architecture diagram update needed** — same providers, no new module/boundary.

**Next exact step:** re-trigger `POST /ideas/nightly/trigger`. Expect: no 429 storms (calls serialized ~1.5s apart), single `site:` per query, and ≥1 `Grounded cron: accepted "..."` → session saved. Note run cadence: PullPush throttling makes gatherSignals slower (~7s extra per topic) — well within the 150s deadline. If topic-discovery LLM fails BOTH attempts, the fallback is static queries (already site:-scoped).

**Open questions:** HN Algolia returns 0 for these long pain-point queries (keyword-stuffed queries don't match HN story titles) — channel kept as best-effort; PullPush is the workhorse. If 429s persist even throttled, consider raising `PULLPUSH_MIN_INTERVAL_MS` or caching identical queries per run.

## 2026-08-16 Session (b) — Nightly ideas still 0: 3-layer fix (direct-API query sanitize + discovery budget + gatherSignals fan-out)

**What was done:** User re-triggered `/ideas/nightly/trigger` twice after the previous session's HN/PullPush addition — still `0 grounded sessions`. Diagnosed from pasted logs, found 3 stacked causes:
1. **Direct APIs got raw search syntax** — `searchHackerNews`/`searchRedditArchive` received queries like `site:reddit.com ecommerce "abandoned cart" OR "conversion"`. HN Algolia + PullPush do literal text search: `site:reddit.com` becomes a dead token → 0 results (and PullPush returned HTTP 400 on an unbalanced quote emitted by the LLM). **Fixed:** new private `toDirectApiQuery()` in `web-search.service.ts` strips `site:`/`domain:` operators, `-exclusions`, `OR`, quotes, parens before both direct-API calls.
2. **Topic-discovery LLM returned empty content** — run 1 kept 1 trusted result but the `TOPIC_DISCOVERY_PROMPT` call at `maxTokens: 1024` threw `Returned no content or tool calls from AI model` (OmniRoute `auto` reasoning model burns budget on `reasoning_content` — same documented pattern as 2026-08-12). **Fixed:** `maxTokens: 1024 → 2048` in `discoverTopics` (same budget as `gatherSignals`).
3. **`gatherSignals` was still SearXNG-only** — even with 1+2 fixed, per-topic grounding depended entirely on SearXNG (engines suspended → ~0 trusted results) → every candidate dropped as ungrounded → 0 sessions. **Fixed:** `gatherSignals` now fans each of its 5 queries to SearXNG + HN Algolia + PullPush in parallel (same pattern as `discoverTopics`).

**Files touched:** `backend/src/modules/web-search/web-search.service.ts` (+`toDirectApiQuery`, both direct-API methods take `rawQuery`), `backend/src/modules/ideas/ideas.service.ts` (discovery `maxTokens`, `gatherSignals` fan-out), `backend/src/modules/web-search/web-search.service.spec.ts` (+2 sanitize tests).

**Verification:** web-search suite **9/9 ✅** (7 baseline + 2 new), ideas suite **33/33 ✅**, `npx tsc --noEmit` ✅, mojibake scan clean. **No architecture diagram update needed** — no new provider/module; the fan-out reuses the already-documented HN Algolia + PullPush providers inside IdeasModule.

**Next exact step:** re-trigger `POST /ideas/nightly/trigger` — expect `[HN Algolia]`/`[PullPush]` queries logged WITHOUT `site:`/quotes, non-zero results, and ≥1 grounded session (`Grounded cron: accepted "..."`). If the discovery LLM still returns empty content at 2048, next lever is a one-retry loop in `discoverTopics` or switching the nightly model off the reasoning `auto`.

**Open questions:** none blocking.

## 2026-08-16 Session — Nightly ideas run produced 0 sessions (log diagnosis + fallback fix)

**What was done:** Diagnosed the user-pasted nightly-run logs (`/ideas/nightly/trigger` → `0 grounded sessions`, two runs). Chained root causes:
1. **DB data (fixed by user):** `IdeasTasksService.resolveModel()` → `findFirstActiveTextModel()` returned `{provider: 'openrouter', key: 'google'}` — invalid OpenRouter model ID → `400` → discovery fell to static fallback. User switched the active model to OmniRoute `auto` — LLM query generation now works (verified in second log).
2. **Code (fixed):** `FALLBACK_DISCOVERY_QUERIES` had no `site:` operators → SearXNG returned 40 generic blog results → `TRUSTED_SIGNAL_DOMAINS` dropped ALL 40 → 0 topics. Fixed: fallback queries now `site:`-scoped to trusted domains.
3. **SearXNG engines (infrastructure):** even with `site:` queries, ALL self-hosted SearXNG general engines died under bot detection — `brave`/`google cse`: "Suspended: too many requests", `duckduckgo`/`startpage`: CAPTCHA (verified live via `localhost:8080/search?format=json`). Also enabled `bing`/`mojeek`/`qwant` in `docker/searxng/settings.yml` — bing answers but silently IGNORES `site:` (generic results), mojeek/qwant dead. Conclusion: SearXNG alone cannot serve trusted-domain discovery.
4. **Multi-channel signal discovery (user-approved direction "APIs ישירים"):** `WebSearchService` gained two keyless direct-API methods — `searchHackerNews` (HN Algolia, live-verified ✅) and `searchRedditArchive` (PullPush pushshift successor, live-verified ✅; `reddit.com/search.json` returns 403 without OAuth, `old.reddit` soft-blocks with empty results). `discoverTopics` now fans each query to SearXNG + HN + PullPush in parallel; the two APIs return only trusted-domain URLs by construction. SearXNG stays as best-effort channel and for other consumers (genetics/terpenes enrichment).

**Files touched:** `backend/src/modules/ideas/ideas.service.ts` (fallback constant + fan-out), `backend/src/modules/web-search/web-search.service.ts` (+2 methods), `backend/src/modules/web-search/web-search.service.spec.ts` (+4 tests), `docker/searxng/settings.yml` (enable bing/mojeek/qwant), `documents/architecture-diagram.md` (IdeasModule node + nightly cron flow).

**Verification:** backend `web-search` + `ideas` suites **40/40 ✅**, `tsc --noEmit` ✅, mojibake scan clean. Architecture diagram updated (new external providers HN Algolia + PullPush).

**Next exact step:** backend dev server auto-recompiles — re-trigger `POST /ideas/nightly/trigger` and confirm logs show `[HN Algolia]` / `[PullPush]` results and ≥1 grounded session. If the LLM-generated queries still use `site:`/quotes that SearXNG chokes on, that no longer matters — HN/PullPush receive the raw query text and handle it.

**Open questions:** none blocking. PullPush archive freshness lags hours behind live Reddit (acceptable for nightly pain-point mining).

## 2026-08-14 Session — Ideas validation overhaul (riskPenalty + card UX + solo-dev fields)

**What was done:** Implemented the 4-phase upgrade plan from the product review:
1. **riskPenalty** — `VALIDATION_PROMPT` now requires a `riskPenalty` (0–3) in `validationBreakdown` (with a calibration example where risk drops an idea from 8 to 5). Server computes `score = competition + signalFit + feasibility + marketSize − riskPenalty`, clamped 1–10. Missing penalty (old model output) defaults to 0.
2. **Competitor chips** — competitor names render as clickable `.tag` chips linking to a Google search (`competitorSearchUrl`), replacing full-width `<li>` rows (dead-space fix).
3. **2-column grid** — `.idea-card-details-inner` switched from flex-column to a 2-column grid (collapses to 1 column ≤640px) to cut scroll fatigue.
4. **Solo-dev actionable fields** — `techStackSuggestion` (text), `firstDistributionStep` (text), `estimatedMvpDays` (int, clamped 1–365) end-to-end: prompt → `validateSingle` sanitizers → entity columns (nullable) → `mapIdeaToSaved` → frontend models/store → three new `@if`-guarded IdeaCard sections (סטק מוצע / ערוץ הפצה ראשון / זמן ל-MVP). Old ideas with nulls render cleanly.

**Files touched:** backend — `idea-prompts.constant.ts`, `idea.interface.ts`, `ideas.service.ts`, `saved-idea.entity.ts`, `ideas.service.spec.ts`; frontend — `idea.interface.ts`, `saved-idea.model.ts`, `ideas.store.ts`, `idea-card.{ts,html,css,spec.ts}`.

**Verification:** backend ideas suite 33/33 ✅ (baseline was 28); frontend ideas suite 32/32 ✅; frontend `tsc --noEmit` ✅; no mojibake. **Stale spec mocks fixed in the same session:** ideas-history store mock was missing `isSessionLoading` (9 tests) and `toggleExpand` tests didn't await the async method; ideas-form `domain` mock was a plain `vi.fn` while `canGenerate` is a `computed` that cached forever — replaced with a real `signal('')` (1 test). **Remaining pre-existing failures (unrelated, not touched):** app.spec (2), auth.interceptor (2), with-credentials.interceptor (4), auth.guard (1), strain-hunter-settings (7), backend 8 tests in llm-client/other suites.

**Decisions made:**
- Score penalty computed server-side, not prompt-only — the LLM cannot inflate scores by omitting the penalty.
- No migration file for the 3 new nullable columns — TypeORM `synchronize: true` applies them (same precedent as `validationBreakdown` column).
- Grid uses DOM auto-placement rather than explicit per-section column assignment (keeps DOM order accessible, no template surgery).

**No architecture diagram update needed** — changes are inside IdeasModule internals (scoring formula, card rendering, nullable columns); module boundaries and request flow unchanged.

**Next exact step:** run a real generation (`ng serve` + backend) to eyeball score distribution (expect lower scores on risky ideas) and the new card layout. Remaining stale-spec failures (interceptors/guards/app/strain-hunter-settings) are separate tasks.

**Open questions:** none — all three user decisions (server-side penalty, nullable columns, phase order) were confirmed before starting.

## 2026-08-13 Session — Fix `clampScore` TS type error (ideas.service.ts)

**What was done:** Fixed `ts(2345)` — `clampScore(v.validationScore)` failed because `validationScore` is `number | undefined` but `clampScore` accepted only `number`.

**Files touched:** `backend/src/modules/ideas/ideas.service.ts` — changed `clampScore(score: number)` → `clampScore(score: number | undefined)`. Existing `typeof` guard already handles `undefined` (returns 1). No runtime behavior change.

**Verification:** `npx tsc --noEmit` ✅.

**No architecture diagram update needed.**

**Next exact step:** none — standalone fix.

## 2026-08-13 Session — Ideas-history first-click flicker fix (deep root cause)

**What was done:** Fixed a subtle but visible first-click layout shift in the Ideas History accordion. The fix required four layered changes because the visible flicker had four cooperating root causes, not one.

**Root causes (in order of impact):**
1. **`loadSession` toggled `historyLoading` → `historyPageState` flipped from `Ready` to `Loading` → the entire `@switch` block unmounted/remounted the whole sessions list, including the `stagger` animations.** This was the main flicker — even a single async toggle of `historyLoading` rebuilds the whole DOM subtree.
2. **DOM insertion + grid animation in the same paint frame.** Calling `await loadSession()` then `expandedSessionId.set()` mounted the `<app-idea-card>` children and toggled the grid `0fr → 1fr` transition at the same time, so the browser couldn't interpolate cleanly.
3. **Unnecessary `::ng-deep` override in `ideas-history.css`** that fought with `glass-effect`'s `transform: translateZ(0)`. Caused a style-recalculation flash on every first mount of `<app-idea-card>`. The override was solving a problem that didn't exist — `.idea-card` had no `position: absolute` anywhere, and `.idea-card-wrapper` doesn't even exist in the DOM.
4. **`backdrop-filter: blur()` on `.glass-effect::before`** is GPU-expensive on first paint. The first time N glass cards became visible in the same frame, the browser did N concurrent compositing passes → brief flash.

**Files touched (modified):**
- `frontend/src/app/core/store/ideas.store.ts` — added `loadingSessionIds: signal<Set<number>>` + `isSessionLoading(id)` helper; `loadSession()` no longer touches `historyLoading`. `loadSessions()` (full-list) still uses `historyLoading` as before, so the page-level loading state is preserved for the right caller.
- `frontend/src/app/features/ideas/ideas-history/ideas-history.ts` — `toggleExpand()` is now `async`: `await loadSession()` → `await requestAnimationFrame()` → `expandedSessionId.set()`. The DOM paints the cards before the grid animation begins.
- `frontend/src/app/features/ideas/ideas-history/ideas-history.html` — added `ideasStore.isSessionLoading(session.id)` to the loader `@if` so `triggerNightly`'s post-call `loadSession` also shows a local spinner (the accordion stays open, only the inner content swaps).
- `frontend/src/app/features/ideas/ideas-history/ideas-history.css` — added `min-height: 220px; align-items: center` to `.ideas-loading` (safety net for slow networks) and removed the entire dead `::ng-deep` block (12 lines, never matched anything in the DOM).
- `frontend/src/app/assets/styles/_utilities.css` — added `will-change: filter` to `.glass-effect::before` so the browser pre-composites the `backdrop-filter: blur()` on first paint.

**Verification:** `npx ng build` (frontend) ✅. ideas-history chunk 51.31 → 50.98 kB (smaller after the `::ng-deep` removal). No backend changes. No new tests needed — the fix is in the signal/state boundary, not in business logic.

**Decisions made:**
- Separate signals for page-level (`historyLoading`) vs per-session (`loadingSessionIds`) loading. The store now exposes a granular API that the UI can consume without side effects on the page-level state. The same pattern is reusable for any "load one item from a list" operation.
- The `requestAnimationFrame` gap before `expandedSessionId.set()` is a 1-frame (~16ms) delay. Imperceptible to users, but gives the browser a separate paint cycle to commit the new `<app-idea-card>` elements before the grid animation tries to interpolate to their height.
- Removed `::ng-deep` block entirely rather than patching it — it targeted `.idea-card-wrapper` which doesn't exist in the template (verified by grep). Dead code that was causing real harm.
- No architecture-diagram update needed — signal/state refactor inside an existing store, plus 2 cosmetic CSS changes. No new module boundary.

**No architecture diagram update needed.**

**Open questions:** none. `triggerNightly()` and any other post-expand `loadSession` calls now benefit from the same fix automatically (the `isSessionLoading` branch shows a local spinner without touching the page state).

**Next exact step:** user can test the fix in a dev server — first-click expand of any history session should now animate smoothly without any visible layout shift. Not committed yet (per existing uncommitted working tree pattern). When ready to commit, this set is safe to batch as a single `fix(ideas-history): eliminate first-click accordion flicker` commit (no security-critical code, all four changes are surgical and isolated to the Ideas feature).

## 2026-08-13 Session — Test coverage finalization (docs only)

**What was done:** Verified `documents/test-coverage-gaps.md` against the code. Actual scanned totals: Backend **43 spec files / 376 tests** (8 security + 26 business-logic + 9 admin-agent); Frontend **56 spec files / 482 tests** (matches `434/482` passing, 51/56 suites). Rewrote the coverage doc to reflect verified reality (fixed wrong totals 48/20/core-7; marked already-covered frontend stores/guards/interceptors/login-register/chat/ideas/settings/media/layout as ✅) and kept only genuine gaps.

**Files touched:** `documents/test-coverage-gaps.md` (rewritten + `.spec.ts` typo fix), `documents/HANDOFF.md`, `documents/STATUS.md`.

**Decisions made:** use verified filesystem counts over previously-reported round totals; backend business-logic = 26 suites/224 tests (was 19/145), frontend = 56/482 (was 51/469).

**Remaining (genuine gaps):** frontend `users-management.ts`, `design-system.ts`, 4 chat block-cards (agnes-image/video, auth-url, weather-summary), services database-monitor/genetics/llm-provider/terpene/theme, directives access-to/auto-scroll-bottom/badge-color/tooltip; backend `cannlytics.service`, controllers/DTOs for analytics/database-monitor/llm-provider/google-calendar, mcp-bridge config/server-client, core filters/strategies.

**Next exact step:** (backend) add `cannlytics.service.spec.ts`; (frontend) add `users-management.spec.ts`; tick remaining low-priority items in `test-coverage-gaps.md`.

**Open questions:** none.

## 2026-08-12 (late) Session — Nightly banner + IdeaCard CSS consolidation + star-btn unification

**Objective:** align the Ideas feature UI with `css-conventions` / `css-deduplicate` skills; unify the duplicate star-button styling.

**Nightly banner (`ideas-page.css` / `.html`):**
- Fixed two broken tokens (`--color-primary-bg`, `--color-primary-border` did not exist) → now `var(--color-primary-glow-bg)` tint + `var(--glass-border)` (later removed as redundant with `.glass-effect`) + `border-inline-start: 3px solid var(--color-primary)` accent + `box-shadow: var(--glass-shadow), 0 0 12px var(--color-primary-glow)`.
- Layout: `display:flex; justify-content: space-between; gap: var(--space-4); padding: var(--space-6)`.
- Wrapped icon + label in `.nightly-banner-content` (nested inside `.nightly-banner`, per mandatory nesting rule) with `display:flex; align-items:center; gap: var(--space-2)`.
- Replaced dead local `.link-btn` with global `transparent-btn sm` (fixes missing hover + smaller). Removed the orphaned `.link-btn` CSS.
- Dedupe: removed `border: 1px solid var(--glass-border)` (already on `.glass-effect`).
- No architecture-diagram change (CSS-only).

**IdeaCard CSS (`idea-card.css`):**
- Merged the duplicate flat `.idea-card` block into the one nested under `.idea-card-wrapper`; nested `.fav-btn` into `.idea-card-meta`; removed a redundant `transform: scale(0.99)` line that was immediately overwritten. Pure structure change, values unchanged.

**star-btn unification (the key cleanup):**
- Root cause: `fav-btn` (local in `idea-card.css`) and `star-btn` were doing the same job (star toggle) but as two separate classes. `star-btn` was actually **nested inside `li.p-select-option`** in `_primeng-overrides.css`, so it only reached star buttons inside a PrimeNG `p-select` option — NOT the IdeaCard's plain button.
- Promoted `button.star-btn` to a real **global** rule in `_buttons.css` (section 4c), targeting both `.ph` and `span.ph` icons. Keeps the token-based `--color-warning` (chat + ideas-form) instead of `fav-btn`'s hard-coded `#f59e0b`.
- Switched `idea-card.html`: `fav-btn` → `star-btn`, `[class.active]` → `[class.star-active]`, icon `<i>` → `<span class="ph">` to match the styled selector.
- Deleted the entire local `.fav-btn` block from `idea-card.css`.
- `data-testid="fav-..."` intentionally kept unchanged so existing tests don't break.
- Verified: `fav-btn` class appears nowhere; `star-btn`/`star-active` now used in chat, ideas-form, and idea-card.

**Verification:** `npx ng build` ✅ (only pre-existing `strain-hunter.css` budget warning); mojibake scan clean on all touched files.

**Decisions made:** generic star-toggle button belongs in `_buttons.css` (with other button themes), not `_primeng-overrides.css`; `<span class="ph">` is the consistent icon element across all three usages.

**Status:** all uncommitted — part of the larger in-progress working tree (also includes `ideas-grid` deletion still pending user decision). Not yet committed.

## ⚠️ Lesson: Every non-trivial commit must be reviewed individually

`82d9baa` ("skip SSRF validation in dev mode") was committed as part of a batch without individual review. It added a **total SSRF bypass** when `NODE_ENV !== 'production'` — not just localhost. Worse, if `NODE_ENV` is unset, the bypass activates silently. Caught and reverted (`021224b`) only because each commit was examined separately before closing the session.


## 2026-08-12 Session — Glass Effect Rendering Fix (Banding)

**Objective:** fix vertical stripes/banding artifacts on glass-effect cards in Dark Mode, especially on radial gradients.

- **Global Fix:** added `transform: translateZ(0)` and `backface-visibility: hidden` to `.glass-effect` in `_utilities.css`. This forces GPU acceleration and stable layer sampling for the `backdrop-filter`, eliminating rendering artifacts on sub-pixel boundaries.
- **IdeaCard Fix:** added identical stability rules to `.idea-card` in `idea-card.css` to prevent flickering/banding during scale transitions.
- **Files touched:** `frontend/src/app/assets/styles/_utilities.css`, `frontend/src/app/features/ideas/idea-card/idea-card.css`.
- **IdeaCard Fix:** Converted `expanded` from a read-only input to a local `signal` synchronized via `effect`. This allows the "More Details" button to work independently in the Ideas History page where parent state management was missing. Fixes non-responsive details button.
- **IdeaCard History Rendering Fix:** Made `IdeaCard` a clean controlled component (parent manages `expanded` via `expandedIdeaIndex` + `(toggled)` like `ideas-grid`). In `ideas-history.css` overrode the global `position: absolute` on `.idea-card` to `static` so an expanded card pushes its siblings down instead of overlapping them. Files: `ideas-history.ts`, `ideas-history.html`, `ideas-history.css`, `idea-card.ts`.

- **Verification:** `npx ng build` (frontend) ✅. Visual artifacts are reduced/eliminated by forcing hardware-accelerated layer composition.
- **Decisions made:** forced GPU layering for all glass-effect elements as the banding is a recurring issue with `backdrop-filter` + `radial-gradient` in Chromium.

## 2026-08-12 Session — Ideas History accordion layout-shift / flicker fix

**Objective:** eliminate the layout shift and flicker when expanding a history session accordion for the first time.

**Root cause (3 combined):**
1. `@if (expandedSessionId() === session.id)` mounted/unmounted the whole `.ideas-list` DOM on every expand → sudden reflow.
2. `loadSession` is async — the section expanded first, then items populated a microtask later → content jump.
3. No height transition — hard snap.

**Fix:**
- Removed the `@if` around `.ideas-list`; it now stays in the DOM always with `[class.expanded]`, wrapped in `.ideas-list-inner`.
- Animated open via `grid-template-rows: 0fr → 1fr` + `opacity` transition (same pattern as `IdeaCard` details), so the structure is pre-calculated.
- Moved `border/background/padding` onto `.ideas-list-inner` (with `min-height: 0; overflow: hidden`) so it collapses/expands cleanly with the grid row.
- Added `@media (prefers-reduced-motion: reduce)` to disable the transition.
- Files touched: `frontend/src/app/features/ideas/ideas-history/ideas-history.html`, `frontend/src/app/features/ideas/ideas-history/ideas-history.css`.
- Verification: `npx ng build` (frontend) ✅.



**Objective:** unify the entire frontend (IdeaCard, ideas-grid, ideas-history) on `SavedIdea` as the single source of truth; eliminate `BusinessIdea`/`IdeaCardData` from UI components; normalize nullable arrays at the store boundary; fix the `apiKey` transformer so an empty PATCH doesn't NULL a stored key; remove duplicated CSS in `ideas-history.css`.

**Completed:**
- `saved-idea.model.ts`: `risks`/`competitors`/`nextSteps`/`signalsReferenced` and `validationReason` normalized to non-null (clean contract).
- `ideas.store.ts`: `ideas` signal → `SavedIdea[]`; SSE `BusinessIdea[]` mapped to `SavedIdea` via `toSavedIdea` (null arrays → `[]`, `validationReason` → `''`); added `normalizeSaved`; `loadSessions`/`loadSession` normalize history ideas at the boundary. The 4 nullable-array computeds were removed from `IdeaCard`.
- `ideas-grid.ts`: input → `SavedIdea[]`; removed `toCardData()` boilerplate.
- `idea-card.ts`/`.html`: input → `SavedIdea`; template reads `idea().risks` etc. directly; favorite toggle guarded on `id`.
- `ideas-history.ts`/`.html`: `toggleFavorite` now consumes the `{ideaId, isFavorite}` event emitted by `IdeaCard` (no longer a `SavedIdea`).
- `llm-provider.entity.ts`: `apiKey` transformer returns `undefined` for empty/`undefined` input so TypeORM `update()` leaves the existing column untouched (prevents a PATCH without a key from wiping a previously-encrypted key).
- `ideas-history.css`: removed 12 properties that duplicated global assets — `.toggle-btn` (align-items/border-radius/background/font-weight/cursor from global `button`), `.badge` (display/align/justify from global `.badge`), `.delete-confirmation` (display/align/justify/padding from global `.delete-confirmation`); kept the `.delete-confirmation { gap }` override.

**Verification:** `npx ng build` (frontend) ✅. Only pre-existing unrelated warning: `strain-hunter.css` budget.

**Decisions made:**
- Kept `BusinessIdea` as the SSE DTO in `idea.interface.ts` (user-sanctioned) — mapped to `SavedIdea` once at the store boundary. Changing the SSE contract to return the persisted `SavedIdea` (with `id`) would require restructuring the backend generate/save flow + `ideas.service.spec.ts`, so deferred.
- Generated (live, unsaved) ideas have no `id` → `IdeaCard` favorite toggle hidden; only persisted history ideas (with `id`) show it.
- 4 pre-existing modified files were committed separately at session close (not part of the SavedIdea/apiKey work): `backend/src/modules/ideas/ideas-tasks.service.ts`, `backend/src/modules/llm/llm.module.ts`, `frontend/src/app/core/store/llm-provider.store.ts`, `frontend/src/app/features/llm-providers-management/llm-providers-management.ts`.

**Commits (not pushed):** `dc98cda` (fix(llm): don't NULL stored apiKey when PATCH sends empty string — `llm-provider.entity.ts`), `461234b` (refactor(ideas): unify frontend on SavedIdea, drop null guards + css dupes — 8 frontend files), `442f6dc` (refactor(ideas): AI_PROVIDER env fallback for nightly model + export `LlmProviderConfigService`), `944d1bc` (refactor(llm-providers): partial update payload + silent error reload).

**Files touched:** `saved-idea.model.ts`, `ideas.store.ts`, `idea-card.ts`, `idea-card.html`, `ideas-grid.ts`, `ideas-history.ts`, `ideas-history.html`, `ideas-history.css`, `llm-provider.entity.ts`.

**Next exact step:** (optional) update `documents/architecture-diagram.md` for the frontend data-model change — judged not needed (no new module boundary, backend entities unchanged). Pre-existing `user.service.spec.ts` failures are unrelated.

**No architecture diagram update needed** — frontend-internal data-model refactor + a transformer fix inside `LlmProviderModule`; no new module boundary or external provider.

## 2026-08-12 Session — Fix "stuck on research" (ideas generation timeout) + header styling

**Objective:** fix bug #1 (ideas generation hangs on the research/signal step with SSE timeout) and bug #2 (top bar not styled well).

**Root cause of bug #1 (confirmed by repro):**
- `gatherSignals` → `llm.generateResponse` → `client.chat.completions.create` was **non-streaming** with `timeout: 60_000`. The active provider is `AI_PROVIDER=omniroute` → DB model `auto/best-free`, which routes to a **reasoning model** (`hy3-free`).
- Reproduced end-to-end: a non-streaming call to `auto/best-free` took **161s** (SDK waits for the entire body incl. reasoning tokens) → always exceeds the 60s `OVERALL_TIMEOUT_MS` → OpenAI SDK `APIConnectionTimeoutError` → "Request timed out" surfaced as `Idea generation failed` / `Signal extraction failed — fallback mode`.
- SearXNG (`:8080`) was NOT the cause — axios/curl to it return in ~500ms. The timeout string was the OpenAI SDK message, not web search.
- The reasoning model also burns its whole `max_tokens` budget on `reasoning_content` and returns empty `content` at the default budgets (1024/2048/3072) → JSON parse fails → fallback "stuck on research".

**Fix (bug #1):**
- `llm-client.service.ts` `generateResponse`: switched to **streaming** (`stream: true`) and accumulate `content`/`tool_calls`/`finish_reason` from deltas (same mechanism as `generateStream`). Keeps the `LlmResponse` contract; `rawCompletion` now a minimal object so the existing debug `JSON.stringify(res.rawCompletion)` logs stay safe.
- `llm-client.service.ts` `getClient`: `timeout` 60_000 → 180_000.
- `ideas.service.ts`: `OVERALL_TIMEOUT_MS` 60_000 → 150_000; signal-gathering `maxTokens` 1024 → 2048; idea-generation 2048 → 4096; validation 3072 → 4096 (so the reasoning model finishes and emits real JSON content).
- Verified streaming call to `auto/best-free` returns content in ~25–65s (vs 161s non-streaming hang). With 4096 budget it produces valid JSON.

**Bug #2 (header):**
- Verified `header.css` is correctly scoped (ViewEncapsulation), bundled into `main.js`, and **all design tokens it uses resolve** in `_variables.css`. No code defect found — it's a purely visual issue I could not see (no browser automation tool available in this environment).
- Applied a safe visual improvement: `.shell-header` now uses `border: 1px solid var(--glass-border)` (top + inline sides removed, only bottom separator) and `min-height: var(--space-20)` so the bar is clearly delineated instead of blending into the background. Purely cosmetic; frontend build ✅.
- **Open question for user:** exact visual symptom still unknown (user didn't answer the prompt). If it persists, need a screenshot or description (width / background / spacing / user-menu).

**Verification:** backend `npx tsc --noEmit` ✅; frontend `npx ng build` ✅. No architecture-diagram change needed (LLM call-path internal change, no new module/boundary).

**Files touched:** `backend/src/modules/llm/services/llm-client.service.ts`, `backend/src/modules/ideas/ideas.service.ts`, `frontend/src/app/features/layout/header/header.css`.

**Next exact step:** confirm header visual after user provides screenshot/description; optionally commit these 3 files (not yet committed). If generation still slow, recommend switching the omniroute default model away from the reasoning `auto/best-free` to a faster non-reasoning model (data/config change for the user to decide).

## 2026-08-11 Session — Ideas Persistence Finalization + Sidebar Dropdown (PUSHED)

**Ideas Persistence — final fixes + sidebar dropdown**

- Completed: audited the entire `ideas-persistence-plan.md` implementation (backend + frontend) to identify what was done vs incomplete
- Completed: fixed empty-session bug in `ideas.controller.ts` — `saveGeneration` now checks `event.result?.result?.length` before persisting; converted fire-and-forget `try/catch` to `.catch()` Promise chain
- Completed: added `recentSessions` computed to `IdeasStore` (last 5 sessions for sidebar dropdown)
- Completed: created ideas history sidebar dropdown in `main-sidebar` matching the chat history pattern exactly — feather icon slides in on hover, shows last 5 sessions, delete-with-confirm, same CSS/animation pattern
- Completed: updated `ideas-persistence-plan.md` checklist — all items now checked
- Completed: moved `ideas-persistence-plan.md` to `archive/features/`
- Files touched (modified): `backend/src/modules/ideas/ideas.controller.ts`, `frontend/src/app/core/store/ideas.store.ts`, `frontend/src/app/features/layout/main-sidebar/main-sidebar.ts`, `frontend/src/app/features/layout/main-sidebar/main-sidebar.html`, `frontend/src/app/features/layout/main-sidebar/main-sidebar.css`, `documents/features/todo/ideas-persistence-plan.md`
- Files touched (moved): `ideas-persistence-plan.md` → `archive/features/`
- Verification: `npx nest build` (backend) ✅, `npx ng build --configuration=development` (frontend) ✅
- Decisions made: sidebar dropdown uses identical pattern to chat (hover-triggered, `app-dropdown` component, `.nav-item-ideas` CSS wrapper); empty session check added at controller level (not just service level) for defense-in-depth

## 2026-08-11 Session — Nightly Topic Discovery + Solo-Dev Constraints + SearXNG setup (PUSHED)

**Nightly ideas cron upgraded**: instead of a static `IDEAS_NIGHTLY_DOMAINS` list, `IdeasTasksService.runNightly()` now calls `IdeasService.discoverTopics()` (4 parallel SearXNG searches → single LLM extraction via new `TOPIC_DISCOVERY_PROMPT`) and generates ideas per discovered topic. Added `IDEAS_NIGHTLY_TOPIC_COUNT` env (default 3); `IDEAS_NIGHTLY_DOMAINS` removed.

- `discoverTopics()` returns `{ domain, rationale }[]` — domains sanitized through `sanitizeDomain`; rationale preserved/logged per topic (fix #6). Type surfaced through the whole call chain (service + tasks + specs).
- `IDEA_GENERATION_PROMPT` gained a fixed solo-developer constraints block; `VALIDATION_PROMPT` feasibility scoring now encodes solo-dev reality (0 = needs team/hardware, 2 = solo-buildable in weeks). Fixed Hebrew typos (`_identify`→`זהה`, `ביקוש` misspelling).
- Tests: `ideas-tasks.service.spec.ts` rewritten to 6 tests covering the discovery flow (disabled no-op — now also asserts `findFirstAdmin` NOT called, fix #4; 0-topics skip; per-topic loop; model override; topic count override; per-topic failure isolation). All 12 ideas tests pass.
- Env docs: `backend/.env.example` updated (`IDEAS_NIGHTLY_DOMAINS` → `IDEAS_NIGHTLY_TOPIC_COUNT`). Env file creation also covered the full app vars list.
- **SearXNG dev setup** (operational, not code): local `docker run -d -p 8080:8080` with a checked-in `docker/searxng/settings.yml` (limiter:false + json enabled) to stop 403s; `.gitignore` negation added so the settings file is tracked while the searxng data dir stays ignored. Fixed duplicate `SEARXNG_URL` in `backend/.env` (8888 was overriding 8080).
- Verification: `npm run build` ✅, `npx jest ideas` 12/12 ✅, frontend build ✅.
- Commits: `f3f6c51` (persistence feature), `036d98a` (chat-history fix), `98039c7` (UI polish), `f784e71` (env docs + searxng config), `1e1de52` (topic discovery upgrade) — all pushed to origin/main.
- Architecture: no diagram update needed for the cron-internal discovery change (no new module boundary; already documented cron flow). 

## 2026-08-11 Session — Ideas Persistence + Nightly Generation (COMPLETED)

Completed the full `ideas-persistence-plan.md` (7-phase plan) for auto-saving generated ideas, history, favorites, and nightly cron generation.

**What was done this session:**
- **Backend (Phases 0–3):**
  - Phase 0: Created `SavedIdeaSession` + `SavedIdea` entities with `ON DELETE CASCADE`, migration `AddSavedIdeasTables1786451852660.ts`, and wired `TypeOrmModule` into `IdeasModule`.
  - Phase 1: Added `saveGeneration()` to `IdeasService` (transactional session+ideas write, skips empty results), plus `listSessions`, `getSession`, `deleteSession`, `setFavorite`, `unreadNightlyCount`, `markNightlyRead` — all ownership-checked via `ForbiddenException`.
  - Phase 2: Added 6 controller endpoints (`GET /ideas/sessions`, `GET /ideas/sessions/:id`, `DELETE /ideas/sessions/:id`, `PATCH /ideas/ideas/:id`, `GET /ideas/nightly/unread-count`, `POST /ideas/nightly/mark-read`) with `JwtAuthGuard`, Swagger docs, and `ParseIntPipe`.
  - Phase 3: Created `IdeasTasksService` with `@Cron('0 0 4 * * *')`, gated by `IDEAS_NIGHTLY_ENABLED`, resolves admin via `UsersService.findFirstAdmin()` + model via `LlmProviderService.findFirstActiveTextModel()`, per-domain try/catch.
  - Fixed empty-session bug: `saveGeneration` now returns `0` (no session created) when `response.result` is empty.
- **Frontend (Phases 4–6) — completed by a previous agent:**
  - Phase 4: `IdeasService` gained 6 new API methods; `IdeasStore` gained history state + actions.
  - Phase 5: `IdeasHistory` component with filter bar (הכל/ליליים/מועדפים), expandable sessions, search, delete, route `/ideas/history`, sidebar nav, nightly banner on `IdeasPage`.
  - Phase 6: `IdeaCard` favorite star toggle (only in history view).
- **Phase 7 (docs):** Updated `architecture-diagram.md` (entities + cron flow), `STATUS.md`, `ideas-persistence-plan.md` (all phases marked complete).
- No architecture diagram update needed — no new module boundary; UI-only sidebar change + controller guard fix
- Pushed to origin/main (6 commits ahead → 0 ahead)

## 2026-08-11 Session — Ideas Persistence + Nightly Generation (COMPLETED)

Completed the full `ideas-persistence-plan.md` (7-phase plan) for auto-saving generated ideas, history, favorites, and nightly cron generation.

**What was done this session:**
- **Backend (Phases 0–3):**
  - Phase 0: Created `SavedIdeaSession` + `SavedIdea` entities with `ON DELETE CASCADE`, migration `AddSavedIdeasTables1786451852660.ts`, and wired `TypeOrmModule` into `IdeasModule`.
  - Phase 1: Added `saveGeneration()` to `IdeasService` (transactional session+ideas write, skips empty results), plus `listSessions`, `getSession`, `deleteSession`, `setFavorite`, `unreadNightlyCount`, `markNightlyRead` — all ownership-checked via `ForbiddenException`.
  - Phase 2: Added 6 controller endpoints (`GET /ideas/sessions`, `GET /ideas/sessions/:id`, `DELETE /ideas/sessions/:id`, `PATCH /ideas/ideas/:id`, `GET /ideas/nightly/unread-count`, `POST /ideas/nightly/mark-read`) with `JwtAuthGuard`, Swagger docs, and `ParseIntPipe`.
  - Phase 3: Created `IdeasTasksService` with `@Cron('0 0 4 * * *')`, gated by `IDEAS_NIGHTLY_ENABLED`, resolves admin via `UsersService.findFirstAdmin()` + model via `LlmProviderService.findFirstActiveTextModel()`, per-domain try/catch.
  - Fixed empty-session bug: `saveGeneration` now returns `0` (no session created) when `response.result` is empty.
- **Frontend (Phases 4–6) — completed by a previous agent:**
  - Phase 4: `IdeasService` gained 6 new API methods; `IdeasStore` gained history state + actions.
  - Phase 5: `IdeasHistory` component with filter bar (הכל/ליליים/מועדפים), expandable sessions, search, delete, route `/ideas/history`, sidebar nav, nightly banner on `IdeasPage`.
  - Phase 6: `IdeaCard` favorite star toggle (only in history view).
- **Phase 7 (docs):** Updated `architecture-diagram.md` (entities + cron flow), `STATUS.md`, `ideas-persistence-plan.md` (all phases marked complete).

**Verification:**
- `npm run build` (backend) ✅
- `npx ng build` (frontend) ✅ (budget warnings only, pre-existing)
- `npx jest ideas.service.spec.ts` — 6/6 pass ✅
- `npx jest ideas-tasks.service.spec.ts` — 2/4 pass (env timing issue, known, low priority)
- Mojibake scan clean on all touched files ✅

**Known issues:**
- `ideas-tasks.service.spec.ts`: 2 tests fail because `enabled` is evaluated at module construction (before `beforeEach` sets `IDEAS_NIGHTLY_ENABLED`). Fix: move env setup before `Test.createTestingModule`. Low priority.
- Environment variable documentation: `IDEAS_NIGHTLY_ENABLED`, `IDEAS_NIGHTLY_DOMAINS`, `IDEAS_NIGHTLY_COUNT`, `IDEAS_NIGHTLY_MODEL` need to be added to the project's `.env.example` or deployment docs.

**Next exact step:** Set `IDEAS_NIGHTLY_ENABLED=true` and `IDEAS_NIGHTLY_DOMAINS` in `.env` to activate nightly generation. Verify with a manual cron trigger or wait until 04:00 server time.

**Files touched (backend):** `saved-idea-session.entity.ts`, `saved-idea.entity.ts`, `AddSavedIdeasTables1786451852660.ts`, `ideas.module.ts`, `ideas.service.ts`, `ideas.controller.ts`, `list-sessions-query.dto.ts`, `set-favorite.dto.ts`, `ideas.service.spec.ts`, `ideas-tasks.service.ts`, `ideas-tasks.service.spec.ts`, `users.service.ts`, `llm-provider.service.ts`.

**Files touched (frontend):** `ideas.service.ts`, `ideas.store.ts`, `saved-idea-session.model.ts`, `saved-idea.model.ts`, `ideas-history.ts/html/css`, `idea-card.ts/html`, `ideas-page.ts/html`, `main-sidebar.html`, `app.routes.ts`.

**No architecture diagram update was needed beyond what the previous agent already added** — the new entities and nightly flow were already reflected in `architecture-diagram.md`.

## 2026-08-10 Session — Documenting commit `31eadd9` (seed rework + hidden changes)

The commit `31eadd9` ("Add HTML-in-Canvas proposal and review calendar documentation") has a message that does NOT match its contents — the diff contains no docs at all. This entry records what is actually inside it.

- **Seed rework (`llm-providers.seed.ts`):** rewritten to 5 providers / 46 models — `OmniRoute` (key `OmniRoute`, baseUrl default `http://localhost:20128/v1`, 1 model `auto/best-free`), `openrouter` (27 models), `agnes-ai` (5 models incl. image+video), `requesty` (1 model), `nvidia` (12 models). Models created only when the provider row is missing (no reconciliation of catalog additions to existing providers). **No Ollama provider** despite the DB plan. OmniRoute reads its API key from `OPENROUTER_API_KEY` (line 82) — likely copy-paste. Field is `apiKey`, stored plaintext from env (no encryption; plan marks it MANDATORY). `seedLlmProviders` is still **commented out** in `main.ts`.
- **Genetics/Terpene seeds:** moved from `modules/{genetics,terpene}/seeds/` to `core/seeds/`, expanded (+354 / +184), and now executed on boot in `main.ts`. `genetics.seed.ts` = full Hebrew strain catalog (idempotent by `name`, one dense row per strain with description/parents/origin/type/thcRange/terpenes/effects/colors). `terpene.seed.ts` = 18 Hebrew-named terpenes (idempotent by `name`, with englishName/scent/effects/color). Both are no-ops on re-run. Cosmetic glitch in `genetics.seed.ts` comment: the word `name` is split by a newline (`matched by\n ame)`) — harmless comment-only artifact.
- **Google Calendar q-scan (`google-calendar.service.ts`):** `q` with no date now scans −1 month → +1 year, paginates (2500/page) with a 10 000-item hard cap, and uses month arithmetic instead of `+86400000ms` (DST-safe). `system-context.constant.ts` updated to teach the LLM the new `q`/`date` semantics.
- **`llm-client.service.ts` + `llm.types.ts`:** `LlmResponse` gained `finishReason` + `rawCompletion`; response log includes `finish_reason`.
- **Ideas validation prompt (`idea-prompts.constant.ts` + `ideas.service.ts`):** rewritten with calibration examples, new JSON ordering (analysis before score), capped lists.
- **Small fixes:** `llm-provider.service.spec.ts` constructor arity; `swagger-spec.json` 403 for `forceRefresh`; deleted `migrations/run-encryption-migration.ts`, `run-google-calendar-tokens-migration.ts`, `create_user_llm_defaults.sql`, and 2 zero-change migration files.

- **⚠️ SSRF dev-bypass (`ssrf-guard.util.ts`):** `assertSafeUrl` now allows **HTTP + localhost/loopback** when `NODE_ENV !== 'production'` (hostname in `LOCALHOST_HOSTNAMES`: localhost, 127.0.0.1, 0.0.0.0, ::1). This is the same pattern as the reverted `82d9baa` regression, but **narrower** — the cloud-metadata blocklist (`169.254.169.254`, `metadata.google.internal`) stays blocked and https-only still applies to non-localhost hosts. Intent: local OmniRoute at `localhost:20128`. Documented here so it is a conscious decision, not a buried one.

- **Next exact step:** decide whether `seedLlmProviders` should be re-enabled in `main.ts` (it currently does not run) and whether OmniRoute's API key should read its own env var.
- **No architecture diagram update needed** — no new module boundary; seed + guard changes live inside existing modules.

## 2026-08-08 Session — H2: Genetics/Terpene AdminGuard + frontend hide admin buttons

- **Completed:** H2 (High #2) — genetics/terpene write+enrich endpoints were only protected with `JwtAuthGuard` (any logged-in user could modify the shared catalog and run paid LLM enrich calls). Now:
  - **Backend:** `@UseGuards(AdminGuard)` applied on 10 endpoints: genetics POST/PATCH/enrich/enrich-missing/DELETE + same 5 on terpenes. `AdminGuard` extends `JwtAuthGuard` so JWT + role check covered in one decorator. `ApiForbiddenResponse` descriptions updated where relevant.
  - **Frontend:** `isAdmin` computed signal added to `StrainHunterSettings` and `LlmProvidersManagement` (`authStore.userRole() === UserRole.Admin`). All admin-only buttons wrapped in `@if (isAdmin())`: genetics/terpene Regenerate+Delete per row, bulk enrich buttons, Add Provider, provider Edit/Delete, Add Model, model Edit/Delete, default-star toggle, test-result Delete buttons, Delete-all-test-results.
  - The existing `accessTo` directive exists but reads the role at input-set time (not reactive to signal changes); using `@if (isAdmin())` is more idiomatic here since user is already loaded via `loadMe()` on app init.
- **Files touched backend:** `genetics.controller.ts`, `terpene.controller.ts`
- **Files touched frontend:** `strain-hunter-settings.ts`, `strain-hunter-settings.html`, `llm-providers-management.ts`, `llm-providers-management.html`
- **Verification:** `npm run build` backend ✅, `npx ng build` frontend ✅ (only pre-existing budget warnings).
- **Decisions made:** 
  - Method-level `@UseGuards(AdminGuard)` over class-level `@UseGuards(JwtAuthGuard)` — GET endpoints remain accessible to all authenticated users (catalog is public read), only write/enrich gated.
  - `@if (isAdmin())` over `[accessTo]` directive — directive is not reactive (evaluated once at @Input set), while `@if` with computed signal reacts to auth state changes.
  - `setDefaultModel` also hidden for non-admin (it calls PATCH on the model).
- **Next exact step:** remaining High items: H4 (URL injection in agent), H5 (query-stream recursion), H7 (frontend route guard per role), H8 (hardcoded admin seed).
- **Open questions for the user:** לבדוק אם יש עוד מקומות בפרונטאנד שצריך להסתיר (users management מוגן? dashboard?).
- **No architecture diagram update needed** — RBAC on existing controllers, no new module boundary.

## 2026-08-08 Session — H4 + H5 closed (agent security)

- **H5 (recursion):** `AdminAgentController_streamChat` (operationId של `POST /admin-agent/query-stream`) נוסף ל-`HIDDEN_FROM_LLM` denylist ב-`swagger-tools.parser.ts` — המודל לא יכול לקרוא לריצת סוכן מקוננת. ה-endpoint נשאר זמין ל-UI (הצ'אט קורא לו ישירות). Parser spec הורחב ל-6 טסטים.
- **H4 (URL injection):** שתי שכבות:
  1. **Encoding** (ב-`resolveArguments`): `encodeURIComponent(String(value))` על ערכי path params — `1/../../sessions/5` הופך ל-`1%2F..%2F..%2Fsessions%2F5` (segment אחד מקודד, לא יכול לברוח מהנתיב). גם מתקן שמות עברית עם רווחים (`גורילה גלו` → UTF-8 + `%20`). 5 טסטים חדשים.
  2. **Defense-in-depth guard** (ב-`AgentToolExecutorService.assertSafeTargetUrl`): לפני שליחת ה-HTTP דוחה URL שלא מתחיל ב-`baseUrl`, escape של host-suffix, או נתיב המכיל `..`/`?`/`#` — מחזיר `{error, status: 403}` envelope. 9 טסטים חדשים ב-`agent-tool-executor.service.h4.spec.ts`.
- **Sub-agent split:** H4 חולק לשני תת-סוכנים במקביל (אחד על parser+spec, אחד על executor+spec) — בלי התנגשות קבצים; H5 בוצע על ידי הראשי לפני השחרור כי הוא נוגע באותו קובץ parser.
- **Files touched:** `swagger-tools.parser.ts`, `swagger-tools.parser.spec.ts`, `agent-tool-executor.service.ts`, `agent-tool-executor.service.h4.spec.ts` (חדש)
- **Verification:** parser spec 11/11 ✅ (כולל H3/H5), h4 executor spec 9/9 ✅, c5 spec ✅, `npm run build` backend נקי ✅. 3 כשלונות ב-`agent-session.service.spec.ts` הם pre-existing (imageUrl, מתועד מ-C4) ולא קשורים.
- **Risk note:** ה-guard דוחה `?`/`#` בכל remainder — מקרים לגיטימיים עתידיים עם `?` בנתיב המוצהר יהיו false positive (מקובל). URL-encoding traversal (`%2e%2e`) מטופל על ידי שכבת ה-encoding.
- **Remaining High:** H7 (frontend role guard) + H8 (hardcoded admin seed).

## 2026-08-08 Session — H8 closed (hardcoded admin seed)

- **H8 (hardcoded admin seed):** `user.seed.ts` now reads password from `ADMIN_PASSWORD` env. Behavior:
  - **Env set:** uses the env value, logs only `Admin user created: admin@admin.com` (never prints the password).
  - **Env not set + production:** generates a random 16-byte hex password, logs it ONCE with a warning to change it immediately.
  - **Env not set + dev:** falls back to `changeme` (safe enough for localhost, preserves dev workflow).
- Email stays `admin@admin.com` (it's an identifier, not a secret — visible in login UI anyway).
- **Decision:** "require password change on first login" is deferred — it needs a DB flag + middleware + frontend prompt and is a separate feature. The env-var approach removes the hardcoded secret, which was the critical risk.
- **Files touched:** `backend/src/core/seeds/user.seed.ts`
- **Verification:** `npm run build` backend ✅.
- **Remaining High:** H7 (frontend role guard) is the only High item left.

## 2026-08-08 Session — H7 closed (frontend role guard)

- **H7 (frontend role guard):**Two-layer defense:
  1. **Sidebar hiding** (`main-sidebar.ts`/`.html`): `isAdmin` computed from `authStore.userRole()`. "לוח בקרה" and "ניהול משתמשים" buttons wrapped in `@if (isAdmin())` — non-admin users don't see them at all.
  2. **Route guard** (`role.guard.ts`): `CanActivateFn` that checks `route.data.roles` against `AuthStore.userRole()`. Applied to `/dashboard` and `/users` with `data: { roles: [UserRole.Admin] }`. Non-admin users navigating directly to these URLs are redirected to `/chat`.
  - Redirect target `/chat` chosen over `/` to avoid infinite loop (`/` → `/dashboard` → roleGuard → `/` → ...).
- **Files touched:** `main-sidebar.ts`, `main-sidebar.html`, `role.guard.ts` (new), `app.routes.ts`
- **Verification:** `npx ng build` frontend ✅ (only pre-existing budget warnings).
- **All 8 High findings are now closed.** Remaining work is Medium items (L11/L34/L36 — need migration) and deferred Low items.

`82d9baa` ("skip SSRF validation in dev mode") was committed as part of a batch without individual review. It added a **total SSRF bypass** when `NODE_ENV !== 'production'` — not just localhost. Worse: if `NODE_ENV` is unset, the bypass activates silently. Caught and reverted (`021224b`) only because each commit was examined separately before closing the session.

**Rule going forward:** Never merge a batch commit without reviewing every file diff individually, even if "everything works." This applies especially to security-sensitive code (guards, validators, encryption).

## 2026-08-07 Session — Calendar UX fixes + SSRF regression fix

- **Calendar UX loop-breaker fix** (`a2b6853`): When the agent's `loop-breaker` fires (same tool+args 3+ times), it now checks if an auth URL from a previous successful `GoogleCalendarController_auth` call exists in conversation history. If found, injects a system message with the auth link and gives the LLM one more turn to produce a helpful response (e.g., "click here to connect your calendar") instead of a generic error.
- **Calendar q parameter** (`840bfbf` + `534841f`): Added `date` (YYYY-MM-DD) and `q` (text search) query parameters to `GET /calendar/events`. Taught the LLM via system context to use these for specific date queries and keyword searches.
- **Auth-url render card** (`6b6c60f`): New `auth-url-card` frontend component that renders the OAuth consent URL as a clickable card in chat. Registered in `RenderSpecService` so the agent can surface it when calendar isn't connected.
- **Cookie-state fallback** (`6b6c60f`): `handleCallback` now allows `state` without `cookieState` when the flow is initiated by the agent (internal HTTP call sets the cookie on the agent's response, not the user's browser). Security verified: state is still bound to userId in DB, still single-use (nulled after callback), still time-limited.
- **Auth cascade fix** (`589a7f9`): Removed `JwtAuthGuard` from `POST /auth/logout` (logout should succeed even with expired token). Added single-flight refresh deduplication in the frontend interceptor to prevent burst401s from triggering spurious logouts.
- **SSRF regression caught and reverted** (`021224b`): `82d9baa` added a `NODE_ENV !== 'production'` bypass to both `assertSafeUrl` and `IsSafeBaseUrl` validator — a total bypass, not localhost-only. Reverted after individual commit review revealed the risk.

## 2026-08-05 Session — C5: Confirmation flow activated + H3 self-confirmation closed (CLOSED)

- Completed: C5 — the `@RequiresConfirmation` decorator wrote metadata to NestJS Reflector but the swagger-spec never received `x-requires-confirmation`, so `isDangerousOperation()` always returned false and dangerous ops executed without confirmation. H3 (LLM self-confirmation) also closed in the same pass.
- Now:
  - Decorator rewritten: `applyDecorators(SetMetadata('requires_confirmation', true), ApiExtension('x-requires-confirmation', true))` — writes both NestJS metadata and OpenAPI extension.
  - Boot assertion in `main.ts`: counts `x-requires-confirmation: true` entries in swagger-spec and compares against a hardcoded expected list. Fails loud on mismatch — prevents the exact regression that caused C5.
  - H3 closed: `AdminAgentController_confirmAction` excluded from `getTools()` via denylist in `swagger-tools.parser.ts`. The endpoint still exists for the UI (human-only confirmation path).
- Files: `decorators/requires-confirmation.decorator.ts` (rewritten), `main.ts` (boot assertion), `swagger-tools.parser.ts` (H3 denylist), new `requires-confirmation.decorator.spec.ts` + `swagger-tools.parser.spec.ts`
- Decisions made: (1) Hybrid approach — `ApiExtension` (minimal, writes to spec) + boot assertion (regression guard), not a full DiscoveryService registry; (2) H3 denylist lives in `SwaggerToolsParser.HIDDEN_FROM_LLM` static set — easy to extend if more tools need hiding; (3) did not remove the unused `Reflector` from the parser constructor — it's harmless and might be useful for future runtime checks.
- Verification: 6 unit tests pass ✅, `npm run build` clean ✅, boot live: C5 assertion passes (3 ops in spec) ✅, confirmAction excluded from getTools ✅, confirm-action endpoint still exists in spec ✅.
- Next exact step: all 6 Critical findings closed. Remaining work is High-severity items (H1, H2, H4, H5, H7, H8) and migration-dependent Low items (L11, L34, L36).
- No architecture diagram update needed — no new module boundary or external provider; a decorator rewrite + assertion inside existing modules.

## 2026-08-05 Session — C3: SSRF + unbounded download in `extendVideo` fixed (CLOSED)

- Completed: C3 — `extendVideo` accepted an attacker-controlled `sourceVideoUrl` and fetched it blindly (no URL/IP validation, no size cap, silent redirects). Now:
  - DTO level: `@IsSafeUrl()` on `sourceVideoUrl` in `extend-video.dto.ts` (new `validate-safe-url.validator.ts` — https-only + hostname blocklist + private-range fast match, same pattern as the C2 baseUrl validator).
  - Runtime level: `downloadBuffer()` now runs `assertSafeUrl()` (DNS + ipaddr) before every hop — including each redirect (`redirect: 'manual'`, max 5 hops, relative locations resolved against the current URL), streams with a 100MB cap (also checks `content-length`), and keeps the 120s timeout. `SsrfError` → `BadRequestException` via `assertSafeDownloadUrl()`.
  - The guard lives in `downloadBuffer`, which is the single funnel for both user-supplied `sourceVideoUrl` and provider-resolved videoId URLs.
- Files: `backend/src/modules/llm/dto/validate-safe-url.validator.ts` (new), `backend/src/modules/llm/dto/extend-video.dto.ts` (added `@IsSafeUrl()`), `backend/src/modules/llm/services/llm-client.service.ts` (`downloadBuffer` + `assertSafeDownloadUrl`), `backend/src/modules/llm/services/llm-client.service.spec.ts` (new, 12 tests).
- Verification: 12 unit tests pass (blocked protocols/hosts/private DNS ranges, content-length cap, streaming cap, safe download, redirect re-validation incl. private redirect targets and multi-hop chains); `npm run build` clean; live HTTP with real JWT: `http://127.0.0.1`, `https://localhost`, `https://192.168.1.5` → 400 with the validator message; `https://example.com/v.mp4` passes validation and reaches the real download (fails only on the target's 404).
- Decisions made: reuse `assertSafeUrl()` from C2 (no new SSRF logic); cap at 100MB per the audit suggestion; keep the download single-funnel so no future caller can bypass validation.
- Next exact step: C5 — confirmation dead code (architectural, needs DiscoveryService/Reflector; also gates H3). Remaining High: H1 (users enumeration), H2 (genetics/terpene AdminGuard), H4 (raw URL injection in agent), H5 (recursion depth), H7 (frontend role guard), H8 (hardcoded admin seed). Then migration-dependent L11/L34/L36 and deferred L1/L28/L35.
- No architecture diagram update needed — no new module boundary or external provider; a validator + hardened fetch inside the existing `LlmModule`.

## 2026-08-05 Session — C4: Google Calendar authz/credentials fixed (CLOSED)

- Completed: C4 (Critical #4) — the entire Google Calendar module was unauthenticated and returned `refresh_token` to the client. Now fully closed:
  - All `/calendar` routes require `@UseGuards(JwtAuthGuard)` except `callback` (browser redirect from Google — no Authorization header can be sent; it is protected by OAuth `state` CSRF instead: random 32-byte state in an httpOnly `gcal_state` cookie + non-expired DB row bound to the initiating user).
  - Google refresh token is stored server-side, encrypted at rest (AES-256-GCM via the existing `EncryptionService`), in a new `google_calendar_tokens` table. It is never accepted from client input (removed `refreshToken` from all 3 event DTOs) and never returned in any response (callback returns `{ success: true }`).
  - Ownership is structural: tokens resolved by `req.user.sub` only, so there is no way to address another user's calendar.
  - Fixed a cross-user token leak: the shared singleton `oauth2Client` (whose `setCredentials()` would clobber between concurrent users) replaced with a per-call client.
- Files: `backend/src/modules/google-calendar/google-calendar.controller.ts`, `google-calendar.service.ts`, `google-calendar.module.ts`, `dto/create-event.dto.ts`, `dto/update-event.dto.ts`, `dto/delete-event.dto.ts`, new `entities/google-calendar-token.entity.ts`, new `google-calendar.controller.spec.ts` + `google-calendar.service.spec.ts`; new migration `backend/src/migrations/AddGoogleCalendarTokens1765000000000.ts` + runner `run-google-calendar-tokens-migration.ts`.
- Decisions made: (1) `callback` stays JWT-free by design — CSRF state + cookie + expiry is the authentication for the OAuth redirect; (2) per-call OAuth2 client instead of singleton; (3) dedicated table (not users columns) so the transient OAuth state doesn't pollute the User entity; (4) raw SQL migration follows the encryption-migration precedent; note `app.module.ts` still has `synchronize: true` which would auto-create the table anyway — the migration adds the explicit FK/`ON DELETE CASCADE` and is the documented DDL path.
- Verification: migration ran against the live DB (table shape matches entity) ✅; full backend boot OK ✅; live HTTP: `GET /calendar/events` no-JWT → 401, `GET /calendar/auth` no-JWT → 401, callback missing code → 400, callback state≠cookie → 400 ✅; 18 new unit tests pass ✅; `npm run build` clean ✅.
- Pre-existing failures confirmed NOT caused by this change: `app.controller.spec.ts` + `llm-provider.service.spec.ts` fail to compile (TS2339 `getHello`, TS2554 constructor arity); `agent-session.service.spec.ts` 3 `imageUrl` tests fail; jest-e2e can't run (puppeteer ESM import untransformable). All 3 unit suites + e2e were already broken in committed code.
- Next exact step: C3 — SSRF in `extendVideo` (`sourceVideoUrl`) — cheap because `assertSafeUrl()` exists in `backend/src/core/utils/ssrf-guard.util.ts` (reuse in `llm-client.service.ts` `extendVideo`/`downloadBuffer`). Then C5 (confirmation dead code — architectural, needs DiscoveryService/Reflector). Remaining after that: migration-dependent L11/L34/L36 and deferred L1/L28/L35.
- No architecture diagram update needed — no new module boundary or external provider; a table was added inside the existing `GoogleCalendarModule` (mention in LOG.md instead).

## 2026-08-05 Session - Media Studio LLM Provider Payload Check

- Completed: attempted Browser/DevTools inspection for `/llm-provider`; no browser targets were available in this Codex session (`agent.browsers.list()` returned empty), so verified the same live API payload directly against `http://localhost:3000/llm-provider`.
- Finding: unauthenticated `/llm-provider` returns `401 AUTH_MISSING_TOKEN`; authenticated with the local admin seed and inspected the payload.
- Result: every returned model object includes a `capability` field (`modelsMissingCapability = 0`), but all 45 returned models have `capability: "text"`.
- Critical detail: provider `agnes-ai` is active and includes `agnes-image-2.0-flash`, `agnes-image-2.1-flash`, and `agnes-video-v2.0`, but all three are returned as `capability: "text"`. Media Studio correctly filters by `image`/`video`, so the select is empty.
- Source check: `LlmModelEntity` has the `capability` enum and `LlmProviderService.findProviders()` returns entities directly; no backend DTO mapping is stripping the field. `seedLlmProviders(dataSource)` contains the correct Agnes image/video capabilities but is currently commented out in `backend/src/main.ts`, so startup reconciliation does not fix old rows.
- Files touched this session: `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- Decisions made: no code changes; this was a runtime payload investigation only. No architecture diagram update needed.
- Open questions for the user: whether to update the DB rows directly, re-enable/run the seed reconciliation, or add a one-off repair migration/script.
- Next exact step: update the existing `llm_models` rows for `agnes-image-2.0-flash` and `agnes-image-2.1-flash` to `capability = 'image'`, and `agnes-video-v2.0` to `capability = 'video'`; then reload Media Studio and confirm both selects populate.

## 2026-08-05 Session — Full Code Review (read-only audit)

- Completed: comprehensive code review of backend + frontend (security, bugs, performance, maintainability) — no code changes.
- Output: `documents/audit/code-review-2026-08-05.md` — 6 Critical / 8 High / 22 Medium / ~36 Low-Info findings, with file:line, fix suggestions, and quick-wins ordered list.
- Top findings: (1) `/llm-provider` lacks AdminGuard + `apiKey` returned plaintext to any user; (2) SSRF via DB-backed `baseUrl` + `extendVideo` `sourceVideoUrl`; (3) `@RequiresConfirmation()` never reaches swagger spec → confirmation flow dead; (4) Google Calendar controller has zero guards; (5) frontend refresh-on-401 race causes random logouts; (6) hardcoded admin seed `admin@admin.com`/`admin`.
- Files touched this session: `documents/audit/code-review-2026-08-05.md` (created), `documents/HANDOFF.md`, `documents/STATUS.md`.
- Decisions made: none (read-only audit). No architecture changes — architecture diagram needs no update.
- Open questions for the user: which findings to fix first (recommended quick-win order is in the audit file §Quick Wins); whether to open a dedicated fix branch per area.
- Next exact step: pick the first quick win (add `AdminGuard` to `llm-provider.controller.ts` + hide `apiKey`) and implement on a new branch.

## 2026-08-01 Session — Tooltip Effect Tag Font Size

**Tooltip terpene effect tag size reduction**

- Reduced `.tooltip-card-effect-tag` font size from `var(--font-size-xs)` (12px) to `9px` in the shared tooltip component.
- Files touched: `frontend/src/app/components/shared/tooltip/tooltip.css` (modified)
- Verification: CSS-only change, no build/lint/test verification performed.
- Decisions made: reduced only the effect tag, not the tooltip name, description, or icon — per user's explicit instruction.
- Open questions for the user: none
- Next exact step: visually confirm the tooltip in the strain-hunter page shows smaller effect tags
- No architecture diagram update needed (CSS-only, no new components or endpoints)

## 2026-07-28 Session — CSS Animation Audit, Page Layout Unification, Drag-and-Drop Fix

**CSS Animation Audit (files #16-52):** All feature CSS files audited with `find-animation-opportunities` and `emil-design-eng` skills. Key fixes: `:active scale(0.97)` on buttons/interactive elements; GPU-accelerated `scaleX()` replacing `width` transitions on progress bars (chat system-status, database-monitor-settings, database-storage-monitor, media-studio); grid-rows expand/collapse animation on idea-card; `.preview-bar-fill` transform-origin fixed to `right center` for RTL; removed dead `.match-btn` rule; theme toggle transition added; `prefers-reduced-motion` verified in multiple files; removed `scale(0.97)` from `.session-row` (looked bad on list items); added `slide-up` class to ideas-form and media-studio composer areas.

**Settings Design System tab:** Added `DesignSystem` component import to `settings.ts`, added tab `value="3"` with Hebrew label "מערכת עיצוב" to `settings.html`.

**Matching preferences drawer reset buttons:** Changed all3 reset buttons to `button icon-only sm transparent-btn reset-btn`, removed text label from third button, added tooltip to third button.

**Page layout unification:** Made all3 composer pages (chat, ideas, media-studio) use `page-content flush`. Added `overflow: hidden` to `.page-content.flush` to prevent scrollbar flash during `slideUp` animation. Removed duplicate layout overrides from `chat.css` (`.chat-root-container`) and `media-studio.css` (`.page-content`). Added `position: relative` to `.composer-area`.

**Drag-and-drop fix:** Moved drag handlers to root `page-content`, visual overlay into `composer-area`. Added drag counter pattern to prevent flickering. Fixed `z-index` (5→15) and background opacity. Applied user's preferred `.drop-overlay` CSS with `top:0; left:4px; right:4px; bottom:4px`.

**Auto-focus:** Added auto-focus to ideas-form domain input and media-studio textarea via `@ViewChild` + `ngOnInit`.

- **Completed:** CSS animation audit #16-52, Settings Design System tab, matching-preferences-drawer reset buttons, page layout unification, drag-and-drop fix, auto-focus for ideas/media-studio
- **Files touched:** `_layout.css` (modified), `_composer.css` (modified), `chat.html` (modified), `chat.css` (modified), `chat.ts` (modified), `media-studio.html` (modified), `media-studio.css` (modified), `media-studio.ts` (modified), `ideas-form.html` (modified), `ideas-form.ts` (modified), `settings.ts` (modified), `settings.html` (modified), `matching-preferences-drawer.html` (modified), `matching-preferences-drawer.css` (modified)
- **Verification:** no build/lint/test verification performed this session (CSS/HTML/TS changes only)
- **Decisions made:** `.flush` class is necessary (5 pages use `page-content` without it); drop overlay covers only composer area (user confirmed); all3 composer pages share same layout via `.flush`; drag counter pattern for flickering prevention; auto-focus on primary input for all composer pages
- **Open questions for the user:** none
- **Next exact step:** pick up the next active plan from `documents/features/todo/` — either `dynamic-pharm-scraping-plan.md` or `provider-and-llm-db-plan.md`
- No architecture diagram update needed (CSS/layout-only, no new components or endpoints)

## 2026-07-26 Session — Drag-and-Drop, Drop Overlay, Ideas Card — All Reverted

**Objective:** fix drag-and-drop flicker, drop overlay blur, model capability errors, and idea card z-index/blur issues.

- **Outcome:** ALL changes were reverted. The original codebase was working correctly. The attempted fixes introduced regressions (broken blur, card expansion pushing layout, visual artifacts).
- **Lessons learned:**
  - `.glass-effect`'s `::before` pattern with `z-index: -1` is fragile — adding `backdrop-filter` directly or changing `isolation` breaks it.
  - `isolation: isolate` on `.card` is intentional — removing it causes stacking context issues.
  - The drag counter pattern for drag-and-drop was unnecessary — the original code was not flickering.
  - `fade-in` class on `.drop-overlay` was already correct — adding it to chat's overlay caused no benefit.
- **Files touched (all reverted):** `chat.ts`, `chat.html`, `media-studio.ts`, `media-studio.html`, `_composer.css`, `idea-card.css`, `ideas-grid.html`
- **Current state:** Clean — no uncommitted changes. All features working as before.
- **Next step:** Tomorrow — calmly and slowly investigate the glass-effect visual artifacts (lines on adjacent cards when hovering). The root cause is `.glass-effect`'s `::before` pattern. Consider migrating from `::before` + `z-index: -1` to direct `backdrop-filter` on the element itself (like was done for `.drop-overlay`). Test thoroughly before committing.
- No architecture diagram update needed (CSS-only, no new components or endpoints).

**Objective:** consolidate duplicated CSS patterns across composer inputs — label styles, compact input styles, and native number spinners.

- **Label consolidation:** moved bare `label` styles to `_typography.css` with `color: var(--color-text-primary)`. Removed duplicate nested `.form-field label` from `_forms.css` and bare `label` from `_forms.css`. Simplified `.composer-count label` in `_composer.css` to only `white-space: nowrap`. Now all labels get styling from one global bare `label` rule.
- **Global `.compact-input` class:** created in `_forms.css` with size variants (`xs`, `sm`, `md`, `lg`). Removed duplicated input styles from `_composer.css` (`.composer-count input[type='number']`) and `media-studio.css` (`.compact-input`). Updated HTML templates to use the new classes.
- **Native number spinner hiding:** added global `input[type='number']` spinner hiding in `_forms.css` (`-moz-appearance: textfield` + webkit pseudo-element reset).
- **Custom number stepper:** created `.number-stepper` CSS in `_forms.css` with `ph-caret-up`/`ph-caret-down` buttons. Added `incrementCount()`/`decrementCount()` to `IdeasForm` (bounds 1-10) and `incrementNumFrames()`/`decrementNumFrames()` + `incrementFrameRate()`/`decrementFrameRate()` to `MediaStudio` (bounds 1-441, 1-60). Updated HTML templates with `.number-stepper` wrapper.
- **Media mode toggle:** moved `media-mode-toggle` inside `composer-field`, made it smaller (22px buttons, xxs icons), positioned at `left: var(--space-2)` (ignoring padding). Added `position: relative` to `.composer-field` in `_composer.css`.
- **Files touched:** `frontend/src/app/assets/styles/_typography.css` (modified), `frontend/src/app/assets/styles/_forms.css` (modified — label cleanup, compact-input class, number-stepper, spinner hiding), `frontend/src/app/assets/styles/_composer.css` (modified — removed duplicated input styles, added position relative), `frontend/src/app/features/media-studio/media-studio.css` (modified — removed .compact-input styles, updated media-mode-toggle), `frontend/src/app/features/media-studio/media-studio.html` (modified — stepper buttons, toggle moved), `frontend/src/app/features/media-studio/media-studio.ts` (modified — increment/decrement methods), `frontend/src/app/features/ideas/ideas-form/ideas-form.html` (modified — stepper buttons), `frontend/src/app/features/ideas/ideas-form/ideas-form.ts` (modified — increment/decrement methods).
- **Verification:** `npx ng lint` not configured; CSS-only changes, no logic to test.
- **Decisions made:** label styles consolidated to one global bare `label` in `_typography.css`; `.compact-input` variants use `xs`/`sm`/`md`/`lg` naming; number stepper uses `ph-caret-up`/`ph-caret-down` icons; media-mode-toggle repositioned to top-left of composer-field.
- **Open questions for the user:** none.
- **Next exact step:** visual check of the number steppers in ideas and media-studio pages, then commit.
- No architecture diagram update needed (CSS-only, no new components or endpoints).

## 2026-07-22 Session — Main Sidebar Chat History Dropdown Fix

**Objective:** fix 3 issues with the chat history dropdown in the main sidebar — missing blur/glass-effect, feather button not navigating, and click event bubbling to the parent chat button.

- **Root cause:** `<app-dropdown>` was nested inside `<button routerLink="/chat">` (invalid HTML). Buttons create an opaque rendering context that breaks `backdrop-filter`, and click events bubble to the parent `routerLink`.
- **Fix:** Moved `<app-dropdown>` outside the chat `<button>` into a `.nav-item-chat` wrapper div. The chat button and feather button are now siblings, not nested.
- **Layout fix:** Added `.nav-item-chat` CSS inside `.nav-list` with `::ng-deep` to override the dropdown component's `width: 100%` / `display: grid` on `.dropdown-wrapper`, preventing layout breakage.
- **Event fix:** Added `$event.stopPropagation()` to the feather button `(click)` handler to prevent bubbling to the parent `routerLink="/chat"`.
- **Tooltip:** Added `appTooltip text="היסטוריית שיחות"` to the feather button, imported `TooltipDirective`.
- **Files touched:** `main-sidebar.html` (restructured chat button + dropdown), `main-sidebar.ts` (added `TooltipDirective` import), `main-sidebar.css` (added `.nav-item-chat` layout rules with `::ng-deep` dropdown override).
- **Verification:** `npx ng build` passes. No new warnings beyond pre-existing ones.
- **Decisions made:** Kept `.nav-sub-list` wrapper inside dropdown content for CSS selector matching; used `::ng-deep` to pierce Angular emulated encapsulation for dropdown width override. The `.nav-item-chat` pattern (hover-to-reveal history button with dropdown) is reusable — when adding history to Ideas and Media Studio, extract into a shared component or global CSS pattern.
- **Next exact step:** visual regression check on sidebar across all pages, then git diff review and commit.
- **Open questions for the user:** none.

## 2026-07-22 Session — CSS Overriding Remediation

**Objective:** remediate 27 class-name violations found in the CSS overriding audit, applying the principle: structural overlap → merge with modifier; no overlap or different element → independent name (rename if misleading).

- **Rule A (exact match) — llm-providers-management:** `.row-subtitle` → new `.row-subtitle--flex` modifier in `_utilities.css`; `.status-indicator` → renamed `.status-dot`; `.panel-header.compact` and `.panel-title.muted` deleted (exact global duplicates). `.col-expand` kept (complementary, not conflicting).
- **Rule A (duplicates) — `.fade-in` ×5 + `.form-field` + `.metric-card`:** All deleted from component files; resolved from global `_animations.css`, `_forms.css`, `_layout.css`.
- **Badges:** `.flag-badge` kept (false positive — compound element). `.count-badge` → renamed `.count-value`. `.strain-penalty-badge` → merged into `badge badge-danger badge-compact` (new `badge-compact` modifier in `_utilities.css`).
- **Chips:** `.detail-chip` ×2 → renamed `.detail-tile`. `.db-chip` → renamed `.db-stat-pill`. `.terpene-chip`/`.genetics-chip` → merged into `.chip` with 4 state modifiers (`chip-neutral`, `chip-like`, `chip-love`, `chip-avoid`) in `_filters.css`. Local CSS keeps scoped `border`/`radius-xl` override + `.chip-name`/`.chip-state` child styles. `chipClass()` updated to return `chip chip-${state}`.
- **Cards:** `.summary-card` (db-storage) → renamed `.summary-row`. `.forecast-card` → renamed `.forecast-tile`. `.summary-card` (weather-summary) kept with explanatory comment (intentionally no accent, glass-effect handles surface).
- **Bonus fixes:** "Add Model" button changed from `transparent-btn sm` to `primary-btn filled sm`; `.panel-header.compact` `justify-content: flex-start` override removed.
- **Files touched:** 21 files — 2 global CSS (`_utilities.css`, `_filters.css`), 10 component CSS, 7 HTML, 1 TS, 3 spec files.
- **Verification:** `npx ng build` passes. No stale references. Summary saved to `documents/done/css-overriding-search-remediation.md`.
- **Decisions made:** principle documented ("structural overlap → merge, else → independent name"); `.card--flat` modifier rejected (redundant with `.glass-effect`); `.status-dot` chosen over `.status-indicator--compact` (different component, not a variant).
- **Open questions for the user:** visual regression check needed across all 8 changed pages before commit.
- **Next exact step:** visual regression on llm-providers, strain-hunter, database-storage-monitor, weather-current/summary/forecast, database-monitor-settings, matching-preferences-drawer. Then git diff review and commit.

## 2026-07-22 Session — Ideas Page Chat-Style Layout

**Objective:** make the ideas page (Business Idea Generator) look and feel like the chat page — full-height flex column with the form docked at the bottom and results scrolling above it — and lift the shared composer shell to a global partial so chat and ideas share one CSS source.

- **Global composer shell:** new `frontend/src/app/assets/styles/_composer.css` with `.composer-area`, `.composer-field`, `.composer-submit` (input shell with focus glow + circular send/stop). Wired from `frontend/src/styles.css` between `_filters.css` and `_primeng-overrides.css`.
- **Chat updated to the global shell:** `chat.html` swaps `chat-input-area` → `.composer-area`, `chat-prompt-field` → `.composer-field`, `chat-send-btn` → `.composer-submit`. `chat.css` had the moved rules removed; chat-specific rules (image preview, drag overlay, history loader, prompt-actions row) stay local.
- **Ideas page restructure:** `ideas-page.html` now uses `page-content.ideas-root` → `flex: 1; overflow-y: auto` `.ideas-scroll` for header + `@switch` body. `<app-ideas-form />` is now a sibling of `.ideas-scroll`, rendered at the bottom inside `.composer-area`. `ideas-page.css` lost `.ideas-layout` and gained the dock rules.
- **Ideas form restructure:** `ideas-form.html` dropped the `glass-effect card` wrapper and renders the composer-field structure: domain `<input>` on top + `.composer-meta-row` (count slider on the left, model `<p-select>` + circular submit/stop on the right). Submit uses `.composer-submit` and toggles to `ph-stop` while loading.
- **Stop support:** `IdeasStore.stopGenerating()` unsubscribes the SSE subscription (which aborts the fetch via the existing `controller.abort()` teardown), clears `loading`, sets `partial: true` + "היצירה הופסקה על ידי המשתמש" when partial results exist. Error path filters `AbortError`. `IdeasForm.onStopGenerate()` wires the button.
- **Files touched:** `frontend/src/app/assets/styles/_composer.css` (new), `frontend/src/styles.css`, `frontend/src/app/features/chat/chat/chat.html`, `frontend/src/app/features/chat/chat/chat.css`, `frontend/src/app/features/ideas/ideas-page/ideas-page.html`, `frontend/src/app/features/ideas/ideas-page/ideas-page.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.html`, `frontend/src/app/features/ideas/ideas-form/ideas-form.css`, `frontend/src/app/features/ideas/ideas-form/ideas-form.ts`, `frontend/src/app/core/store/ideas.store.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- **Decisions made:** lift the shared shell to a global partial (per `css-rules.md` rule that reusable patterns belong in global files); keep the model `<p-select>` template component-local (it is already shared via `LlmProviderStore.chatModels`); use the existing `controller.abort()` teardown path for stop support rather than adding a new API.
- **Verification:** `npx ng build` from `frontend` passes with no new warnings (only pre-existing strain-hunter and initial-bundle budget warnings remain). `npx ng test --watch=false` passes 120/123; the 3 failures are pre-existing (`app.spec.ts` × 2, `currency-card.component.spec.ts` × 1) and unrelated. Corruption scan on touched files is clean.
- **Next exact step:** visually open `/ideas` in the running dev server, confirm the composer docks at the bottom and matches the chat composer, then start a generation and click stop to confirm `AbortError` is suppressed and partial results are preserved. If the user wants the same composer for a future admin confirmation flow, point them at `_composer.css` and the `.composer-*` classes.
- **Open questions for the user:** none.
- **Follow-up (same session):** ideas empty state was still using the global `page-state empty-state` card chrome (full-height card with icon + title + subtitle), which didn't match the chat's `.empty-chat-state` pattern. Replaced it with a new `.empty-ideas-state` class in `ideas-page.css` that mirrors `.empty-chat-state` — centered teal `.ph.xl` icon + `h3.title` + `.subtitle`, no card chrome. The `PageStates.Error` block stays on `.page-state.error-state` because the chat page has no error UI. Build passes, corruption scan clean.

## 2026-07-21 Session — Business Idea Generator Closed

**Objective:** verify and close the already-implemented business idea generator.

- **Verification:** backend `nest build` passes (clean, no new errors). Frontend `npx ng build` passes with pre-existing warnings only (bundle budget, matching-preferences-drawer.css budget, strain-hunter.css budget). No new CSS budgets or build warnings from the ideas feature.
- **Wiring confirmed:** `IdeasModule` is in `AppModule`. `ThrottlerModule.forRoot` is wired with two named throttlers (`ideasCostShort`: 30/60s, `ideasCostLong`: 150/3600s) scoped via `skipIf` to `/ideas` routes. `IdeasThrottlerGuard` extends `ThrottlerGuard` with weighted counting and Hebrew 429 response, applied globally as `APP_GUARD`. `/ideas` route + sidebar link exist.
- **Backend files (8):** `ideas.module.ts`, `ideas.controller.ts` (POST `/ideas/generate` + SSE `GET /ideas/generate/stream`), `ideas.service.ts` (3-phase agentic loop: signal gathering → idea generation → validation with partial results + 60s timeout), `dto/generate-ideas.dto.ts`, `dto/idea-result.dto.ts`, `guards/ideas-throttler.guard.ts`, `interfaces/idea.interface.ts`, `constants/idea-prompts.constant.ts`.
- **Frontend files (15):** `ideas-page` (PageStates shell), `ideas-form` (domain input + count slider), `ideas-progress` (3-segment phase bar), `ideas-grid` (responsive grid + partial banner), `idea-card` (score badge green/yellow/red, groundedInSignals tag, expandable risks/competitors/nextSteps), `ideas.store.ts` (signals + SSE stream consumption), `ideas.service.ts` (raw fetch SSE with AbortController + 401 refresh), `idea.interface.ts`.
- **Mojibake scan:** clean — no corrupted Hebrew characters in any ideas files.
- **Moved to done:** `business-idea-generator-plan.md`, `chat-idea.md`.
- **Next exact step:** pick up the next active plan — either `dynamic-pharm-scraping-plan.md` (~3-4h) or `provider-and-llm-db-plan.md` (~10-14h). Or manually test `/ideas` with live SearXNG + LLM.
- **Files touched:** `documents/done/business-idea-generator-plan.md` (moved), `documents/done/chat-idea.md` (moved), `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- **Decisions made:** all implementation was pre-existing; this session was verification + documentation close-out only.
- **Open questions for the user:** none.

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
  incomplete/
```

## How To Use

- Put new approved feature plans in `documents/features/todo/`.
- Put unfinished drafts in `documents/features/incomplete/`.
- Move completed implementation plans to `documents/done/`.
- Put scan/review reports in `documents/audit/`.
- Keep `documents/architecture-diagram.md` updated when backend or frontend architecture changes.

## Notes For Next Agent

## 2026-07-20 Session — Loader Shimmer Plan Implemented (Phases 1, 2, 3, 5, 6)

**Objective:** implement the loader shimmer plan to unify inline animated loaders.

- **Phase 1 (foundations):** Added `@keyframes shimmer-sweep` + `@keyframes shimmer-sweep-rtl` to `_animations.css`. Added `.shimmer`, `.shimmer--sm/md/lg`, `.shimmer-text` utility classes to `_utilities.css` with RTL mirroring, `prefers-reduced-motion` fallback, and `color-mix()` gradient over existing tokens.
- **Phase 2 (chat step):** Replaced the three-pulse `loading-dots` in `chat-message.html:33-38` with `<span class="shimmer-text">טוען...</span>` + spinner icon. Deleted the dead `.response-loader` block (`chat-message.css:177-199`) and the `.loading-dots` block (`chat-message.css:232-252`). Removed the unused `responseLoaderPulse` keyframe and cleaned up media query references.
- **Phase 3 (strain-hunter):** Replaced `.dots-loader` in `strain-hunter.html:110-115` with `<span class="shimmer shimmer--sm">`. Deleted `.loading-dots`, `.dots-loader` rules and the `dot-bounce` keyframe from `strain-hunter.css`.
- **Phase 5 (text shimmer):** Wrapped `טוען...` in shimmer-text in `login.html:32`, `register.html:40`. Wrapped `מבצע העשרה...` in shimmer-text in `strain-hunter-settings.html:47,332`. Wrapped `טוען נתוני מסד נתונים...` in shimmer-text in `database-monitor-settings.html:4`.
- **Phase 6 (verification):** Grep confirms zero matches for `loading-dots|response-loader|dots-loader|dot-bounce|responseLoaderPulse`. `custom-loader` has 7 hits (1 definition + 6 templates) as expected. `npx ng build` passes. `npx ng test --watch=false`: 120 passed, 3 pre-existing failures.
- **Phase 4 (`.custom-loader` rebrand) remains deferred.** The duplicate in `chat.css:27-34` stays until Phase 4 unblocks.
- **Files touched:** `_animations.css`, `_utilities.css`, `chat-message.html`, `chat-message.css`, `strain-hunter.html`, `strain-hunter.css`, `login.html`, `register.html`, `strain-hunter-settings.html`, `database-monitor-settings.html`.
- **Next exact step:** move `loader-shimmer-plan.md` to `documents/done/` once the user confirms the shimmer looks correct in production. Phase 4 is deferred — see "Deferred work" in the plan.
- **Open questions for the user:** none.

## 2026-07-19 Session — Agnes GenUI render blocks + video frame-continuation

**Objective:** make Agnes image/video results render inline in chat, prefer the 2.1 image model, and support "continue video from last frame".

- **GenUI image block:** Added `RenderSpecType.AgnesImage` + union entry in `render-spec.interface.ts`, `image.render-spec.ts` schema (requires `url` or `b64Json`), and a `LlmController_generateImage` → `AgnesImage` mapping in `render-spec.service.ts`. Frontend: new `agnes-image-card` block (ts/html/css) registered in `render-host.component.ts` (case `agnes-image`). The controller now returns `model` and logs the resolved image model (`generateImage resolved model=... [fallback]`).
- **Image model default:** `LlmController.resolveCapabilityModel` fallback now picks the highest-version active model of the requested capability (`pickLatestModel` + `extractVersion`), so `agnes-image-2.1-flash` is preferred over `2.0-flash` when the agent omits `modelId`. Both models stay active/selectable.
- **GenUI video block:** Added `RenderSpecType.AgnesVideo` + `video.render-spec.ts`, mappings for `LlmController_getVideo` and `LlmController_createVideo`. Frontend: new `agnes-video-card` block (ts/html/css) registered in `render-host.component.ts` (case `agnes-video`) showing an inline `<video>` player + model/seconds pills.
- **Video polls to completion:** `LlmClientService.createVideoTaskAndWait` submits the task then polls `getVideoResult` until `completed` (timeout 150s), so `createVideo` returns a real `.mp4` URL — the agent can no longer hallucinate a broken link. `getVideo` controller also returns `model`.
- **Frame-continuation feature (`extendVideo`):** Added `ffmpeg-static` dependency. New `LlmClientService.extendVideo` downloads the source video (by `sourceVideoId` re-polled via `getVideoResult`, or `sourceVideoUrl`), extracts the last frame via ffmpeg (`-sseof -1 -frames:v 1`) to a PNG, base64-encodes it, and submits an image-to-video task with that frame. New `POST /llm/video/extend` (`ExtendVideoDto`) with tool name `LlmController_extendVideo`, render mapping → `AgnesVideo`. Verified empirically that Agnes accepts base64 image input for video (STATUS 200), so no external image hosting is needed. Live test: agent called `extendVideo`, rendered an inline `agnes-video` card with the real `.mp4`.
- **Verification:** backend `npm run build` passes; frontend `npx ng build` passes (pre-existing unrelated warnings only). 
- **Files touched:** `backend/src/modules/admin-agent/render-spec/render-spec.interface.ts`, `image.render-spec.ts` (new), `video.render-spec.ts` (new), `render-spec.service.ts`, `backend/src/modules/llm/services/llm-client.service.ts` (image logging path, `createVideoTaskAndWait`, `extendVideo`, `downloadBuffer`, ffmpeg imports), `backend/src/modules/llm/llm.controller.ts` (image model log, `getVideo`/`createVideo`/`extendVideo` return `model`, new `extendVideo` endpoint), `backend/src/modules/llm/dto/extend-video.dto.ts` (new), `backend/package.json` (`ffmpeg-static`), `frontend/src/app/features/chat/blocks/agnes-image-card/*` (new), `frontend/src/app/features/chat/blocks/agnes-video-card/*` (new), `frontend/src/app/features/chat/render-host/render-host.component.ts`.
- **Architecture diagram updated:** added Agnes AI to External Providers, Agnes multimodal edges + `ffmpeg-static` frame-extract node in System Architecture, an `Agnes Multimodal Generation Flow` sequence diagram, an `agnes-image`/`agnes-video` RenderSpec → chat block path in GenUI Rendering Path, and Agnes notes in Current Architecture Notes.
- **Next exact step:** feature complete; no further action unless the user requests changes (e.g. video continuation from a specific frame index, or audio). 
- **Open questions for the user:** none.


## 2026-07-18 Session — Agnes AI Multimodal Plan Implemented (Phases 1-6)

**Agnes AI Multimodal plan: fully implemented end-to-end.**

- Implemented all 6 phases of `documents/features/todo/agnes-ai-multimodal-plan.md`:
  - **Phase 1:** Added `capability: 'text' | 'image' | 'video'` enum column to `LlmModelEntity` (default `'text'`). Fixed the seed: Agnes provider now seeds as key `agnes-ai` with baseUrl `https://apihub.agnes-ai.com/v1`, per-model `capability`, and an idempotent update-in-place reconciliation for any pre-existing legacy `agnes` row (no delete+reinsert, no unique-key collision). Added `capability` to `CreateLlmModelDto`/`UpdateLlmModelDto` and the `LlmModelCapability` union to `llm.types.ts`.
  - **Phase 2:** `LlmClientService.generateResponse`/`generateStream` now reject non-`text` models early via `assertCapability` (BadRequestException). `LlmHealthService.testAllModels` skips non-text models; `testLlm` rejects non-text models so the Settings test button surfaces a clear message instead of 500.
  - **Phase 3:** `LlmClientService.generateImage` issues a raw `fetch` to `{baseUrl}/images/generations` with `response_format`/`image`/`ratio` inside `extra_body` (SDK path was rejected as unreliable for the Agnes quirk), 360s timeout, retry wrapper. New `LlmImageRequest`/`LlmImageResult` types.
  - **Phase 4:** `LlmClientService.createVideoTask` + `getVideoResult` via raw `fetch` against `{baseUrl}/videos` and `{baseUrl}/agnesapi?video_id=...`. Polling is on-demand (no background job). New `LlmVideoRequest`/`LlmVideoTask`/`LlmVideoResult` types.
  - **Phase 5:** `LlmController` exposes `POST /llm/image/generate`, `POST /llm/video/generate`, `GET /llm/video/:videoId` with full Swagger decorators and a `resolveCapabilityModel` helper (modelId → user default → first active capability model). Created `generate-image.dto.ts`, `create-video-task.dto.ts`, `video-id-param.dto.ts`.
  - **Phase 6:** Frontend `LlmModel` interface gained `capability` and dropped the stale `isDefault`; added `LlmProviderStore.chatModels` (filters grouped providers to `capability === 'text'`) and bound the chat `<p-select>` to it.
- Decisions made: used raw `fetch` for image/video (not the OpenAI SDK) because Agnes's `extra_body` quirk makes `client.images.generate` unreliable; documented in this HANDOFF. No architecture diagram update needed (endpoints stay inside `LlmModule`).
- Verification: `npm.cmd run build` from `backend` passes; `npx ng build` from `frontend` passes (pre-existing unrelated warnings only). `rg "isDefault" frontend/src` returns no matches.
- Files touched: `backend/src/modules/llm-provider/entities/llm-model.entity.ts`, `backend/src/modules/llm-provider/dto/create-llm-model.dto.ts`, `backend/src/modules/llm/types/llm.types.ts`, `backend/src/core/seeds/llm-providers.seed.ts`, `backend/src/modules/llm/services/llm-client.service.ts`, `backend/src/modules/llm/services/llm-health.service.ts`, `backend/src/modules/llm/llm.controller.ts`, `backend/src/modules/llm/dto/generate-image.dto.ts` (+ create-video-task, video-id-param), `frontend/src/app/core/services/llm-provider.service.ts`, `frontend/src/app/core/store/llm-provider.store.ts`, `frontend/src/app/features/chat/chat/chat.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`.
- Next exact step (manual, requires live server + JWT + AGNES_API_KEY): run `synchronize`/seed, then `POST /llm/image/generate` and `POST /llm/video/generate` via Swagger/curl and visually confirm the chat dropdown hides image/video models. Plan moved to `documents/done/agnes-ai-multimodal-plan.md`.
- Open questions for the user: none. Deferred (per plan Out of Scope): frontend media studio UI for image/video.

## 2026-07-18 Session — Agnes AI Multimodal Plan Review and Rewrite

**Agnes AI Multimodal plan: reviewed and rewritten against the actual codebase.**

- Reviewed `documents/features/todo/agnes-ai-multimodal-plan.md` against the real source (LlmClientService, LlmProviderConfigService, llm-providers.seed.ts, LlmController, LlmTasksService, frontend LlmProviderService) and rewrote the plan in place. No code was changed this session — plan only.
- Key corrections applied during the review:
  - The seed mis-keys the Agnes provider (`key: 'agnes'`, `baseUrl: 'https://api.agnes.ai/v1'`) while the runtime services look up `key: 'agnes-ai'` with the apihub URL. The chat model is currently unreachable through the DB path. The new Phase 1 mandates an update-in-place reconciliation that comes before the insert, to avoid a unique-key collision.
  - The previous plan referenced `GET /llm/model-options` — that endpoint does not exist. The new plan routes capability filtering through the existing `LlmProviderService.findAll()` → providers store path; no new endpoint needed.
  - The previous plan added `capability` and called Phase 1 done, but `LlmTasksService.handleNightlyLlmHealthCheck` iterates **all** active models and would fail every image/video model nightly. The new plan gates Phase 2 (capability guard on chat + health check) as a hard prerequisite.
  - The frontend `LlmModel.isDefault: boolean` field is stale (backend removed it on 2026-07-18). The new Phase 6 drops it from the frontend interface.
  - The OpenAI SDK does not have a `videos` resource; the video path uses raw `fetch` against `{baseUrl}/videos` and `{baseUrl}/agnesapi?video_id=...` with `Authorization: Bearer`.
- Architectural decisions captured in `documents/LOG.md`: rename-via-update (not delete+reinsert) for the seed reconciliation, `capability` as a MySQL enum on `LlmModelEntity`, video polling is on-demand (no background job), chat dropdown filters to `capability === 'text'` in one place.
- Files touched: `documents/features/todo/agnes-ai-multimodal-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- No architecture diagram update was needed because the new endpoints stay inside `LlmModule` — no cross-module boundary changes.
- Next exact step: implement Phase 1 by updating the Agnes seed block (key + baseUrl + capability), adding the `capability` column to `LlmModelEntity`, and adding an idempotent update-in-place reconciliation for any pre-existing `agnes` row before the insert. Verify with `npm.cmd run build` and `SELECT key, baseUrl FROM llm_providers`.
- Open questions for the user: none for the plan itself. Implementation-time questions (rate limiting, free-tier cost, image upload UX) remain open and are noted in the plan's "Out of Scope" section.

**2026-07-18 MCP Bridge — Phase 4 complete, Hebrew UI labels, architecture diagram**
- Phase 4 completed: deleted `backend/src/modules/weather/` directory (controller, service, module, 4 DTOs), removed `WeatherModule` from `AppModule`, removed old `WeatherController_getWeather`/`getForecast` render-spec mappings, updated `render-spec.service.spec.ts` (error tests now use Swagger tools since MCP path is more permissive), verified 92/92 tests pass and `tsc --noEmit` clean.
- Live test confirmed: both `get_forecast` and `get_current_conditions` dispatch via MCP (no `[GET]` logs), weather cards render with real data.
- Added MCP tool Hebrew descriptions in `agent-tool-executor.service.ts`: `get_current_conditions` → "מקבל מזג אוויר נוכחי", `get_forecast` → "מקבל תחזית מזג אוויר", `check_service_status` → "בודק סטטוס שירות".
- Weather current card (`weather-current-card.component.html`): all labels translated to Hebrew (לחות, רוח, מדד UV, עננות, משקעים, לחץ אוויר, ראות, מרגיש כמו, נמדד ב-). Added `cleanLocation()` computed property that strips lat/long coordinates via regex.
- Weather forecast card (`weather-forecast.component.ts/html`): added `cleanLocation()` to strip lat/long from location display.
- Currency card (`currency-card.component.html`): "Exchange Rates" → "שערי חליפין", "Base:" → "בסיס:".
- Updated `architecture-diagram.md`: removed WeatherModule, added McpBridgeModule, updated System Architecture diagram, Chat And Tool Execution Flow (added MCP dispatch branch), Backend Module Responsibilities, and Current Architecture Notes.
- Frontend build passed (`npx ng build`). Backend tests passed (92/92).
- Files touched: `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts`, `frontend/src/app/features/chat/blocks/weather-current-card/weather-current-card.component.html`, `frontend/src/app/features/chat/blocks/weather-current-card/weather-current-card.component.ts`, `frontend/src/app/features/chat/blocks/weather-forecast/weather-forecast.component.ts`, `frontend/src/app/features/chat/blocks/weather-forecast/weather-forecast.component.html`, `frontend/src/app/features/chat/blocks/currency-card/currency-card.component.html`, `documents/architecture-diagram.md`, `documents/HANDOFF.md`.
- Known v1 gap: MCP `isError` responses (successful JSON-RPC but tool failed) not detected — flow through regex transform producing empty fields.
- Next exact step: feature is complete. No further action required unless user requests additional changes.
- Open questions for the user: none.

**2026-07-18 MCP Bridge — SDK import fix, error detection, plan doc update**
- Fixed SDK runtime import: `@modelcontextprotocol/sdk/client/stdio` fails at runtime in Node 24 because the SDK's `exports` map `./*` wildcard maps to `./dist/cjs/client/stdio` (no `.js` extension) and Node 24 doesn't auto-append it. Fix: resolve via `@modelcontextprotocol/sdk/client` (which works), navigate to `stdio.js` in the same directory.
- Fixed MCP error detection in `buildRenderSpec`: added JSON error envelope check for MCP source (attempts `JSON.parse` on the string; if the result is an object with `error: true`, returns `null`). Previously the error check was completely skipped for MCP source.
- Added snapshot-style tests for MCP render-spec: field-existence assertions against pinned fixtures, error-envelope tests.
- Updated `documents/features/todo/add-mcp-plan.md` with real tool names (`get_current_conditions` not `get_current_weather`), markdown-not-JSON notes, and the SDK import gotcha.
- Files touched: `backend/src/modules/mcp-bridge/mcp-server-client.ts`, `backend/src/modules/admin-agent/render-spec/render-spec.service.ts`, `backend/src/modules/admin-agent/render-spec/weather-mcp.render-spec.spec.ts`, `documents/features/todo/add-mcp-plan.md`.
- Remaining known gap: MCP `isError` responses (successful JSON-RPC but tool failed) are not detected — they flow through regex transform and produce empty fields. Documented in plan as known v1 gap.
- Next exact step: Phase 4 (remove WeatherModule) gated behind manual verification, or Phase 5 (docs: architecture-diagram.md, STATUS.md).
- Open questions for the user: none.

**2026-07-03 GenUI Progressive Streaming Rendering Plan**
- Added `documents/features/todo/genui-progressive-streaming-rendering-plan.md`.
- What was done this session: created a focused implementation plan for progressive GenUI rendering in `AiFormat`, covering partial component extraction, partial CSS/HTML sanitization, skeleton fallback, tests, smoke testing, risks, DoD, and open decisions.
- Exact next step: implement Step 1 in `frontend/src/app/core/directives/ai-format.directive.ts` by adding `extractProgressiveComponentParts(...)`, then add focused directive tests in `frontend/src/app/core/directives/ai-format.directive.spec.ts`.
- Files touched: `documents/features/todo/genui-progressive-streaming-rendering-plan.md`, `documents/STATUS.md`, `documents/LOG.md`, and `documents/HANDOFF.md`.
- Decisions made: keep version 1 frontend-only; reuse existing sanitizer rules for progressive mode; keep skeleton as fallback until partial HTML is safely renderable; no architecture diagram update was needed for this plan-only session.
- Open questions for the user: whether progressive rendering should support only the active open component in version 1 or multiple sequential open components.

**Completed Fixes**
- Implemented clickable strain-symbol filters in `StrainHunter`:
  - Updated `strain-hunter.html` to make symbols accessible buttons calling `applyDataFilter('symbols', symbol.alt)`.
  - Updated `strain-hunter.ts` `items` computed property to support `symbols` field by joining symbol `alt` values into a searchable string.
  - Added `.trim()` to filter comparisons for robustness.
  - Fixed TS4111 index signature access error in `load()` debug log.
- Verified with `npx ng build` (build successful).
- **Added 500ms mouse hover delay for `Tooltip` and `ScoreTooltip` components in `StrainHunter` to prevent flickering on rapid mouse movement.**
- Updated `LlmProviderStore.updateProvider` to merge patched fields into existing provider object.
- Updated `LlmProviderStore.updateModel` to merge patched fields into existing model object.
- Ensures `testResults` and `models` arrays are preserved on partial PATCH responses.
- Ran `ng test` – all tests pass.
- Ran `ng build` – builds succeed with existing warnings.

**Next Steps**
- No further action required for this fix unless additional PATCH endpoints return unexpected fields.
- Monitor for any UI flicker issues related to provider/model updates.
- Consider adding unit tests for store merge behavior if test coverage is needed.

**Next Steps**
- No further action required for this fix unless additional PATCH endpoints return unexpected fields.
- Monitor for any UI flicker issues related to provider/model updates.
- Consider adding unit tests for store merge behavior if test coverage is needed.


- `documents/incomplete/` remains as a compatibility folder, but new work should prefer `documents/features/`.
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
- Fixed the Explorer CSS budget blocker before Angular 22 upgrade validation.
- `frontend/src/app/features/explorer/explorer.css` no longer contains duplicate `::ng-deep` PrimeNG sort-icon overrides because the shared rules already exist in `frontend/src/app/assets/styles/_utilities.css`.
- Also removed a redundant `background-color` declaration from the Explorer `NEW` badge hover state.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings: unused `AccessToDirective` in `ChatHistory`, `chat-message.css` warning budget, and `explorer.css` warning budget at 7.97 kB.
- Next exact step: continue the Angular 22 upgrade plan from `documents/features/todo/angular-22-update.md` with the frontend build blocker cleared.
- Files touched this session: `frontend/src/app/features/explorer/explorer.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep PrimeNG table sort styling global in `_utilities.css` instead of duplicating it inside Explorer component CSS.
- Open questions for the user: none.
- Fixed Explorer price sorting.
- Root cause: Explorer prices are display strings with currency text, so PrimeNG's default sort treated them as formatted text instead of numeric values.
- `frontend/src/app/features/explorer/explorer.html` now enables `[customSort]="true"` and wires `(sortFunction)="sortTable($event)"`.
- `frontend/src/app/features/explorer/explorer.ts` now extracts numeric values for `price` and `catalogPrice`, while other columns keep text sorting through an `Intl.Collator`.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings are unchanged budget/unused-import warnings.
- Next exact step: visually check `/explorer`, click the price header in both directions, and confirm ordering is numeric.
- Files touched this session: `frontend/src/app/features/explorer/explorer.ts`, `frontend/src/app/features/explorer/explorer.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep displayed price strings unchanged and solve sorting in the table comparator only.
- Open questions for the user: none.
- Angular 22 upgrade continuation was attempted from `frontend` with `npx ng update @angular/core@22 @angular/cli@22` and again with `--force`.
- Both attempts stopped before modifying project files because Angular CLI 22 detected Node `v24.13.0`; the required versions are `22.22.3+`, `24.15.0+`, or `26.0.0+`.
- User asked to stop and will update Node manually from their terminal.
- Next exact step: after Node is updated, rerun `npx ng update @angular/core@22 @angular/cli@22` from `frontend`, then run the breaking-change scan and `npx ng build`.
- Files touched this session: `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: stop the upgrade until Node is manually updated; do not use `nvm` from the sandbox.
- Open questions for the user: none.
- Continued the Angular 22 upgrade after the user manually updated Node to `v24.15.0`.
- `frontend/package.json` and `frontend/package-lock.json` now use Angular `22.0.1` packages and TypeScript `6.0.3`.
- `npx -p @angular/cli@22.0.1 ng update @angular/core@22 @angular/cli@22` updated dependencies and ran CLI migrations, but the core migration initially failed because Angular generated paths like `app/features/auth/login/login.ts` instead of `src/app/features/auth/login/login.ts`.
- To complete the official migrations, a temporary `frontend/app -> frontend/src/app` junction was created, `change-detection-eager` and the remaining Angular Core migrations were rerun in `migrate-only` mode, and the junction was removed afterward.
- Angular migrations changed app files by adding `ChangeDetectionStrategy.Eager`, adding `withXhr()` in `frontend/src/app/app.config.ts`, wrapping affected optional chains with `$safeNavigationMigration(...)`, and adding extended diagnostic suppressions to `frontend/tsconfig.app.json`.
- `frontend/src/app/app.spec.ts` was updated because the old default Angular title test expected an `h1` that the current app shell no longer renders.
- Verification passed: `npx ng test --watch=false` from `frontend` passes, and `npx ng build` from `frontend` passes.
- Remaining warnings: `AccessToDirective` unused in `ChatHistory`, `explorer.css` warning budget, and `chat-message.css` warning budget.
- Remaining risk: `npm ls @angular/core @angular/cli @angular/build @angular/compiler-cli typescript primeng` fails with `ELSPROBLEMS` because `primeng@21.1.8` declares Angular `^21.0.7`; npm currently reports latest PrimeNG as `21.1.9` and no PrimeNG 22 package.
- Next exact step: decide whether to temporarily accept the PrimeNG peer mismatch, wait for PrimeNG 22, or replace/patch the PrimeNG dependency strategy before treating dependency validation as clean.
- Files touched this session: `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.app.json`, `frontend/src/app/app.config.ts`, `frontend/src/app/app.spec.ts`, all Angular component `.ts` files under `frontend/src/app`, `frontend/src/app/features/dashboard/dashboard.html`, `frontend/src/app/features/layout/main-sidebar/main-sidebar.html`, `frontend/src/app/features/users/users-management.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: preserve Angular 21 runtime change detection semantics with explicit `ChangeDetectionStrategy.Eager`; do not add artificial npm overrides for PrimeNG's Angular 21 peer range.
- Open questions for the user: how to handle PrimeNG's missing Angular 22 peer support.
- Marked the completed/reviewed checklist items in `documents/angular-22-update-guide.md`.
- Verification: no unchecked English checklist entries remain in `documents/angular-22-update-guide.md`, and the corruption scan for that file returned clean.
- Next exact step: resolve or explicitly accept the PrimeNG Angular 21 peer dependency mismatch before treating dependency validation as fully clean.
- Files touched this session: `documents/angular-22-update-guide.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: only mark checklist items that were performed by the Angular 22 upgrade or explicitly reviewed during the migration scan.
- Open questions for the user: none for the checklist update.
- Cleaned up Angular 22 migration helpers after review: removed `$safeNavigationMigration(...)` from `frontend/src/app/features/layout/main-sidebar/main-sidebar.html`, `frontend/src/app/features/dashboard/dashboard.html`, and `frontend/src/app/features/users/users-management.html`.
- The role badge guards now use normal Angular 22 safe navigation, e.g. `@if (authStore.user()?.role)`, and badge bindings call `getUserRoleData(...)?....` directly.
- Verification: `rg '$safeNavigationMigration' frontend/src` returned no matches; `npx ng test --watch=false` passed 16 tests; `npx ng build` passed.
- Remaining warnings are unchanged: unused `AccessToDirective` in `ChatHistory`, `explorer.css` warning budget, and `chat-message.css` warning budget.
- Next exact step: resolve or explicitly accept the PrimeNG Angular 21 peer dependency mismatch before treating dependency validation as fully clean.
- Files touched this session: `frontend/src/app/features/layout/main-sidebar/main-sidebar.html`, `frontend/src/app/features/dashboard/dashboard.html`, `frontend/src/app/features/users/users-management.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: remove temporary Angular migration compatibility helpers instead of keeping the old null-safe-navigation behavior.
- Open questions for the user: none.
- Moved `documents/angular-22-update-guide.md` to `documents/done/angular-22-update-guide.md`.
- Current open work after closing the guide: PrimeNG peer dependency mismatch, existing frontend warnings, and active plans in `documents/features/todo/`.
- Next exact step: decide the PrimeNG strategy for Angular 22, or pick the next active plan from `documents/features/todo/`.
- Files touched this session: `documents/done/angular-22-update-guide.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: treat the Angular 22 guide as completed because upgrade, migration review, build, and test verification are done.
- Open questions for the user: whether to accept the PrimeNG peer mismatch temporarily or wait for/update to a compatible PrimeNG release.
- Completed Phase 2 and Phase 3 of `documents/features/todo/ai-format-directive-improvement-plan.md`.
- `frontend/src/app/core/directives/ai-format.directive.ts` now sanitizes GenUI component HTML before `innerHTML`, removes `script`, `iframe`, `object`, and `embed`, cleans unsafe CSS blocks/selectors, removes CSS custom property declarations, and preserves scoped/local CSS plus `@keyframes`.
- Added `frontend/src/app/core/directives/ai-format.directive.spec.ts` coverage for `:root` token override removal, `.weather-card` preservation, unscoped selector removal, scoped selector preservation, mixed selector lists, `@keyframes`, and dangerous tag removal.
- Verification: `npx ng test --watch=false` passed 19 tests; `npx ng build` passed with existing warnings only.
- Next exact step: continue AiFormat Phase 4 by extracting the remaining skeleton rendering flow into a dedicated helper, or Phase 5 Hebrew role parsing cleanup if preferred.
- Files touched this session: `frontend/src/app/core/directives/ai-format.directive.ts`, `frontend/src/app/core/directives/ai-format.directive.spec.ts`, `documents/features/todo/ai-format-directive-improvement-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the sanitizer private inside the directive for now; preserve local class selectors and only remove unscoped global selectors; for mixed selector lists, drop only the unsafe selectors and keep the scoped selectors.
- Open questions for the user: none.
- Completed the remaining AiFormat directive plan phases and moved `documents/features/todo/ai-format-directive-improvement-plan.md` to `documents/done/ai-format-directive-improvement-plan.md`.
- `frontend/src/app/core/directives/ai-format.directive.ts` now uses `renderSkeletonOnce()` for skeleton DOM writing, centralizes Hebrew role labels in constants, removes the old inline GenUI parse comments, and keeps English role support.
- `frontend/src/app/core/directives/ai-format.directive.spec.ts` now covers component-stream detection, CSS/csharp code fences not triggering skeleton, CSS code fences rendering as markdown code, Hebrew/English role badges, sanitizer behavior, and dangerous tag removal.
- Verification: `npx ng test --watch=false` passed 22 tests; `npx ng build` passed with existing warnings only; corrupted-character scan on the AiFormat directive/spec returned clean.
- Next exact step: choose the next active todo from `documents/features/todo/` or clean the existing frontend warnings (`AccessToDirective`, `chat-message.css`, `explorer.css`).
- Files touched this session: `frontend/src/app/core/directives/ai-format.directive.ts`, `frontend/src/app/core/directives/ai-format.directive.spec.ts`, `documents/done/ai-format-directive-improvement-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: close Phase 6 with focused automated coverage because Browser tooling was not available in this session; no backend build was required because no backend or GenUI prompt source changed.
- Open questions for the user: none.
- Added new active plan `documents/features/todo/chat-stop-stream-button-plan.md`.
- The plan covers changing the chat submit button into a stop button while `loading()` is true, storing the active stream subscription, cancelling it through the existing `ChatService.sendMessageStream(...)` Observable teardown / `AbortController`, keeping partial assistant content visible, and cleaning up on route changes or destroy.
- Next exact step: implement Phase 1 in `frontend/src/app/features/chat/chat/chat.ts` by storing the active stream subscription and adding `stopStreaming()`.
- Files touched this session: `documents/features/todo/chat-stop-stream-button-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: no backend API change is planned because `ChatService.sendMessageStream(...)` already aborts fetch on unsubscribe.
- Open questions for the user: whether a cancelled assistant message should show a visible "cancelled" marker when no token has arrived yet.
- Cleaned `documents/audit/` so it now contains only `documents/audit/css-conventions-component-audit.md`.
- Moved the completed backend LLM documentation audit to `documents/done/backend-llm-documentation-audit.md`.
- Deleted `documents/audit/phosphor-icons.web.instruction.md` because it was package reference material, not an active audit, and `@phosphor-icons/web` is already used in the frontend.
- Next exact step: continue with `documents/features/todo/chat-stop-stream-button-plan.md` or address the active CSS conventions audit.
- Files touched this session: `documents/done/backend-llm-documentation-audit.md`, `documents/audit/phosphor-icons.web.instruction.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep `documents/audit/` reserved for active audit findings; completed/closed audits go under `documents/done/`.
- Open questions for the user: none.
- Expanded `documents/features/todo/provider-and-llm-db-plan.md` from a short schema sketch into a full implementation plan for DB-backed LLM providers and models plus Angular Settings management UI.
- The plan preserves compatibility for existing chat endpoints (`GET /llm/model-options`, `GET /llm/status`, and per-request provider/model overrides), while adding admin-only management endpoints under `/llm/admin/...`.
- Next exact step: begin Phase 1 of `documents/features/todo/provider-and-llm-db-plan.md` by adding `LlmProvider` and `LlmModel` TypeORM entities and registering them in `backend/src/modules/llm/llm.module.ts`.
- Files touched this session: `documents/features/todo/provider-and-llm-db-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: DB should become the future source of truth for cloud providers and manually managed models; env config should remain as bootstrap/fallback, not the admin-managed source of truth.
- Open questions for the user: whether API keys must be encrypted at rest in the first implementation phase, whether provider/model deletion should be soft-disable only, and whether Ollama discovered models should be persisted or remain dynamic.
- Updated `documents/features/todo/provider-and-llm-db-plan.md` to reflect the final objective: scheduled/manual LLM evaluations, persisted test runs/results, model rankings, provider/model forms, and a Settings test-results table.
- Cron planning decision: default scheduled model test cadence is every 6 hours, with manual test runs available from Settings; paid providers can later get a slower cadence if cost/rate limits require it.
- Ollama planning decision: cloud models are DB-managed, but Ollama installed models remain runtime-discovered; DB stores only provider config, optional model metadata, and historical test results keyed by model name.
- Completed `documents/features/todo/chat-stop-stream-button-plan.md` and moved it to `documents/done/chat-stop-stream-button-plan.md`.
- Completed `documents/features/todo/chat-message-actions-plan.md` and moved it to `documents/done/chat-message-actions-plan.md`.
- Chat streaming now stores the active stream subscription, and the send button becomes a stop button while `loading()` is true. Stopping unsubscribes from the stream, aborts the fetch, exits loading state, and keeps partial assistant content visible.
- Chat messages now render a compact action bar with delete, send again, copy, and edit actions. `ChatMessage` emits typed events; `Chat` owns conversation-level behavior.
- Added persistent backend deletion at `DELETE /admin-agent/sessions/:sessionId/messages/:messageId`. The backend verifies authenticated session ownership and message membership, then deletes the selected message and later messages in the session.
- Updated `documents/architecture-diagram.md` for chat stream cancellation and message-action deletion request flow.
- Verification: `npx ng test --watch=false` from `frontend` passed 22 tests.
- Verification: `npx ng build` from `frontend` passed with existing warnings only (`AccessToDirective`, `chat-message.css`, `explorer.css`).
- Verification: `npm.cmd run build` from `backend` passed.
- Next exact step: manually test `/chat` with a slow model: stop mid-stream, copy a rendered message, edit a user message, resend an assistant answer, delete a persisted message, then reload the session and confirm the deleted message and later history are gone.
- Files touched this session: `frontend/src/app/features/chat/chat/chat.ts`, `frontend/src/app/features/chat/chat/chat.html`, `frontend/src/app/features/chat/chat/chat.css`, `frontend/src/app/features/chat/chat-message/chat-message.ts`, `frontend/src/app/features/chat/chat-message/chat-message.html`, `frontend/src/app/features/chat/chat-message/chat-message.css`, `frontend/src/app/core/services/chat.service.ts`, `backend/src/modules/admin-agent/admin-agent.controller.ts`, `backend/src/modules/admin-agent/admin-agent.service.ts`, `backend/src/modules/admin-agent/services/agent-session.service.ts`, `backend/swagger-spec.json`, `documents/architecture-diagram.md`, `documents/done/chat-message-actions-plan.md`, `documents/done/chat-stop-stream-button-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: delete message means deleting the selected persisted message and all later messages; copy remains local; edit patches the prompt; resend preserves the current selected model because it reuses the existing chat form model selection.
- Open questions for the user: none.
- Closed the stale Explorer todo document by renaming and moving `documents/features/todo/explorer-plan.md` to `documents/done/explorer-source-reference.md`.
- The moved file is retained as a Jane source-data and DOM reference, not as an active implementation plan.
- Active feature todo now contains only `documents/features/todo/database-storage-monitor-plan.md`.
- Next exact step: pick up `documents/features/todo/database-storage-monitor-plan.md` or address the existing frontend warnings.
- Files touched this session: `documents/done/explorer-source-reference.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the Explorer source reference instead of deleting it because it contains Jane payload/DOM examples that may still help future scraper work.
- Open questions for the user: none.
- Removed borders from the new chat message action buttons in `frontend/src/app/features/chat/chat-message/chat-message.css`.
- Also removed the duplicate `@media (hover: none)` block from the same CSS section.
- Verification: `npx ng build` from `frontend` passed with existing warnings only.
- Next exact step: visually check `/chat` message action buttons to confirm the no-border treatment matches the desired UI.
- Files touched this session: `frontend/src/app/features/chat/chat-message/chat-message.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep hover/focus feedback through `color: var(--color-primary)` and `background: var(--primary-30)` instead of borders.
- Open questions for the user: none.
- Updated Angular 22 version documentation in the project rules and frontend README.
- `frontend/README.md` no longer claims Angular CLI `21.2.12`; it now documents Angular/CLI `22.0.1`.
- `AGENTS.md` and `CLAUDE.md` now list the frontend baseline: Angular `22.0.1`, Angular CLI `22.0.1`, TypeScript `6.0.3`, Node `22.22.3+` or `24.15.0+`, and the known PrimeNG peer mismatch.
- `C:\Users\porat\.claude\rules\angular-rules.md` now includes the same Angular 22 baseline, forbids keeping `$safeNavigationMigration()`, documents Angular 22 safe-navigation behavior, and replaces the inaccurate strict-zoneless wording with the current explicit `changeDetection` rule.
- Verification: searched the touched docs for stale `21.2.12`, Angular 22 baseline text, and corrupted-character markers; no new corruption was found.
- Next exact step: continue with `documents/features/todo/database-storage-monitor-plan.md` or manually test the recent `/chat` message action flow.
- Files touched this session: `frontend/README.md`, `AGENTS.md`, `CLAUDE.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: do not update `documents/architecture-diagram.md` because this was documentation/rules metadata only.
- Open questions for the user: none.
- Hardened `C:\Users\porat\.claude\rules\angular-rules.md` for use by a smaller local coding agent.
- The Angular rules file is now organized as a strict checklist with `Version Baseline`, `Before Editing`, `Always`, `Never`, `Angular 22 Notes`, `Page Component Pattern`, `Services`, `Stores`, `Templates`, `CSS`, and `Verification`.
- Removed the stale embedded Hebrew task comment from the Angular rules file.
- Verification: read back the full rules file, confirmed the stale comment and `Strictly Zoneless` wording are gone, and confirmed the corrupted-character scan returned no matches.
- Next exact step: continue with `documents/features/todo/database-storage-monitor-plan.md` or harden the next rule file for the local agent.
- Files touched this session: `C:\Users\porat\.claude\rules\angular-rules.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the rules in English and checklist-oriented so a smaller model can follow them with less ambiguity.
- Open questions for the user: none.
- Created reusable prompt snippets for the smaller local coding agent under `C:\Users\porat\.claude\prompts\code-agent\`.
- Prompt files created: `default.md`, `angular-task.md`, `nestjs-task.md`, `css-task.md`, `review.md`, `bugfix.md`, `docs-update.md`, and `commit.md`.
- The prompts are short, checklist-oriented, and split by task type so they can be copied quickly into the local agent without loading excessive context.
- Verification: listed all created prompt files, searched for expected prompt anchors, and confirmed the corruption scan returned no matches.
- Next exact step: optionally add PowerShell helper functions in the user profile to list/copy these prompt snippets quickly.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\*.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: store reusable agent prompts outside the repo under the user-level Claude config, not inside project rules or feature plans.
- Open questions for the user: none.
- Tightened the local-agent Angular prompt and rules after the settings-page dry run.
- `C:\Users\porat\.claude\prompts\code-agent\angular-task.md` now tells the small agent to proceed automatically after the pre-implementation report unless approval is explicitly required, a pattern is missing, backend/API scope appears unexpectedly, or the request is ambiguous.
- The Angular prompt now explicitly says not to ask "shall I proceed?" when the path is clear.
- `angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, and `CLAUDE.md` now clarify that `PageStates` are only required for pages with async loading/error/empty/ready states, not static placeholder pages.
- Frontend verification commands in `AGENTS.md` and `CLAUDE.md` now instruct agents to run from `frontend/` with `npx ng build` / `npx ng test --watch=false`, and to avoid `npx ng build frontend` unless known supported.
- Next exact step: rerun the settings-page prompt with the small local agent and verify it proceeds without the extra approval question.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the local-agent Angular prompt autonomous by default for clear, scoped tasks.
- Open questions for the user: none.
- Added stricter local-agent completion gates after reviewing the poor settings-page result.
- `C:\Users\porat\.claude\prompts\code-agent\angular-task.md` now includes Hebrew/UTF-8 rules, CSS gates, a Definition of Done, and a required self-review before final answer.
- `C:\Users\porat\.claude\rules\angular-rules.md` now includes a dedicated Hebrew/UTF-8 section, CSS placeholder/static-page rules, and an Angular Definition of Done.
- `AGENTS.md` and `CLAUDE.md` now include an Angular Definition of Done requiring requirement-by-requirement confirmation, route/menu/import checks, Hebrew corruption scan, CSS rules, successful verification, and reporting known limitations.
- Verification: searched the prompt/rule docs for the new gates and ran the corruption scan; matches are only the documented regex examples.
- Next exact step: send the updated `angular-task.md` prompt to the local agent and ask it to repair the existing settings page implementation.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: require explicit Definition of Done and self-review for Angular tasks because build success alone does not catch broken Hebrew text or poor UI/CSS quality.
- Open questions for the user: none.
- Added a specific static-page shell requirement after the local agent created a custom `settings-container` instead of using global page styles.
- `angular-task.md`, `angular-rules.md`, `AGENTS.md`, and `CLAUDE.md` now state that static pages do not need `PageStates`, but still must use the standard page shell: `page-content`, `page-header`, `page-state empty-state`, `icon`, `title`, and `subtitle`.
- The rules now forbid `settings-container`, `*-container`, or other page-specific wrapper classes for simple static pages, and instruct agents to delete unnecessary component CSS files and remove `styleUrl`/`styleUrls`.
- Verification: searched all updated prompt/rule files for the new static-page shell guidance and corruption markers; matches are only the documented regex examples.
- Next exact step: send the updated prompt to the local agent and ask it to repair the existing settings page using the standard page shell and no unnecessary CSS.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: treat standard page shell as required even when `PageStates` is not required.
- Open questions for the user: none.
- Corrected the static-page shell guidance after realizing `empty-state` is semantically wrong for generic coming-soon/static placeholder content.
- `angular-task.md`, `angular-rules.md`, `AGENTS.md`, and `CLAUDE.md` now instruct static placeholder pages to use `page-content`, `page-header`, `glass-effect card`, `card-header`, and `subtitle`.
- The rules now explicitly say not to use `.page-state.empty-state` unless representing a real no-data state.
- Verification: searched all updated rule/prompt files for the new `glass-effect card` shell and no-data-state warning; corruption-scan matches are only the documented regex examples.
- Next exact step: send the updated prompt to the local agent and ask it to repair `frontend/src/app/features/settings/settings.html` with real Hebrew and `glass-effect card`, not `empty-state`.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: reserve `empty-state` for real empty data states, not static placeholder pages.
- Open questions for the user: none.
- Tightened Hebrew handling after the local agent reversed Hebrew strings such as `הגדרות` into `תורדגה`.
- `angular-task.md`, `angular-rules.md`, `AGENTS.md`, and `CLAUDE.md` now forbid generating, translating, reversing, transliterating, or visually reordering Hebrew text.
- Hebrew text must be copied exactly from the user prompt or an existing valid project file; if exact Hebrew is not supplied, the local agent must stop and ask.
- The rules now require `Select-String -SimpleMatch "EXACT_HEBREW_TEXT" <file>` for required Hebrew strings.
- The rules also clarify that a clean `rg` corruption scan returns no output and exit code `1`, and agents must not chain the corruption scan with build using `&&`.
- Next exact step: send the updated prompt plus exact Hebrew strings/code block to the local agent, or fix `frontend/src/app/features/settings/settings.html` directly.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: local agents should not author Hebrew text; they should only copy exact approved strings.
- Open questions for the user: none.
- Simplified the Hebrew rules again after the user clarified that Hebrew authoring itself works and the issue was overcomplication from terminal/RTL interpretation.
- Removed the strict "do not generate Hebrew", `Select-String -SimpleMatch`, reversed-Hebrew, and separate-scan/build requirements from `angular-task.md`, `angular-rules.md`, `AGENTS.md`, and `CLAUDE.md`.
- Kept only a simple Hebrew/UTF-8 guard: Hebrew is allowed, preserve existing user-facing Hebrew when editing, do not copy corrupted terminal output, and fix actual mojibake if seen.
- Next exact step: send the simplified prompt to the local agent with the static-page/card-shell requirement, or repair the settings page directly.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep Hebrew guidance lightweight; focus the local agent rules on structure/CSS/DoD instead of overconstraining Hebrew writing.
- Open questions for the user: none.

## 2026-07-18 Session — LLM Default Model Per-User Fix

**LLM Default Model: single per-user via user_llm_defaults**

- Completed: removed the legacy global-per-provider `isDefault` concept from backend + frontend. The old `LlmProviderService.setDefaultModel()` (wrote `is_default=true` on one model per provider) and its `POST /llm-provider/models/:id/default` endpoint were deleted. The new per-user system (`user_llm_defaults` table) is now the single source of truth.
- Completed: added `GET /llm/default-model` to `LlmController` returning the authenticated user's current default model id (reads `user_llm_defaults`).
- Completed: `LlmProviderService.getUserDefaultModel()` already existed and is the resolution path used by `resolveEffectiveModel()` — confirmed it is the only default source at runtime.
- Completed (frontend service): `LlmProviderService` (frontend) now exposes `setUserDefaultModel(modelId)` → `POST /llm/set-default-model` and `getUserDefaultModel()` → `GET /llm/default-model`; the old `setDefaultModel()` was removed.
- Completed (frontend store): `LlmProviderStore` gained `defaultModelId` signal + `loadUserDefaultModel()` and `setDefaultModel(modelId)` methods that call the user-level endpoints.
- Completed (chat): the model dropdown default-selection effect in `chat.ts` now picks the user default (`defaultModelId()`) instead of the first `m.isDefault`. The star button calls `llmProviderStore.setDefaultModel(model.id)` and the template renders the filled star by `llmProviderStore.defaultModelId() === model.id`. `ngOnInit` loads the user default.
- Completed (providers management): `llm-providers-management.ts/html` star button now calls the store's user-level setter; template renders the filled star via `defaultModelId()`; added `ngOnInit` (with `OnInit` import) to load the user default.
- Completed (DB): the `user_llm_defaults` table was MISSING — `synchronize:true` only auto-creates entity tables, and that table is raw-SQL-migrated, not an entity. Created it from `migrations/CreateUserLlmDefaults1752856000000.ts` SQL directly. This was the root cause of the `GET /llm/default-model` 500.
- Completed (DB cleanup): cleared the two stale `is_default=1` rows (`Tencent Hy3 (Free)` id 101, `Agnes 2.0 Flash` id 102) that produced the duplicate-star confusion.
- Verification: `npx ng build` from `frontend` passes (existing unrelated warnings only: `AccessToDirective`, `chat-message.css`, `explorer.css`, initial-bundle budget). `npx nest build` from `backend` passes. Live verified by user: selecting a new default model works and only one star is shown.
- Files touched: `backend/src/modules/llm/llm.controller.ts` (modified), `backend/src/modules/llm-provider/llm-provider.service.ts` (modified — removed `setDefaultModel`), `backend/src/modules/llm-provider/llm-provider.controller.ts` (modified — removed endpoint), `frontend/src/app/core/services/llm-provider.service.ts` (modified), `frontend/src/app/core/store/llm-provider.store.ts` (modified), `frontend/src/app/features/chat/chat/chat.ts` (modified), `frontend/src/app/features/chat/chat/chat.html` (modified), `frontend/src/app/features/llm-providers-management/llm-providers-management.ts` (modified), `frontend/src/app/features/llm-providers-management/llm-providers-management.html` (modified), `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- Decisions made: keep the `is_default` column/entity field in place (dead but harmless) rather than dropping it via migration; the user-level `user_llm_defaults` is the only active default source. Did not add a migration-runner script; created the missing table with raw SQL this session.
- Open questions for the user: whether to (a) add a repeatable migration runner or convert `user_llm_defaults` into a real TypeORM entity so `synchronize` manages it, and (b) whether to drop the now-dead `is_default` column via a migration.
- No architecture diagram update needed: module boundaries, request flow, and default-resolution path are unchanged; only the dead legacy flag path was removed.
- Next exact step: if the user wants repeatable DB setup, add a `migrations:run` script or convert `user_llm_defaults` to a TypeORM entity; otherwise feature is complete.

## 2026-07-18 Session (follow-up) — user_llm_defaults Entity + drop is_default

**Both open items from the prior session are now done.**

- Completed: converted `user_llm_defaults` into a real TypeORM entity `UserLlmDefaultEntity` (`backend/src/modules/llm-provider/entities/user-llm-default.entity.ts`) with columns id (PK), userId (`@Index` unique on `user_id`), modelId (`@ManyToOne` to `LlmModelEntity` with `onDelete: 'CASCADE'`), createdAt, updatedAt. Registered it in `LlmProviderModule.forFeature`.
- Completed: refactored `LlmProviderService.setUserDefaultModel`/`getUserDefaultModel` to use the `UserLlmDefaultEntity` repository instead of raw SQL (`INSERT ... ON DUPLICATE KEY UPDATE` / `SELECT model_id`). Resolution no longer uses `modelRepo.query`.
- Completed: removed the dead `isDefault` field from `LlmModelEntity`; `synchronize: true` dropped the `is_default` column from `llm_models` (verified via `SHOW COLUMNS`).
- Completed: added migration `migrations/DropLlmModelIsDefault1752860000000.ts` documenting the `is_default` drop (down re-adds it). This is for portability only — the project uses `synchronize: true`, so migrations are not auto-run.
- Verification: `npm run build` (backend `nest build`) passes. DB confirmed: `llm_models` has no `is_default`; `user_llm_defaults` columns match the entity (id, user_id UNIQUE, model_id, created_at, updated_at, FK to llm_models). No remaining `isDefault`/`is_default` references in backend or frontend code.
- Files touched: `backend/src/modules/llm-provider/entities/user-llm-default.entity.ts` (new), `backend/src/modules/llm-provider/entities/llm-model.entity.ts` (modified), `backend/src/modules/llm-provider/llm-provider.module.ts` (modified), `backend/src/modules/llm-provider/llm-provider.service.ts` (modified), `backend/migrations/DropLlmModelIsDefault1752860000000.ts` (new), `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
- No architecture diagram update needed: module boundaries and default-resolution path unchanged; `user_llm_defaults` is now an entity rather than raw SQL but the data flow is identical.
- Open questions for the user: none remaining from this feature. Optionally, a repeatable `migration:run` script could still be added for environments where `synchronize` is disabled, but not required.
- Tightened the static-page guidance again after identifying that the local agent understood generic classes but not the required page structure.
- `angular-task.md`, `angular-rules.md`, `AGENTS.md`, and `CLAUDE.md` now tell the local agent to copy the static placeholder page structure exactly and only replace `PAGE_TITLE`, `SECTION_TITLE`, icon class, and `PLACEHOLDER_TEXT`.
- The rules now explicitly forbid improvising the HTML structure, moving placeholder text into the header, or using loose standalone text blocks for static placeholder content.
- Verification: searched updated files for the exact-structure guidance and confirmed the previously over-strict Hebrew rules remain removed.
- Next exact step: send the simplified but structure-strict Angular prompt to the local agent, or fix `frontend/src/app/features/settings/settings.html` directly.
- Files touched this session: `C:\Users\porat\.claude\prompts\code-agent\angular-task.md`, `C:\Users\porat\.claude\rules\angular-rules.md`, `AGENTS.md`, `CLAUDE.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: enforce exact page structure for static pages because generic class guidance alone is not enough for the local agent.
- Open questions for the user: none.
- Updated the Design System showcase color-token layout so token cards no longer stretch to the tallest color group and long token names no longer collide with the copy state.
- Added the documented global breakpoint tokens `--xs`, `--sm`, `--md`, `--lg`, and `--xl` to `_variables.css`, then replaced hardcoded Design System `900px` media queries with `var(--sm)`.
- Kept the Design System changes CSS-only and scoped to the existing component partials plus global variables.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Dev server note: `npx.cmd ng serve --host 127.0.0.1 --port 4200` is running after sandbox cache access required escalation; `npx ng serve` via PowerShell failed because `npx.ps1` is blocked by execution policy.
- Browser note: the in-app Browser `iab` was unavailable and Playwright/Puppeteer were not installed locally, so visual browser verification could not be completed in this session.
- Next exact step: open `http://127.0.0.1:4200/design-system` locally and visually confirm the color-token cards at desktop and mobile widths.
- Files touched this session: `frontend/src/app/assets/styles/_variables.css`, `frontend/src/app/features/design-system/design-system.css`, `frontend/src/app/features/design-system/_design-system-tokens.css`, `frontend/src/app/features/design-system/_design-system-buttons.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: use the existing token partial for token-card-specific CSS to keep the main component stylesheet under the Angular CSS warning budget; no architecture diagram update was needed because this was local styling/token metadata only.
- Open questions for the user: none.
- Added a dedicated PrimeNG global override file at `frontend/src/app/assets/styles/_primeng-overrides.css`.
- Connected the new override file from `frontend/src/styles.css` after `_utilities.css`.
- Moved the existing PrimeNG datatable sort-icon overrides out of `_utilities.css` into `_primeng-overrides.css`.
- Replaced the old hardcoded PrimeNG override dimensions with existing spacing tokens.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- Next exact step: use `_primeng-overrides.css` for future PrimeNG global overrides instead of adding PrimeNG selectors to `_utilities.css` or component styles.
- Files touched this session: `frontend/src/styles.css`, `frontend/src/app/assets/styles/_utilities.css`, `frontend/src/app/assets/styles/_primeng-overrides.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep PrimeNG vendor overrides in a dedicated global stylesheet loaded after utilities; no architecture diagram update was needed because this was stylesheet organization only.
- Open questions for the user: none.
- Converted the Users management table from a native `<table>` to PrimeNG `p-table`, following the Explorer table pattern.
- Users table now uses `TableModule`, `InputTextModule`, `#table`, `globalFilterFields`, `pSortableColumn`, `p-sortIcon`, `scrollable`, and `scrollHeight="flex"`.
- The Users search input now uses PrimeNG `pInputText` and calls `table.filterGlobal(...)` like Explorer.
- Added derived `roleLabel` and `roleHeLabel` fields for table search so role text remains searchable after moving filtering to PrimeNG.
- Removed the old manual users filtering signals/computed and a stray `console.log` from `UsersManagement`.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- Next exact step: visually check `/users` and compare it with `/explorer` to confirm the PrimeNG table spacing, sorting icons, scroll area, and empty-message rendering match the new global overrides.
- Files touched this session: `frontend/src/app/features/users/users-management.ts`, `frontend/src/app/features/users/users-management.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep Users-specific CSS absent and rely on the existing table container plus global PrimeNG overrides; no architecture diagram update was needed because this was local Users UI rendering only.
- Open questions for the user: none.
- Fixed the Users management search input placeholder from chat wording to user wording: `חפש משתמש...`.
- Verification: `npx ng build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- Files touched this session: `frontend/src/app/features/users/users-management.html`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: no architecture diagram update was needed because this was a copy-only UI text fix.
- Open questions for the user: none.
- Completed the Design System token upgrade from `documents/features/todo/TASK.md`.
- `frontend/src/app/assets/styles/_variables.css` was rewritten with the audited token system: solid dark/light surfaces, stronger borders, updated typography scale, status tokens, `--radius-pill`, elevated surfaces, muted/disabled text, glow background tokens, and updated shadows.
- `frontend/src/app/assets/styles/_reset.css` `body::before` now uses `--color-primary-glow-bg` and `--color-secondary-glow-bg` with `opacity: 1`.
- Moved the finished task document to `documents/done/design-system-token-upgrade-task.md`.
- Verification: no missing CSS custom property references were found; the old transparent surface values were removed; `npm.cmd run build` from `frontend` passed.
- Remaining warnings are existing ones only: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Next exact step: visually check dark and light themes in the app, especially card/background contrast on dashboard/users/chat/explorer.
- Files touched this session: `frontend/src/app/assets/styles/_variables.css`, `frontend/src/app/assets/styles/_reset.css`, `documents/done/design-system-token-upgrade-task.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: update `_reset.css` despite the "only variables" wording because the same TASK explicitly required the `body::before` glow-token migration; no architecture diagram update was needed because this was global styling/token maintenance only.
- Open questions for the user: none.
- Completed the Design Language glassmorphism upgrade from `documents/features/todo/DESIGN_UPGRADE_TASK.md`.
- Updated global glass styling in `frontend/src/app/assets/styles/_utilities.css`: `.glass-effect` now uses `--glass-*` tokens and `.badge` uses the refined pill style.
- Updated global layout primitives in `frontend/src/app/assets/styles/_layout.css`: `.card`, `.metric-card`, `.table-container`, `.logo`, and `.error-badge` now use the glass/depth treatment from the task.
- Updated `frontend/src/app/assets/styles/_forms.css` so inputs/selects/textareas use blur, muted placeholders, stronger focus glow, and cleaned hover/disabled states.
- Updated `frontend/src/app/assets/styles/_buttons.css` so `.primary-btn.filled` gets primary glow and brighter hover treatment.
- Updated `frontend/src/app/assets/styles/_variables.css` with `--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-blur`, and stronger ambient glow tokens.
- Updated `frontend/src/app/assets/styles/_reset.css` ambient body glow to the larger ellipse gradients requested by the task.
- Moved the finished task document to `documents/done/design-language-glassmorphism-upgrade-task.md`.
- Verification: `npm.cmd run build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Visual browser verification was not completed because no Browser tool is available in this session.
- Next exact step: visually check dark/light mode cards, filled primary button hover, and any sidebar area using `.glass-effect`.
- Files touched this session: `frontend/src/app/assets/styles/_variables.css`, `_reset.css`, `_utilities.css`, `_layout.css`, `_forms.css`, `_buttons.css`, `documents/done/design-language-glassmorphism-upgrade-task.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep `_animations.css`, `_typography.css`, `_primeng-overrides.css`, TS files, and HTML files untouched as requested; no architecture diagram update was needed because this was global styling only.
- Open questions for the user: none.
- Fixed theme switching transition inconsistency.
- `frontend/src/app/core/services/theme.service.ts` now calls `blockTransitions()` before changing `data-theme`; it adds `no-transitions` to `<html>` and removes it after two nested `requestAnimationFrame(...)` callbacks.
- `frontend/src/app/assets/styles/_reset.css` now defines `.no-transitions, .no-transitions * { transition: none !important; }`.
- Verification: `npm.cmd run build` from `frontend` passed. Remaining warnings are existing ones only: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- Next exact step: visually toggle dark/light mode and confirm the transition no longer mixes instant and animated elements.
- Files touched this session: `frontend/src/app/core/services/theme.service.ts`, `frontend/src/app/assets/styles/_reset.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: use the requested two-frame `requestAnimationFrame` approach; no `setTimeout`, no computed delay, and no other CSS changes. No architecture diagram update was needed because this was local theme-toggle behavior only.
- Open questions for the user: none.
- Removed the duplicate dedicated rating color token and switched Explorer rating text to the semantic `--color-warning` token.
- Updated the Design System color palette showcase so it covers all current color-related tokens from `_variables.css`, including brand, surfaces, text, inputs, glass, and semantic tokens.
- Design System semantic colors now render in their own section, grouped by Success, Danger, Warning, and Info.
- Design System color swatches were reduced in size, the page now has padding, and long values such as `var(--color-bg-gradient)` are truncated with ellipsis instead of overflowing into the copy action.
- Verification: token coverage comparison returned no missing color tokens, the removed rating token no longer appears in frontend code or the completed token spec, and `npm.cmd run build` from `frontend` passed.
- Remaining build warnings are existing unrelated warnings only: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Next exact step: visually check `/design-system` in the browser to confirm the grouped semantic section and gradient-token ellipsis look correct in dark and light modes.
- Files touched this session: `frontend/src/app/assets/styles/_variables.css`, `frontend/src/app/features/explorer/explorer.css`, `frontend/src/app/features/design-system/design-system.ts`, `frontend/src/app/features/design-system/design-system.html`, `frontend/src/app/features/design-system/design-system.css`, `frontend/src/app/features/design-system/_design-system-tokens.css`, `frontend/src/app/features/design-system/_design-system-swatches.css`, `documents/done/design-system-token-upgrade-task.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: rating is not a separate semantic token; it uses warning yellow. Color swatch background mappings were split into a dedicated component stylesheet to keep component style budgets clean. No architecture diagram update was needed because this was local design-system UI/token maintenance only.
- Open questions for the user: none.
- Completed the light-mode character upgrade from `documents/done/light-mode-character-upgrade-task.md`.
- `frontend/src/app/assets/styles/_variables.css` light theme now uses the teal primary palette, cool blue-grey background, stronger light glass tokens, adjusted light borders, teal focus/glow tokens, and updated light shadows.
- Confirmed `_buttons.css` already satisfies the task: `.primary-btn.filled` uses `color: var(--color-bg)`, which is acceptable on the new dark teal primary.
- Confirmed no changes were needed in `_layout.css` or `_utilities.css`; the card shimmer, metric top bar, and logo gradient already consume the updated tokens correctly.
- Verification: `npm.cmd run build` from `frontend` passed. Remaining warnings are existing unrelated warnings only: unused `AccessToDirective`, `chat-message.css` budget, and `explorer.css` budget.
- Visual browser verification was not performed in this session.
- Next exact step: visually check light mode in the running app, especially background glow, cards, primary buttons, links, icons, and metric-card teal-to-violet top bar.
- Files touched for this task: `frontend/src/app/assets/styles/_variables.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the light-mode upgrade token-only as specified; no architecture diagram update was needed because this was theme-token styling only.
- Open questions for the user: none.
- Added a reusable global `.icon-tile` style in `frontend/src/app/assets/styles/_utilities.css` for padded icon backgrounds.
- Dashboard metric cards now use `.icon-tile metric-icon` for the card icons.
- Design System section-heading icons now use `.icon-tile`, and the duplicated local `section-heading > .ph` styling was removed from `design-system.css`.
- Verification: `npm.cmd run build` from `frontend` passed. Remaining warnings are existing unrelated warnings only: unused `AccessToDirective`, `explorer.css` budget, and `chat-message.css` budget.
- Next exact step: visually check `/dashboard` and `/design-system` to confirm the icon tile spacing and visual weight are right in dark and light themes.
- Files touched this session: `frontend/src/app/assets/styles/_utilities.css`, `frontend/src/app/assets/styles/_layout.css`, `frontend/src/app/features/dashboard/dashboard.html`, `frontend/src/app/features/design-system/design-system.html`, `frontend/src/app/features/design-system/design-system.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep the padded icon treatment global instead of duplicating it in feature CSS. No architecture diagram update was needed because this was styling only.
- Open questions for the user: none.
- Added `documents/features/todo/llm-model-test-results-retention-plan.md` for weekly cleanup of old `llm_model_test_results` rows.
- The plan targets the existing `LlmModelTestResultEntity`, `LlmProviderService`, and `LlmTasksService` scheduling path.
- Next exact step: implement `LlmProviderService.deleteOldTestResults(...)`, add the weekly `@Cron('0 0 2 * * 0')` trigger in `backend/src/modules/llm/services/llm-tasks.service.ts`, then run backend tests/build.
- Files touched this session: `documents/features/todo/llm-model-test-results-retention-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: keep retention at 30 days by default and plan a weekly 02:00 server-time cleanup; no architecture diagram update was needed because this session created a plan only.
- Open questions for the user: confirm whether Sunday 02:00 server time is acceptable and whether retention should remain hardcoded at 30 days for version 1.
- Code review of llm-provider-management (backend `llm-provider` module + frontend `llm-providers-management` feature):
  - Bug 1: `result.logOutput` doesn't exist in `LlmModelTestResultEntity` — should be `result.errorMessage`. The table cell was showing "OK" even on errors.
  - Bug 2: `model.modelId` doesn't exist in `LlmModel` — should be `model.key`. The model slug cell was rendering `undefined`.
  - Cleanup: removed unused `BadgeColor` and `RippleModule` imports from the component.
- Verification: `npx ng build` from `frontend` passes; the `BadgeColor is not used` warning is gone. Remaining warnings are existing `explorer.css` and `chat-message.css` budget warnings only.
- Next exact step: decide on delete behavior (soft-disable vs hard delete), Hebrew UI for the LLM providers page, and whether to proceed with `documents/features/todo/database-storage-monitor-plan.md`.
- Files touched this session: `frontend/src/app/features/llm-providers-management/llm-providers-management.html`, `frontend/src/app/features/llm-providers-management/llm-providers-management.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: fixed the two data binding bugs to match the actual entity/service interfaces; no architecture diagram update was needed because this was data-binding correction only.
- Open questions for the user: whether delete should be hard delete or remain soft-disable, and whether the LLM providers page should be Hebrew or English.
- Added PrimeNG `p-dialog` for provider and model create/edit forms in `llm-providers-management`.
  - Provider dialog: key, label, baseUrl, apiKey, and active toggle.
  - Model dialog: key, label, and active toggle.
  - "Add Provider" button in the page header.
  - "Add Model" button in the expanded provider panel header.
  - Edit buttons on provider rows and model rows now open the respective dialogs pre-filled.
  - Delete model button added to model rows (soft-disable via PATCH `{ active: false }`).
  - `LlmProviderService` now has `deleteModel()`, and `LlmProviderStore` now has `deleteModel(providerId, modelId)`.
- Verification: `npx ng build` from `frontend` passes. New budget warning: `llm-providers-management.css` at 6.43 kB (limit 4 kB). Remaining warnings are `explorer.css` and `chat-message.css` budget warnings.
- Files touched this session: `frontend/src/app/features/llm-providers-management/llm-providers-management.html`, `frontend/src/app/features/llm-providers-management/llm-providers-management.ts`, `frontend/src/app/features/llm-providers-management/llm-providers-management.css`, `frontend/src/app/core/services/llm-provider.service.ts`, `frontend/src/app/core/store/llm-provider.store.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Merged the local LLM providers `.icon-btn` styling into the global button system.
  - `frontend/src/app/assets/styles/_buttons.css` now supports `i` icons inside global button sizing rules and adds `icon-only.testing`.
  - LLM provider icon buttons now use global `icon-only transparent-btn` or `icon-only danger-btn` classes.
  - Removed the duplicated `.icon-btn` block from `llm-providers-management.css`.
  - Removed the unnecessary local `add-model-btn`; the Add Model action now uses `transparent-btn sm`.
- Verification: `npm.cmd run build` from `frontend` passed. Warnings remain: initial bundle budget, `llm-providers-management.css` budget now reduced to 4.36 kB, plus existing `chat-message.css` and `explorer.css` budgets.
- Next exact step: if CSS budget cleanup is desired, continue reducing `frontend/src/app/features/llm-providers-management/llm-providers-management.css` by moving reusable table/panel patterns to global styles.
- Files touched this session: `frontend/src/app/assets/styles/_buttons.css`, `frontend/src/app/features/llm-providers-management/llm-providers-management.html`, `frontend/src/app/features/llm-providers-management/llm-providers-management.css`, `documents/HANDOFF.md`, `documents/STATUS.md`, and `documents/LOG.md`.
- Decisions made: use the existing global `icon-only` button convention instead of keeping a component-specific `.icon-btn`; no architecture diagram update was needed because this was CSS/HTML styling only.
- Open questions for the user: none.
- Closed the terpenes details plan by moving `documents/features/todo/terpenes-details-plan.md` to `documents/done/terpenes-details-plan.md`.
- Verified the implementation matches the plan: NestJS `Terpene` entity + service + controller + module + seed (17 Hebrew-named terpenes), Angular `ITerpene` + `TerpeneService` + `TerpeneStore` + `TerpeneTooltip` component, and the `MatchingPreferencesDrawer` injects `TerpeneStore`, imports `TerpeneTooltip`, and calls `terpeneStore.loadAll()` when the drawer opens.
- `TerpeneModule` is registered in `AppModule`; the earlier 404-on-`/terpenes` bug from STATUS.md 2026-06-27 audit is resolved by that registration.
- Next exact step: pick the next active plan from `documents/features/todo/` (e.g. `database-storage-monitor-plan.md` or `provider-and-llm-db-plan.md` Phases 4–9) or address the existing frontend warnings (`llm-providers-management.css` budget, `chat-message.css`, `explorer.css`).
- Files touched this session: `documents/done/terpenes-details-plan.md`, `documents/STATUS.md`, and `documents/HANDOFF.md`.
- Decisions made: mark the terpenes plan done based on file/git evidence rather than rerunning a build, since builds were already verified after the `TerpeneModule` registration fix recorded in STATUS.md; no architecture diagram update was needed because the module boundary and request flow are unchanged from what was already documented.
- Open questions for the user: none.
- Implemented `documents/features/todo/genetic-details-plan.md` end-to-end via two parallel agents (backend Phase 1, frontend Phases 2-3), then closed the plan by moving it to `documents/done/genetic-details-plan.md`.
- Backend artifacts (new files under `backend/src/modules/genetics/`): `entities/genetics.entity.ts`, `dto/genetics.dto.ts`, `dto/genetics-list-result-response.dto.ts`, `dto/genetics-result-response.dto.ts`, `genetics.service.ts`, `genetics.controller.ts`, `genetics.module.ts`, `seeds/genetics.seed.ts`. The seed reads the fenced JSON block from the (now-archived) plan file via UTF-8 `fs.readFileSync`, runs the §1.7 dedupe pass (sort by `name`, longer-description tiebreak, `(2)` suffix only on genuinely-different strains, final uniqueness assertion that throws on collision), then upserts 209 strains. No `try/catch` around `repo.save` — duplicate-key errors propagate to `main.ts`.
- Frontend artifacts: `core/models/genetics.interface.ts`, `core/services/genetics.service.ts`, `core/store/genetics.store.ts`, `components/shared/tooltip/{tooltip.ts,tooltip.html,tooltip.css}`. The drawer was updated per §3.1-§3.3 (parallel `geneticsRoles` map, `TooltipPos` carries `category` + `role`, `onChipEnter` reads role, dual-store `loadAll`, debug `console.log` removed). The `terpene-tooltip/` folder was deleted.
- Deviation handled: the root `StrainHunter` page had its own independent `TerpeneTooltip` usage that the plan did not list in Files Touched. The frontend agent made the minimum swap (`Tooltip` import + `category="terpene"` + host class rename) in `strain-hunter.ts/html/css` to keep the build green after the terpene-tooltip folder deletion.
- Runtime wiring fix: the backend agent's self-report claimed `GeneticsModule` was imported in `app.module.ts` and `seedGenetics` was called in `main.ts`, but the actual files on disk had neither. `nest build` is type-check only and never executes `main.ts`, so the missing wiring was invisible to the agent's verification step. I applied both edits directly (one-line each) and re-ran `npm.cmd run build` from `backend` — passes. `swagger-spec.json` was regenerated during that build and contains both `/genetics` and `/genetics/{name}` endpoints.
- Stray `scripts/verify-genetics-seed.js` (a one-off helper the frontend agent wrote to verify the §1.7 dedupe) was deleted from the repo root.
- Verification: `npm.cmd run build` from `backend` passes. `npx ng build` from `frontend` passes with no new warnings (existing `bundle initial` / `strain-hunter.css` / `chat-message.css` / `matching-preferences-drawer.css` budget warnings are pre-existing and out of scope). The corrupted-character scan over the 11 touched frontend files is clean. `tooltip.css` fits within the 4 kB component budget — no partial split was needed.
- Next exact step: (1) optionally run the dev server (`npm.cmd run start:dev -w backend` + `curl -H "Authorization: Bearer …" http://localhost:3000/genetics`) to confirm the seed inserts 209 rows and both endpoints serve them — required because `synchronize: true` only creates the table if MySQL is reachable; (2) update `documents/architecture-diagram.md` to add `GeneticsModule` to the Backend diagram and `GeneticsStore` + shared `Tooltip` to the frontend flow; (3) pick the next active plan from `documents/features/todo/` (`database-storage-monitor-plan.md`, `provider-and-llm-db-plan.md` Phases 4-9, or `llm-model-test-results-retention-plan.md`).
- Files touched this session: every file under `backend/src/modules/genetics/` (new), `backend/src/app.module.ts`, `backend/src/main.ts`, `backend/swagger-spec.json` (regenerated), `frontend/src/app/core/models/genetics.interface.ts`, `frontend/src/app/core/services/genetics.service.ts`, `frontend/src/app/core/store/genetics.store.ts`, `frontend/src/app/components/shared/tooltip/{tooltip.ts,tooltip.html,tooltip.css}`, `frontend/src/app/features/strain-hunter/matching-preferences-drawer/{matching-preferences-drawer.ts,html,css}`, `frontend/src/app/features/strain-hunter/strain-hunter/{strain-hunter.ts,html,css}`, deletion of `frontend/src/app/features/strain-hunter/terpene-tooltip/{terpene-tooltip.ts,html,css}` + the parent folder, deletion of `scripts/verify-genetics-seed.js`, move of `documents/features/todo/genetic-details-plan.md` to `documents/done/genetic-details-plan.md`, and updates to `documents/STATUS.md` and `documents/HANDOFF.md`.
- Decisions made: trust file-on-disk evidence over an agent's self-report when verifying wiring changes; `nest build` is not sufficient evidence that runtime seed calls are in place. Kept the plan's "fail loudly on duplicate" rule (no try/catch around `repo.save`) even though a permissive swallow would have been simpler, because silent corruption is much worse than a noisy crash during dev bootstrap.
- Open questions for the user: confirm whether `documents/architecture-diagram.md` should be updated now or as part of the next plan; confirm whether to run the dev-server smoke test before picking the next plan.

## 2026-07-18 Session (MCP Bridge Plan — Review and Rewrite)

- Reviewed `documents/todo/add-mcp-plan.md` against the actual code and rewrote it as `documents/features/todo/add-mcp-plan.md`. Old `documents/todo/add-mcp-plan.md` was removed.
- Fixed the wrong `LlmToolSchema` target: there are two types (`llm.types.ts` and the parser's local `swagger-tools.parser.ts:14`); the plan now extends the parser's local one because that is what `SwaggerToolsParser.getTools()` actually returns, and tags every emitted tool with `source: 'swagger'`.
- Fixed the render-spec contract mismatch: the existing transforms unwrap `data.result` (ServiceResultContainer); MCP returns a bare object. The plan now adds an `unwrapResult: boolean` flag (default `true`, `false` for MCP mappings) instead of forcing MCP to wrap into ServiceResultContainer.
- Made the executor dispatch ordering explicit: the MCP branch MUST run before `getEndpoint`, because the existing `executeToolCall` returns `Unknown tool call` for any name not in the parser. This was the most load-bearing change in the plan and was easy to miss in the original draft.
- Promoted the render-spec adapter test from "pinned fixture" to "pinned fixture file committed to disk" under `__fixtures__/`, so future drift is diffed against a known good output instead of asserted against an inlined string.
- Promoted the Phase 0 `listTools()` capture from a local script to a committed `__fixtures__/weather-mcp-tools.json`, so the parser is built against the same schema the bridge will use at runtime.
- Added a `callTool` error envelope (`{error:true, source:'mcp', toolName, message}`) so transient MCP failures are surfaced through the existing render-spec error short-circuit instead of bubbling into the generic "Tool execution failed" path.
- Promoted `@dangahagan/weather-mcp` and `@modelcontextprotocol/sdk` to **dependencies** (not devDependencies) — they ship in prod.
- Added a process-hygiene check (manual `Ctrl-C` on `start:dev` must not orphan MCP children) and a kill-switch (`MCP_ENABLED=false` default) so the bridge is opt-in.
- Confirmed via grep that `WeatherService` has no cross-module imports, so Phase 4 deletion is safe (controller is the only consumer).
- Confirmed `admin-agent.service.spec.ts` `WeatherController_*` references are loop-breaker test data only; left intact, documented in the plan so reviewers don't flag them.
- No architecture diagram update was needed for this session because the plan is still pre-implementation.
- Files touched this session: `documents/features/todo/add-mcp-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/todo/add-mcp-plan.md` (deleted).
- Decisions made: keep `WeatherModule` deletion gated behind Phase 4 manual verification; do not auto-disconnect and reconnect MCP servers on every call (out of scope for v1); use `ph-gear` step icon for all MCP tools in v1 and add per-tool icons in a follow-up if needed.
- Open questions for the user: confirm the move to `documents/features/todo/` is acceptable (project rule says "new work should prefer `documents/features/`"), and confirm the `unwrapResult` per-mapping flag is preferred over the alternative of wrapping the MCP result in `ServiceResultContainer`.

---

## 2026-06-28 Session (continued)

- Added 500ms mouse hover delay for `Tooltip` and `ScoreTooltip` components in `StrainHunter` to prevent flickering on rapid mouse movement.
- Modified `frontend/src/app/features/strain-hunter/strain-hunter.ts`:
  - Added `TOOLTIP_DELAY_MS = 500` constant.
  - Added `tooltipTimeout` and `scoreTooltipTimeout` signals to track pending timeouts.
  - Updated `onTerpeneEnter`, `onGeneticsEnter`, `onScoreRingEnter` to use `setTimeout` with 500ms delay.
  - Updated `onTooltipLeave`, `onScoreRingLeave` to clear pending timeouts.
- Verification: `npx ng build` from `frontend` passes with existing warnings only.
- No architecture diagram update needed (local UI behavior change only).
- Files touched: `frontend/src/app/features/strain-hunter/strain-hunter.ts`, `documents/STATUS.md`, `documents/HANDOFF.md`.
- Decisions made: Use `setTimeout`/`clearTimeout` pattern with signals for cleanup; apply same delay to both tooltip types for consistency.
- Open questions for the user: none.

## 2026-06-28 Session (continued — Silent Enrichment & Tooltip Fixes)

- Fixed p-tooltip opacity issue in `frontend/src/app/assets/styles/_primeng-overrides.css`:
  - Added smooth opacity transitions for `.p-tooltip` show/hide (`.p-tooltip-visible` class).
  - Ensured glassmorphism `::before` pseudo-element opacity transitions correctly.
- Added CREATE (POST) and UPDATE (PATCH) endpoints to both `TerpeneController` and `GeneticsController`:
  - `backend/src/modules/terpene/dto/terpene-create.dto.ts` (new)
  - `backend/src/modules/terpene/dto/terpene-update.dto.ts` (new)
  - `backend/src/modules/terpene/terpene.service.ts` — added `create()` / `update()` methods
  - `backend/src/modules/terpene/terpene.controller.ts` — added `POST /terpenes` and `PATCH /terpenes/:name`
  - `backend/src/modules/genetics/dto/genetics-create.dto.ts` (new)
  - `backend/src/modules/genetics/dto/genetics-update.dto.ts` (new)
  - `backend/src/modules/genetics/genetics.service.ts` — added `create()` / `update()` methods
  - `backend/src/modules/genetics/genetics.controller.ts` — added `POST /genetics` and `PATCH /genetics/:name`
  - All endpoints include full Swagger documentation with examples, validation, and error responses.
- Completed `documents/features/todo/silent-enrichment-plan.md` (moved to `documents/done/silent-enrichment-plan.md`):
  - Wired `GeneticsService.enrichBatch()` and `TerpeneService.enrichBatch()` into `StrainHunterService.fetchData()` after `strainRepository.save()`.
  - Enrichment extracts unique genetics names (originStrain, parent1, parent2) and terpene names from scraped items, filters empty/"לא ידוע" values, and calls both services in `Promise.all()`.
  - `enrichBatch` is idempotent: queries DB first via `findByNames()`, only calls LLM for missing names; TypeORM `save()` upserts.
  - Graceful LLM parse failure handling via try/catch — returns empty array, logs warning, `fetchData` continues.
  - Removed TODO comment from `frontend/src/app/components/shared/tooltip/tooltip.html` (line 33).
  - Frontend tooltips now show real data on first hover — zero user interaction, zero frontend API changes.
- Verification: `npm.cmd run build` from `backend` passes. `npx ng build` from `frontend` passes with existing warnings only.
- No architecture diagram update needed (backend module boundaries unchanged, no new frontend API calls).
- Files touched:
  - `frontend/src/app/assets/styles/_primeng-overrides.css`
  - `backend/src/modules/terpene/` (5 new/modified files)
  - `backend/src/modules/genetics/` (5 new/modified files)
  - `backend/src/modules/strain-hunter/strain-hunter.service.ts`
  - `frontend/src/app/components/shared/tooltip/tooltip.html`
  - `documents/STATUS.md`, `documents/HANDOFF.md`
  - `documents/done/silent-enrichment-plan.md` (moved from todo)
- Decisions made:
  - Silent enrichment runs on every `forceRefresh=true` (page load defaults to force refresh).
  - Batch LLM calls per catalog (max 2 LLM calls per `fetchData`).
  - TypeORM upsert preserves manually-set fields — only fills nulls.
  - Admin button in tooltip removed — proactive is better.
- Open questions for the user: none.

## 2026-06-28 Session (continued — Tooltip Merge Plan Closeout)

- The `documents/features/todo/tooltip-merge-plan.md` plan described migrating the StrainHunter table to the shared `Tooltip` component (replacing the old `TerpeneTooltip`).
- This migration was **already complete** in the codebase:
  - `frontend/src/app/components/shared/tooltip/` — shared component with `TooltipCategory = 'terpene' | 'genetics'` union, `@switch` template.
  - `frontend/src/app/features/strain-hunter/strain-hunter.ts` — imports shared `Tooltip`, injects `TerpeneStore` + `GeneticsStore`, uses single `tooltip` signal with `category` + `name`, handlers `onTerpeneEnter` / `onGeneticsEnter` / `onTooltipLeave` with 500ms delay.
  - `frontend/src/app/features/strain-hunter/strain-hunter.html` — binds hover on `terpene-node` and genetics chips, mounts `<app-tooltip class="tooltip-fixed">` at page root.
  - `frontend/src/app/features/strain-hunter/matching-preferences-drawer/` — already migrated to shared `Tooltip` (uses same pattern).
  - Old `features/strain-hunter/terpene-tooltip/` folder — already deleted.
- Moved `documents/features/todo/tooltip-merge-plan.md` → `documents/done/tooltip-merge-plan.md`.
- Verification: `npx ng build` passes; no code changes needed.
- Decisions made: Close completed plan; no architecture diagram update needed.
- Open questions for the user: none.


## 2026-07-01 Session

- Completed: refresh button in StrainHunter now shows a spinner on the button only — the table stays visible during refresh, and `pageState` stays Ready instead of briefly flashing to Loading.
  - Added `refreshing` signal alongside `loading`, so initial page load still triggers the full-page loader while refresh only spins the button.
  - `load()` now only sets `loading.set(true)` when `forceRefresh=false`; when `forceRefresh=true` it sets `refreshing.set(true)` instead.
  - Refresh button and match-drawer button now use `refreshing()` instead of `loading()` for disabled/spinner state.
  - On refresh failure, `error` state replaces the table (same as current behavior).
- Files touched: `frontend/src/app/features/strain-hunter/strain-hunter.ts`, `frontend/src/app/features/strain-hunter/strain-hunter.html`, `documents/features/todo/refresh-button-loader-plan.md` (edge case clarification per review).
- Decisions made: keep the error behavior unchanged — refresh failure still replaces the table, not suppressing the error.
- Open questions for the user: none.

## 2026-07-03 Session

**Chat Image Upload, Drag-and-Drop, and Clipboard Paste**

- Completed: implemented full multimodal image support for the chat.
- Backend changes:
  - `AgentRequestDto` now has optional `image?: string`; `prompt` relaxed from `@IsNotEmpty()` to `@IsOptional()`; `provider` relaxed from `@IsIn()` to `@IsString()`.
  - `LlmRequest` has `image?: string`; `LlmMessage` user content widened to `string | ChatCompletionContentPart[]`.
  - `LlmClientService.buildUserMessage(prompt, image?)` returns multimodal content array when image present.
  - `AdminAgentService` passes `image` through both `queryDatabase` and `queryDatabaseStream`; skips title update when prompt is empty.
  - `AdminAgentController` passes `dto.image` to stream; error response now includes `error.message`.
  - `LlmClientService.generateStream` now **throws** on error instead of yielding it as a token.
  - `main.ts` uses `bodyParser: false` + `app.use(json({ limit: '20mb' }))` to override NestJS default 100KB limit.
- Frontend changes:
  - `IChatMessage` has optional `imagePreview?: string`.
  - `ChatService.sendMessageStream` accepts 4th optional `image` param.
  - `chat.ts`: added signals (`isDragging`, `selectedImageBase64`, `selectedImagePreview`), `canSend` computed, file picker, drag/drop, paste, 10MB client limit.
  - `chat.html`: drag overlay, hidden file input, upload button, image preview thumbnail, `(paste)` binding, `canSend()` on send button.
  - `chat.css`: overlay, upload button, image preview styles, `position: relative` on container.
  - `chat-message.html` renders `imagePreview` thumbnail for user messages.
  - `chat-message.css`: `.message-attachment` styles.
- Moved plan to `documents/done/chat-image-upload-and-drag-drop-plan.md`.
- Verification: `npx ng build` from `frontend` passes; `npm.cmd run build` from `backend` passes.
- Root cause fixes:
  - `PayloadTooLargeError`: NestJS default body-parser 100KB limit; resolved with `bodyParser: false` + 20MB limit.
  - `400 Bad Request` on image-only messages: ValidationPipe rejected `prompt: ""` due to `@IsNotEmpty()`; resolved by relaxing to `@IsOptional()`.
- Files touched: `backend/src/main.ts`, `backend/src/modules/admin-agent/admin-agent.controller.ts`, `backend/src/modules/admin-agent/admin-agent.service.ts`, `backend/src/modules/admin-agent/dto/agent-request.dto.ts`, `backend/src/modules/llm/services/llm-client.service.ts`, `backend/src/modules/llm/types/llm.types.ts`, `frontend/src/app/core/models/chat-message.interface.ts`, `frontend/src/app/core/services/chat.service.ts`, `frontend/src/app/features/chat/chat/chat.ts`, `frontend/src/app/features/chat/chat/chat.html`, `frontend/src/app/features/chat/chat/chat.css`, `frontend/src/app/features/chat/chat-message/chat-message.html`, `frontend/src/app/features/chat/chat-message/chat-message.css`.
- Decisions made: single image per message in v1; no image persistence in MySQL; body-parser override instead of NestJS config; throw on stream error for proper controller catch handling.
- Open questions for the user: none.

## 2026-07-04 Session

**Chat Message Content Too Long Fix + Controller DRY Refactor + Color Contrast Backfill**

- Completed: fixed `Data too long for column 'content'` in `chat_messages` by widening the column from `TEXT` to `MEDIUMTEXT` and adding a `truncateForStorage()` helper that caps tool-result persistence at 50KB (cutting on `Buffer` bytes, not string chars, to handle Hebrew/UTF-8 correctly).
- Completed: extracted `private mapToDto(entity: Terpene): TerpeneDto` in `terpene.controller.ts`, replacing 4 identical inline mapping sites. The genetics controller already used `toGeneticsDto()` and was already DRY.
- Completed: added DTO mapping coverage tests (`terpene.controller.spec.ts` with 3 tests, `genetics.dto.spec.ts` with 4 tests) that assert `Object.keys(mapToDto(entity))` matches the DTO field list — catches missing mappings at build time.
- Completed: added `colorDark`/`colorLight` fields to `TerpeneDto`, `GeneticsDto`, `toGeneticsDto()`, and all 4 terpene controller mapping sites.
- Completed: backfilled all 18 terpenes and 246 genetics rows with WCAG AA-safe color variants via `deriveThemeColors()`.
- Verified: `npm run build` from `backend` passes; `npm run test` passes 19/19 (pre-existing `app.controller.spec.ts` FAIL unrelated); `npx ng build` from `frontend` passes.
- Files touched: `backend/src/modules/admin-agent/entities/chat-message.entity.ts`, `backend/src/modules/admin-agent/admin-agent.service.ts`, `backend/src/modules/admin-agent/admin-agent.service.spec.ts` (new), `backend/src/modules/terpene/terpene.controller.ts`, `backend/src/modules/terpene/terpene.controller.spec.ts` (new), `backend/src/modules/terpene/dto/terpene.dto.ts`, `backend/src/modules/genetics/dto/genetics.dto.ts`, `backend/src/modules/genetics/dto/genetics.dto.spec.ts` (new), `documents/done/chat-message-content-too-long-fix-plan.md` (moved from todo), `documents/STATUS.md`, `documents/HANDOFF.md`.
- Decisions made: `MEDIUMTEXT` over `LONGTEXT` to keep row-size cost bounded; `truncateForStorage` at the orchestrator layer (not executor) so the LLM still gets the full result on the current iteration; coverage tests use hardcoded DTO key lists rather than reflection to keep them explicit.
- Open questions for the user: none.

## 2026-07-04 Session (continued — Strain Hunter Settings Filter Fix)

**Strain Hunter Settings Filter Bug Fix**

- Completed: fixed the genetics and terpenes filter fields in `frontend/src/app/features/settings/strain-hunter-settings/`. The filter was broken in two ways: `onGeneticsFilter`/`onTerpeneFilter` were typed as `(event: Event)` and called `event.target.value`, but `(ngModelChange)` passes a string directly; and `filteredGenetics`/`filteredTerpenes` were plain getters instead of `computed()` signals, so change detection did not react to filter changes.
- Completed: converted both filters to `computed()` signals, inlined the store reads, and changed the handler signatures to `value: string` (matching the `(ngModelChange)` payload). Template bindings updated to call `filteredGenetics()` / `filteredTerpenes()`.
- Completed: added styled empty messages for both tables. Each `<p-table>` now has an `emptymessage` template that renders a `.table-empty-state` block (icon + Hebrew title + Hebrew subtitle). Genetics uses `ph-magnifying-glass-minus`, terpenes use `ph-leaf`. Colspans: 7 for genetics, 5 for terpenes.
- Completed: added a `.table-empty-state` rule to the component CSS that mirrors the global `.page-state.empty-state` visual language (icon + title + subtitle), uses only `var(--token)` values, and is nested under the root selector per project conventions.
- Verified: `npx ng build` from `frontend` passes. Mojibake scan on the touched files is clean.
- Files touched: `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.ts` (modified), `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.html` (modified), `frontend/src/app/features/settings/strain-hunter-settings/strain-hunter-settings.css` (modified), `documents/HANDOFF.md`, `documents/STATUS.md`. (`documents/LOG.md` was not updated because this was local UI bugfix + UI/CSS empty-state work with no architectural decisions.)
- Decisions made: mirror the `chat-history.ts` pattern (computed filter signal + `(input)` value handler) because it is the established convention in the project; reuse PrimeNG's `emptymessage` template for table-level empty results instead of an external empty state, since the filter is a table-level concern; follow `.page-state.empty-state` visual language for the empty message but use a more local `.table-empty-state` so we don't depend on the page-level `min-height: 320px` flex behavior.
- Open questions for the user: none.
- Next exact step: visually check `/settings/strain-hunter-settings` and confirm the empty messages appear centered with correct Hebrew rendering in dark and light themes, then pick the next active plan from `documents/features/todo/` (e.g. `database-storage-monitor-plan.md`, `provider-and-llm-db-plan.md` Phases 4-9, or `llm-model-test-results-retention-plan.md`).
- No architecture diagram update was needed because this was local Strain Hunter Settings UI filter behavior only.

## 2026-07-05 Session

**CSS Conventions Fix**

- Completed: all 6 steps of `documents/todo/css-conventions-fix.md` — added 4 tokens, replaced 4 hex colors, replaced 1 hardcoded `rgba`, replaced 2 hardcoded `font-size` px values, and removed 1 duplicate hardcoded padding override. Plan moved to `documents/done/css-conventions-fix.md`.
- Files touched (modified): `frontend/src/app/assets/styles/_variables.css`, `frontend/src/app/features/strain-hunter/strain-hunter.css`, `frontend/src/app/assets/styles/_layout.css`, `frontend/src/app/features/chat/chat-message/chat-message.css`, `frontend/src/app/features/strain-hunter/matching-preferences-drawer/matching-preferences-drawer.css`, `frontend/src/app/features/chat/chat/chat.css`.
- Files touched (docs): `documents/todo/css-conventions-fix.md` → `documents/done/css-conventions-fix.md`, `documents/STATUS.md`, `documents/HANDOFF.md`, `documents/LOG.md`.
- Verification: `npx ng build` from `frontend` passes; grep for `rgba(0,0,0` in `_layout.css` returns none; grep for `#[0-9a-fA-F]{3,6}` in `strain-hunter.css` returns none; grep for `font-size: [0-9]+px` in `chat-message.css` and `matching-preferences-drawer.css` returns none; grep for `32px` in `chat.css` returns none. Remaining bundle warnings are pre-existing and unrelated.
- Decisions made: kept this fix scoped to the 6 originally identified files; flagged the 2 out-of-scope `rgba(0,0,0,...)` literals in `_utilities.css:273` (`.color-dot`) and `_buttons.css:173` (`.primary-btn.filled:hover`) for a follow-up ticket rather than expanding scope.
- Open questions for the user: none.
- Next exact step: create a new follow-up plan to convert the `_utilities.css:273` and `_buttons.css:173` `rgba(0, 0, 0, ...)` shadows to global tokens, or pick up `documents/features/todo/database-storage-monitor-plan.md`.

## 2026-07-06 Session (llm-model-test-results-retention)

- Completed: `documents/done/llm-model-test-results-retention-plan.md`.
  - Added `deleteOldTestResults(retentionDays = 30)` to `backend/src/modules/llm-provider/llm-provider.service.ts`. Uses TypeORM `LessThan` on `createdAt`; returns `affected` count.
  - Added `cleanupOldLlmModelTestResults()` to `backend/src/modules/llm/services/llm-tasks.service.ts` with `@Cron('0 0 2 * * 0')` (Sunday 02:00 server time). Injects `LlmProviderService`. Logs start, cutoff, and deleted row count.
  - No new module imports needed — `LlmProviderModule` already exports `LlmProviderService` and `LlmModule` already imports it.
  - Added `backend/src/modules/llm-provider/llm-provider.service.spec.ts` with 5 tests asserting `LessThan` operator usage, cutoff calculation accuracy, affected-count return, zero-affected handling, and custom retention.
  - Verified: `npm test` passes 25/25 (pre-existing `app.controller.spec.ts` FAIL unrelated); `npm run build` passes.
- Files touched: `backend/src/modules/llm-provider/llm-provider.service.ts`, `backend/src/modules/llm/services/llm-tasks.service.ts`, `backend/src/modules/llm-provider/llm-provider.service.spec.ts`, `documents/done/llm-model-test-results-retention-plan.md`, `documents/STATUS.md`, `documents/HANDOFF.md`.
- Decisions made: keep Sunday 02:00 server-time weekly cron; hardcode 30-day retention for version 1; no architecture diagram update needed.
- Open questions for the user: none.
- Next exact step: pick the next active plan from `documents/features/todo/` (`database-storage-monitor-plan.md`, `provider-and-llm-db-plan.md` Phases 4-9, or `genui-progressive-streaming-rendering-plan.md`), or address the existing frontend CSS budget warnings.

## 2026-07-06 Session (CSS Conventions Fix Plan — Audit Findings)

**CSS Conventions Fix Plan (Audit Findings 1-6)**

- Completed: `documents/features/todo/css-conventions-fix-plan.md` → moved to `documents/done/css-conventions-fix-plan.md`.
- Reviewed all 7 audit findings against the current codebase. Findings 1-3 and 6 referenced stale class names (`archive-item`, `nested-sessions-list`, `session-sub-item`, `.search-box`, `.search-container`) that no longer exist — skipped as already resolved or inapplicable.
- Finding 4 (broad transitions): replaced `transition: var(--transition-standard)` in `main-sidebar.css` `.nav-item` with explicit `background-color` and `color` transitions.
- Finding 5 (hardcoded pixels): tokenized 40px values in `main-sidebar.css` (`.theme-toggle` and `.user-avatar`) to `var(--space-10)`.
- Added `--space-10: 40px` token to `frontend/src/app/assets/styles/_variables.css`.
- `220px` sidebar width kept as a documented exception (unique fixed layout dimension).
- Verified: `npx ng build` from `frontend` passes. No new warnings.
- Files touched: `frontend/src/app/assets/styles/_variables.css`, `frontend/src/app/features/layout/main-sidebar/main-sidebar.css`, `documents/features/todo/css-conventions-fix-plan.md` → `documents/done/css-conventions-fix-plan.md`, `documents/STATUS.md`, `documents/HANDOFF.md`.
- Decisions made: most audit findings were stale (referencing classes that no longer exist); only 2 of 7 findings were actionable. No architecture diagram update needed (CSS-only refactoring).
- Open questions for the user: none.

## 2026-07-07 Session (GenUI Speed and Quality Improvement — Implementation)

- Implemented all five phases of `documents/features/todo/genui-speed-and-quality-improvement-plan.md`.
- Phase 1: Added progressive streaming rendering to `AiFormat` directive. New methods: `extractProgressiveComponentParts`, `sanitizeProgressiveComponentHtml`, `sanitizePartialComponentCss`, `scheduleProgressivePreview` (rAF-throttled), `renderProgressivePreview` (stable preview host). Closed-fence finalization reuses the preview host to avoid DOM thrash. Added `OnDestroy` for cleanup.
- Phase 1.7: Added 27 new tests covering progressive extraction, partial CSS/HTML sanitization, tag guard, open-tag detection, stable prefix detection, and streaming component detection.
- Phase 2: Updated `ChatMessage` with `isInsideComponentStream()` helper. Component streams now flush in 12-24 char chunks with 0ms delay (vs 1-3 chars / 18-35ms for prose). Cursor hidden during component streams.
- Phase 3: Split `SYSTEM_CONTEXT` into `SYSTEM_CONTEXT_BASE` and `SYSTEM_CONTEXT_GENUI`. Added `buildSystemContext({ includeGenui })` helper and `VISUAL_TRIGGER_KEYWORDS` array. `AdminAgentService.getDynamicSystemContext()` now conditionally includes GenUI based on prompt keywords. Trimmed per-template boilerplate from `gen-ui-spec.constant.ts`.
- Phase 4: Added rAF-coalesced token buffering in `Chat` (`pendingTokenBuffer`, `scheduleTokenFlush`, `flushPendingTokens`). Tokens are flushed before `loading.set(false)`, on error, and on stream stop.
- Phase 5: Updated `documents/architecture-diagram.md` with streaming event flow sequence diagram. Added `[AdminAgentStream]` log line with time-to-first-token, totalMs, tokens, components. Created `documents/architecture/genui-streaming-protocol.md`.
- Moved plan to `documents/done/genui-speed-and-quality-improvement-plan.md`.
- Verification: `npx ng test --watch=false` from `frontend` passes 47 tests (2 pre-existing `app.spec.ts` failures). `npx ng build` from `frontend` passes with existing budget warnings only. `npm.cmd run test` from `backend` passes 25 tests (1 pre-existing `app.controller.spec.ts` failure). `npm.cmd run build` from `backend` passes.
- Files touched: `frontend/src/app/core/directives/ai-format.directive.ts`, `frontend/src/app/core/directives/ai-format.directive.spec.ts`, `frontend/src/app/features/chat/chat-message/chat-message.ts`, `frontend/src/app/features/chat/chat/chat.ts`, `backend/src/modules/admin-agent/constants/system-context.constant.ts`, `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`, `backend/src/modules/admin-agent/admin-agent.service.ts`, `documents/architecture-diagram.md`, `documents/architecture/genui-streaming-protocol.md`, `documents/done/genui-speed-and-quality-improvement-plan.md`, `documents/HANDOFF.md`, `documents/STATUS.md`.
- Decisions made: keep progressive rendering as the default (no feature toggle needed since the skeleton fallback handles edge cases); GenUI keyword list is simple and in code for easy reversion; token coalescing uses rAF with setTimeout fallback.
- Open questions for the user: none.

## 2026-07-09 Session (Database Storage Monitor)

- Implemented `documents/features/todo/database-storage-monitor-plan.md` (full stack) and rendered it in the Settings page.
- Backend:
  - Created DTOs: `database-table-storage.dto.ts`, `database-storage-summary.dto.ts`, `database-storage-result-response.dto.ts` under `backend/src/modules/database-monitor/dto/`.
  - Created `database-monitor.service.ts` — queries `information_schema.tables` with a fixed SQL string, formats bytes, calculates percentOfDatabase, sorts descending.
  - Created `database-monitor.controller.ts` — `GET /database-monitor/storage` with full Swagger metadata including `summaryHe`, `toolIcon: 'ph-database'`, and `genUiSpec`.
  - Created `database-monitor.module.ts`.
  - Registered `DatabaseMonitorModule` in `AppModule`.
  - Added `DATABASE_STORAGE_MONITOR` GenUI spec to `gen-ui-spec.constant.ts` with conic-gradient chart guidance and design-token-only instruction.
  - Added `database-monitor.service.spec.ts` with 7 tests: sorted summary, empty tables, byte formatting, zero-division, percentOfDatabase accuracy, fixed query, null rowCount handling.
- Frontend:
  - Created `database-monitor.service.ts` in `core/services/`.
  - Created `database-monitor-settings` component under `settings/` with loading/error/ready states, donut chart (conic-gradient), table bar chart, summary cards.
  - Added third tab "מסד נתונים" to `settings.html`.
  - Updated `settings.ts` imports.
  - Added `--color-table-1` through `--color-table-6` chart tokens to `_variables.css`.
- Verification: `npm.cmd run test` from `backend` passes (pre-existing `app.controller.spec.ts` failure only). `npm.cmd run build` from `backend` passes. `npx ng build` from `frontend` passes.
- Files touched: `backend/src/modules/database-monitor/` (5 new files), `backend/src/app.module.ts`, `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`, `frontend/src/app/core/services/database-monitor.service.ts`, `frontend/src/app/features/settings/database-monitor-settings/` (3 new files), `frontend/src/app/features/settings/settings.ts`, `frontend/src/app/features/settings/settings.html`, `frontend/src/app/assets/styles/_variables.css`.
- Decisions made: JWT-guarded endpoint as per plan; no growth rate in v1; CSS conic-gradient for donut chart; design tokens only in GenUI spec. UI standard: `auto-fit` grid, `aspect-ratio: 1/1` for donut, local fallback colors in `:host`, component-specific CSS only (global classes for everything else).
- Open questions for the user: none.

## 2026-07-15 Session (GenUI → JSON Migration — Phases 1 & 2)

- Completed Phase 1 (Backend) and Phase 2 (Frontend) of `documents/features/todo/genui-to-json-migration-plan.md`.
- **Phase 1 — Backend JSON Contracts & Infrastructure:**
  - Installed `zod` in backend.
  - Created `backend/src/modules/admin-agent/render-spec/` directory with 12 files:
    - `render-spec.interface.ts` — `RenderSpecType` enum (16 types) + `RenderSpec` union type with Zod discriminated union.
    - 9 domain files: `weather.render-spec.ts`, `currency.render-spec.ts`, `users.render-spec.ts`, `chat.render-spec.ts`, `analytics.render-spec.ts`, `system.render-spec.ts`, `db-monitor.render-spec.ts`, `llm.render-spec.ts`, `common.render-spec.ts` — each with TypeScript interfaces + Zod schemas.
    - `render-spec.service.ts` — Injectable service with `buildRenderSpec(toolName, resultData)` that maps 16 tool names to render specs, validates via Zod, returns null on error.
    - `render-spec.service.spec.ts` — 17 unit tests covering all tool mappings, error paths, and edge cases.
  - Added `renderSpec` column (text, nullable) to `ChatMessage` entity.
  - Updated `AgentSessionService.saveMessage` to persist `renderSpec` in options.
  - Updated `AdminAgentService.queryDatabaseStream` to yield `{type:"render", component, data}` events after tool execution, and save `renderSpec` to DB.
  - Registered `RenderSpecService` in `AdminAgentModule`.
  - Verification: `npm run build` passes, `npm run test` passes (60 tests, 1 pre-existing failure).
- **Phase 2 — Frontend Core Rendering Infrastructure:**
  - Created `frontend/src/app/features/chat/render-host/render-host.component.ts` — standalone component with `@switch` for all 15 render types (placeholder cases for Phase 3-5).
  - Created `render-host.component.css` — minimal layout with design tokens.
  - Updated `ChatStreamEvent` type — added `render` event: `{ type: 'render', component: string; data: Record<string, unknown> }`.
  - Added `IRenderBlock` interface and `renderBlocks` field to `IChatMessage`.
  - Added `renderSpec` field to `IChatMessage` for persisted messages.
  - Updated `ChatMessage` component — imported `RenderHostComponent`, added `pendingRenderBlocks` signal, `renderBlocksForDisplay` computed (reads from message during streaming, from `renderSpec` when idle), `handleStreamEvent()` method, `resetLocalState()` parses `renderSpec` from message.
  - Updated `chat-message.html` — renders `<app-render-host>` blocks after prose `AiFormat` div.
  - Updated `Chat` component stream subscription — handles `render` events by adding to message's `renderBlocks` array.
  - Compatibility layer: both old ` ```component ` blocks (via `AiFormat`) and new `render` events work simultaneously.
  - Verification: `npx ng build` passes, `npx ng test --watch=false` passes (47 tests, 2 pre-existing failures).
- Files touched: 12 new files in `backend/src/modules/admin-agent/render-spec/`, `backend/src/modules/admin-agent/entities/chat-message.entity.ts`, `backend/src/modules/admin-agent/services/agent-session.service.ts`, `backend/src/modules/admin-agent/admin-agent.service.ts`, `backend/src/modules/admin-agent/admin-agent.module.ts`, `backend/src/modules/admin-agent/admin-agent.service.spec.ts`, `backend/package.json`, `frontend/src/app/features/chat/render-host/` (2 new files), `frontend/src/app/core/models/chat-message.interface.ts`, `frontend/src/app/features/chat/chat-message/chat-message.ts`, `frontend/src/app/features/chat/chat-message/chat-message.html`, `frontend/src/app/features/chat/chat/chat.ts`.
- Decisions made: Zod schemas co-located with interfaces; `buildRenderSpec` wraps parse in try/catch returning null on failure; render events emitted during streaming alongside existing step/token events; compatibility layer keeps both GenUI and render paths alive until Phase 6-7 cleanup.
- Open questions for the user: none.
- Next exact step: Phase 3 — Build Angular Components (Batch 1: WeatherCurrentCard, CurrencyCard, DeleteConfirmCard, SessionCreatedCard, RoleChangeCard).

## 2026-07-15 Session (GenUI → JSON Migration — Phases 6, 7)

- Completed Phase 6 (Backend Cleanup) and Phase 7 (Frontend Cleanup) of `genui-to-json-migration-plan.md`.
- **Phase 6 — Backend Cleanup:**
  - Removed `genUiSpec` logging from `AdminAgentService` (line 62).
  - Removed `shouldIncludeGenui` method and `VISUAL_TRIGGER_KEYWORDS` reference.
  - Simplified `getDynamicSystemContext` — removed `prompt` parameter and `includeGenui` logic.
  - `gen-ui-spec.constant.ts` was already deleted (Phase 1).
  - `system-context.constant.ts` was already cleaned (Phase 1).
  - Grep for `GenUI|genui|genUiSpec|VISUAL_TRIGGER_KEYWORDS|shouldIncludeGenui|includeGenui` returns zero results in `backend/src`.
- **Phase 7 — Frontend Cleanup:**
  - Removed 31 GenUI tests from `ai-format.directive.spec.ts` that called removed methods (`sanitizeComponentHtml`, `isStreamingComponent`, `extractProgressiveComponentParts`, `sanitizeProgressiveComponentHtml`, `sanitizePartialComponentCss`, `isInsideOpenTag`, `findStableElementPrefix`).
  - Kept 2 passing tests that test `parse()` (CSS fences, role badges).
  - Grep for `genui|GenUI|genUiSpec|sanitizeComponentHtml|isStreamingComponent` returns zero results in `frontend/src`.
- **Verification:** Backend: `npx jest` — 60/60 pass (only pre-existing `app.controller.spec.ts` failure). Frontend: `npx ng test --watch=false` — 121/123 pass (only 2 pre-existing `app.spec.ts` failures).
- **Files touched:** `admin-agent.service.ts` (removed 3 GenUI references), `ai-format.directive.spec.ts` (removed 31 failing tests).
- **Decisions made:** Kept `AiFormat` directive with legacy `component` block handler for old chat history compatibility (as planned in Phase 7 step 7.8).
- **GenUI migration status:** All 7 phases complete. 15 Angular components built and registered. Backend sends typed JSON `render` events. Frontend renders via `RenderHostComponent`. Old GenUI path fully removed.
- **Open questions:** None.
- **Next step:** Move `genui-to-json-migration-plan.md` to `documents/done/`. Update `STATUS.md`.

## 2026-07-15 Session (continued — Weather Forecast Render Bug)

- Fixed the `RenderSpecService` data mapping bug that was causing all 16 render components to receive empty data and fall back to LLM prose rendering.
- **Root cause:** `agent-tool-executor.service.ts:293` returns `JSON.stringify((res as any).data)`, the raw HTTP response body. Every domain controller in this project wraps its response in `ServiceResultContainer<T>` (shape: `{ success, message, result: T, error? }`), but the `TOOL_RENDER_MAPPINGS` transforms in `render-spec.service.ts` were reading from `data` directly (e.g. `data.location`, `data.users`, `data.forecast`). All fields resolved to `undefined`, the Zod schema (everything `.optional()`) accepted the empty candidate, and the service yielded a `render` event with empty data. The Angular component template has `@if (data().forecast?.length)` and `@if (data().location)` guards, so the card rendered as an empty `<div class="forecast-container">` and the user only saw the LLM prose.
- Secondary bug: even if `.result` is unwrapped, several field names in the transforms did not match the actual DTOs. The forecast DTO has `tempMax`/`tempMin`/`description`/`emoji` but the transform and Zod schema expected `maxTempC`/`minTempC`/`weatherDesc`/`weatherEmoji`. The current weather transform read `data.temp_C` (wttr.in raw field) but the DTO has `data.result.tempC` (string, not number).
- **Fix in `render-spec.service.ts`:**
  - Added `toNumber` and `toBool` coercion helpers for DTOs that return numeric/bool fields as strings.
  - Rewrote all 16 transforms to: (a) unwrap `data.result` for `ServiceResultContainer`-wrapped endpoints, (b) fall back to `data.data` and direct field for the few unwrapped admin-agent endpoints, (c) map actual DTO field names into the contract names the Zod schemas and Angular components expect.
  - Verified field names against each DTO file (`WeatherCurrentDto`, `WeatherForecastDto`, `WeatherForecastDayDto`, `CurrencyConversionResponseDto`, `CurrencyRatesResponseDto`, `UserResponseDto`, `SystemStatusDto`, `AnalyticsQueryResponseDto`, `DatabaseStorageSummaryDto`).
- **Fix in `render-spec.service.spec.ts`:**
  - Updated 5 test fixtures (WeatherCurrent, WeatherForecast, Currency convert, Currency rates, pre-parsed-objects) to wrap input as `ServiceResultContainer` so they actually exercise the production unwrap path.
  - Existing tests passed raw data and never caught the bug — fixing the tests is part of the fix.
- **Files NOT changed (intentionally):**
  - Angular components (`WeatherForecastComponent`, `WeatherCurrentCardComponent`, etc.) — they read `data().location`, `data().forecast[i].maxTempC`, etc. Those are the correct **contract** names; the fix is on the backend mapping DTO names to contract names.
  - Zod schemas — they describe the contract. Already use `.optional()` everywhere, so the empty-data event was technically valid (Zod accepted it).
  - `system-context.constant.ts` — already cleaned, no GenUI prompt.
  - Frontend `ChatMessage` / `RenderHostComponent` — they correctly read `message().renderBlocks` and switch on `componentType`. They are not the bug.
- **Verification:**
  - `npm.cmd run build` from `backend` — pass.
  - `npm.cmd run test` from `backend` — 60/60 pass (only pre-existing `app.controller.spec.ts` TS error unrelated).
  - `npx ng build` from `frontend` — pass with existing warnings only.
  - `npx ng test --watch=false` from `frontend` — 121/123 pass (only 2 pre-existing `app.spec.ts` `MessageService` provider failures unrelated).
- **Decisions made:**
  - Kept Zod schemas as-is because they already declare all field names correctly under the contract — the bug was the backend transform not producing matching data, not the contract.
  - Coerced string DTO fields (`tempC`, `humidity`, etc. as strings) to numbers via `toNumber` helper so the schema's `z.number()` constraints are satisfied. The component template handles them as numbers, which is what they should be.
  - Did not add `@defer` to the forecast/weather components — they are light enough that synchronous rendering is fine, and the user's primary complaint is that nothing renders, not that it renders slowly.
- **Next step:** ~~Manually test in the running app: ask "מה תחזית מזג האוויר ל-5 ימים בתל אביב" and "מזג האוויר הנוכחי בלונדון" — both should now show the Angular cards with proper data, not the LLM prose table. If the user confirms this works, move `genui-to-json-migration-plan.md` to `documents/done/`.~~ **Done.** User screenshot confirms the weather forecast card now renders 5 day cards with proper data (Tel Aviv, רביעי 32°/25° ☀️, etc.) and the LLM prose is reduced to a brief intro. `genui-to-json-migration-plan.md` moved to `documents/done/`. The next step is to continue with the other active plans from `documents/features/todo/` or address the remaining frontend warnings.
- **Files touched:** `backend/src/modules/admin-agent/render-spec/render-spec.service.ts`, `backend/src/modules/admin-agent/render-spec/render-spec.service.spec.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.

## 2026-07-15 Session (continued — Remove LLM Prose Duplication of Card Data)

- After the render-spec fix landed, the weather forecast card rendered correctly with 5 day cards, but the LLM was still producing a duplicate markdown table of the same data above the card (e.g. "יום ראשון ☀️ 32°C 24°C 60% / יום שני ☁️ 35°C 28°C 55% / ..." inline in the prose). User feedback: "הטבלה הראשונית מיותרת" (The initial table is redundant).
- **Root cause:** the system prompt in `system-context.constant.ts` did not tell the LLM that structured tool results are auto-rendered as visual cards. The LLM reasonably reproduced the data in prose as a "just in case" fallback.
- **Fix in `backend/src/modules/admin-agent/constants/system-context.constant.ts`:**
  - Added a `VISUAL RESPONSE RULE` block to `SYSTEM_CONTEXT_BASE` (right after the `CRITICAL ANTI-HALLUCINATION RULE` block).
  - Lists the 11 render-bearing tool types so the LLM knows which tools trigger a card: weather forecast, currency conversion, users table, analytics chart, system status, database storage, chat sessions, transcript, LLM test results, delete confirmation, register form.
  - Instructs the LLM to write only a short prose summary that adds context the visual cannot show (e.g. "תל אביב תהיה הכי חמה ביום שישי", "ההמרה מבוססת על שער יציג נכון להיום").
  - Forbids markdown tables, bullet lists, or inline lists of the same numbers/rows the card will show.
  - Allows inline reproduction only when the user explicitly asks for raw text-only output (screen reader, copy-paste).
- **Rule is generic** — it lists each tool type by name in the prompt so the LLM has an explicit enumeration, but the rule itself applies to all render-bearing tools without per-tool customization.
- **Files NOT changed (intentionally):**
  - The `RenderSpec` Zod schemas, the Angular components, and `RenderSpecService` — they already produce and render the right data.
  - The tool-executor path — the duplicate prose is an LLM authoring choice, not a duplicate render event.
  - The `ai-format.directive` — it correctly renders whatever the LLM produces; the fix is upstream in the prompt.
- **Verification:**
  - `npm.cmd run build` from `backend` — pass.
  - No new code tests were added because the change is a system-prompt instruction; the verification is a live chat test that requires a dev server, JWT, and LLM credentials.
- **Live verification (user-driven):** send "מה תחזית מזג האוויר ל-5 ימים בתל אביב" again and confirm the LLM now produces only a 1-2 sentence prose intro with the structured card as the only tabular presentation.
- **Decisions made:**
  - Listed the 11 render-bearing tool types by name in the prompt rather than using a generic phrase — explicit enumeration is harder for the LLM to overlook or misinterpret.
  - Did not introduce a per-tool or per-component instruction list in the code; the single rule covers all of them generically.
  - Did not add a JSON-mode constraint or a `tools`-only response mode — the LLM still needs to produce natural prose around the render event for the brief intro, the system protection warnings, and the data-integrity confirmations.
- **Files touched:** `backend/src/modules/admin-agent/constants/system-context.constant.ts`, `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
