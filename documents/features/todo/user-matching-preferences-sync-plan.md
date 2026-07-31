# User Matching Preferences Sync Plan

## Goal

Sync the user's matching-engine preferences (`MatchingEngineStore`) from browser `localStorage` to the backend database, scoped per authenticated user, and expose them to the AI agent as tools so it can give real, preference-based strain recommendations.

This plan replaces the draft `documents/features/todo/new-plan.md` (which had architectural and correctness bugs — see below).

## Current State (verified in code)

- `MatchingEngineStore` (`frontend/src/app/core/store/matching-engine.store.ts`) persists `prefs` + `weights` **only** to `localStorage` under `matching-engine:v1`. No server persistence exists.
- `UsersController` (`backend/src/modules/users/users.controller.ts`) has no preferences endpoints. No `user_matching_preferences` table exists.
- Agent tools are generated automatically from Swagger (naming convention `UsersController_getById`, `StrainHunterController_fetchData`). `system-context.constant.ts` documents when/how the agent uses tools.
- `StrainHunterService` already injects `Repository<Strain>` (`strain-hunter.service.ts:79`) — the strain search belongs in the service, not the controller.
- TypeORM `synchronize: true` is enabled (`backend/src/app.module.ts:46`) → the new table auto-creates on backend boot. No migration needed.
- Frontend has global interceptors (`withCredentialsInterceptor`, `authInterceptor` with 401→refresh→retry) — the frontend service must NOT add manual `withCredentials` or 401 handling.

## Why This Plan Replaces The Draft (`new-plan.md`)

1. **Mojibake**: the draft's store code contains corrupted Hebrew: `raw === "׳œ׳  ׳™׳•׳¢"` must be `raw === 'לא ידוע'`.
2. **Architecture violation**: the draft injects `Repository` directly into the controller. Porat convention = Controller + Service + Entity; repository logic must live in a `UserPreferencesService`.
3. **Echo-loop bug**: the draft's `effect()` fires on every signal change, and `loadFromBackend()` sets signals → triggers a PUT of the server's own data back to the server.
4. **Race condition**: async hydration can overwrite fresh user edits made while the GET is in flight.
5. **Auth gap**: the store is a root singleton. On 401 (logged out) sync must degrade to localStorage-only; on login/logout it must reload/reset per user.
6. **Incomplete Swagger**: the draft controller is missing `@ApiUnauthorizedResponse`/`@ApiForbiddenResponse`/`@ApiNotFoundResponse`/`@ApiInternalServerErrorResponse`, response DTOs, and JSDoc — required by `nestjs-rules.md`.
7. **Missing agent integration**: nothing tells the agent these tools exist or how to combine them for recommendations.
8. **Missing limit safety**: `searchStrains` accepts an unbounded `limit` and unescaped LIKE wildcards.
9. **Missing tests, verification, and documentation steps** (architecture diagram, HANDOFF/STATUS/LOG).

> Note: the original `documents/features/todo/new-plan.md` no longer exists in the repository, so the bug list above is documented from the draft's known content at the time of writing. The fixes still stand on their own merit (verified against the current codebase).

## Revision Notes (2026-07-31)

This revision applies the following fixes identified during meta-review. All line numbers refer to the original version of this plan.

| #   | Severity | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S5  | 🔴       | Remove `loadFromBackend()` from the `MatchingEngineStore` constructor. The constructor's HTTP fire runs at APP_INITIALIZER time, before the session is restored, and on a 401 the auth interceptor calls `authStore.logout() + router.navigate('/login')` — causing a forced redirect on every cold boot. The call now moves to `initializeApp` in `app.config.ts` (after `checkSession` returns a user) and to the `login()` success path.          |
| C2  | 🔴       | Change `UserPreferencesController` base path from `users/preferences` to `me/preferences`. The `UsersController` declares `@Get(':id')` (`users.controller.ts:90`) which matches `GET /users/preferences` first and rejects it via `ParseIntPipe` → 400. `me/preferences` is outside the `/users` namespace, so no cross-controller ordering risk.                                                                                                   |
| C1  | 🔴       | Frontend service must import `environment` from `../../environments/environment` (two levels), not `../../../environments/environment` (three). The file lives at `frontend/src/app/environments/environment.ts`; the three-level path resolves to `frontend/src/environments/` which does not exist.                                                                                                                                                |
| S1  | 🔴       | The "echo-loop fix" in `scheduleBackendSync` does not actually prevent the echo. The current guard `if (!this.userInteracted && !this.hasAnyPreference()) return;` still schedules a PUT when the server returns real prefs (then `userInteracted = false && hasAnyPreference = true` → condition is `false` → does not return → debounced PUT fires). Fix: gate sync on `userInteracted` alone.                                                     |
| S2  | 🟠       | `pushToBackend`'s error handler sets `syncStateSignal = 'error'` but never disables `serverSyncEnabled`. A persistent non-401 failure (e.g. 500) would re-PUT on every interaction. Fix: set `serverSyncEnabled = false` in the error handler. The Phase-7 test description for "401 disables sync" is also reworded — the auth interceptor catches 401 and triggers refresh, so the store's error callback only fires on a non-recoverable failure. |
| S6  | 🟠       | Bootstrap uses `authService.checkSession()` in `app.config.ts:21`, NOT `AuthStore.loadMe()`. The previous plan wired `loadMe` only — that path is never called during bootstrap. The new wiring injects the call directly into `initializeApp`.                                                                                                                                                                                                      |
| S7  | 🟠       | `loadFromBackend` is not concurrency-safe. A second call before the first GET returns can let an older response overwrite newer state. Fix: add a `hydrationVersion` counter; older responses are ignored.                                                                                                                                                                                                                                           |
| S3  | 🟠       | `searchStrains` covers `name, enName, terpenes, originStrain` but the store's `extractIngredients` (`matching-engine.store.ts:285-289`) also reads `parent1, parent2` for genetics. The agent, following the system-context rule, would search a genetics that lives in `parent1` and get zero matches. Fix: add `parent1, parent2` to the LIKE list.                                                                                                |
| S8  | 🟠       | Auth-store wiring must call `loadFromBackend()` AFTER `this.user.set(res.result)` and BEFORE `this.router.navigate(['/'])` (so the HTTP fires before the new route renders with stale state). `resetForUserChange()` already calls `clearTimeout` for the debounce timer — no extra wiring needed.                                                                                                                                                   |
| S4  | 🟡       | `getForUser` currently returns the raw entity. The entity has a `user!: User` relation field; today it is `undefined` (no `relations: ['user']`), so JSON output is safe — but the convention in this module (`users.service.ts:14-43, 88-115`) is to map to a DTO inside the service for defense in depth. Fix: return `UserMatchingPreferenceResponseDto` from the service.                                                                        |
| M1  | 🟡       | Use `import type { RequestWithUser }` to match `auth.controller.ts:33` and prevent TS1272 if the backend ever enables `isolatedModules`.                                                                                                                                                                                                                                                                                                             |
| S10 | 🟡       | Combine `import { Like, Repository } from 'typeorm'` in `strain-hunter.service.ts` (existing import is `Repository` only).                                                                                                                                                                                                                                                                                                                           |
| S11 | 🟡       | Phase 7 backend tests for `UserPreferencesController` (if any are added) need to override `JwtAuthGuard` with a fake guard returning a mock `req.user`.                                                                                                                                                                                                                                                                                              |
| N9  | 🟢       | Phase 8 / Definition of Done now include `app.config.ts` updated to call `loadFromBackend()` on session restore.                                                                                                                                                                                                                                                                                                                                     |

## Architecture Decisions

| Decision                                                                 | Rationale                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Entity lives in `users/entities/` (not `llm-provider`)                   | It belongs to the User domain.                                                   |
| Repository access only inside services                                   | Porat NestJS convention.                                                         |
| Identity from `req.user.sub` (JWT), never a client-supplied id           | Prevents IDOR; a user can only read/write their own prefs.                       |
| `preferences`/`weights` stored as JSON strings in `text` columns         | Matches the store's in-memory shape; no migration when the shape evolves.        |
| Debounced PUT (1.2s) from the client                                     | Users cycle chips quickly; avoids flooding the server.                           |
| localStorage stays as instant-load cache + offline fallback              | Server is source of truth once hydrated; localStorage keeps first paint instant. |
| Sync guards: `hydratedFromServer`, `userInteracted`, `serverSyncEnabled`, `hydrationVersion` | Prevent echo loop, hydration race, stale-response overwrite, and 401 spam.            |
| `searchStrains` is NOT a render card (no render-spec mapping)            | It is an input to the agent's reasoning, not a data-display card.                |
| No new backend enum                                                      | `PrefState`/`SyncState` are frontend-only string unions.                         |
| No seed needed                                                           | Rows are created lazily on first PUT.                                            |

## Phases

---

### Phase 0 — Pre-flight & Baseline

**Owner:** primary agent

**Steps**

1. Read `documents/HANDOFF.md`, `documents/STATUS.md`, and this plan.
2. Confirm the baseline builds/tests pass **before** touching code:
   - Backend: `npm.cmd run build` from `backend`; `npm run test -w backend`.
   - Frontend: `npx ng build` from `frontend`; `npx ng test --watch=false`.
3. Record the documented pre-existing failures so new failures are attributable.

**Checklist**

- [ ] Baseline backend build green
- [ ] Baseline frontend build green (only pre-existing warnings)
- [ ] Pre-existing test failures documented before starting

---

### Phase 1 — Backend: Entity + DTOs

**Owner:** subagent: backend-nest

**Steps**

1. Create `backend/src/modules/users/entities/user-matching-preference.entity.ts`.
2. Create `backend/src/modules/users/dto/update-preferences.dto.ts`.
3. Create `backend/src/modules/users/dto/user-matching-preference-response.dto.ts`.
4. Create `backend/src/modules/users/dto/user-preferences-result-response.dto.ts`.

(Full file contents in the "Full File Listings" section.)

**Checklist**

- [ ] JSDoc class block on the entity describing the table and its role
- [ ] `@ApiProperty` with `description` + `example` on every entity column
- [ ] `@OneToOne(() => User, { onDelete: 'CASCADE' })` + `@JoinColumn({ name: 'user_id' })`; `userId` column also mapped to `user_id`
- [ ] `update-preferences.dto.ts` uses `@IsString() @IsNotEmpty() @IsJSON() @MaxLength(65535)` on both fields
- [ ] Response DTOs mirror the `user-result-response.dto.ts` naming/shape
- [ ] Single quotes + project TS style throughout
- [ ] **Boot the backend once** (not just `npm run build`) to confirm the table auto-creates with the `user_id` column and no duplicate-index surprises from the dual `@Column` + `@JoinColumn` mapping

**Verify:** `npm.cmd run build` from `backend` passes AND a backend boot creates the `user_matching_preferences` table.

---

### Phase 2 — Backend: Service + Controller + Module

**Owner:** subagent: backend-nest

**Steps**

1. Create `backend/src/modules/users/user-preferences.service.ts` — repository injection + `getForUser` / `upsertForUser`.
2. Create `backend/src/modules/users/user-preferences.controller.ts` — delegates to the service, full Swagger, class-level JSDoc.
3. Update `backend/src/modules/users/users.module.ts`:
   - `TypeOrmModule.forFeature([User, UserMatchingPreference])`
   - `controllers: [UsersController, UserPreferencesController]`
   - `providers: [UsersService, UserPreferencesService]`
   - keep `exports: [UsersService]` (the new service is module-internal)

**Checklist**

- [ ] No `@InjectRepository` in the controller — only in the service
- [ ] `@UseGuards(JwtAuthGuard)` on the controller class
- [ ] Both handlers read `req.user?.sub` and throw `UnauthorizedException` when missing
- [ ] Controller has `@ApiTags`, `@ApiBearerAuth()`, `@ApiOperation` (with `summaryHe` + `toolIcon`), `@ApiOkResponse` typed with the response DTO, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiInternalServerErrorResponse`
- [ ] Controller base path is `me/preferences` (NOT `users/preferences` — would be shadowed by `UsersController.getById(':id')`)
- [ ] `import type { RequestWithUser }` used in the controller (matches `auth.controller.ts`)
- [ ] Service returns `UserMatchingPreferenceResponseDto` (NOT the raw entity) — entity→DTO mapping in the service
- [ ] `GET` returns `ServiceResultContainer<UserMatchingPreferenceResponseDto | null>` (null when no row yet)
- [ ] `PUT` upserts (find → create if missing → set fields → save) and returns the saved row as a DTO
- [ ] Service public methods have JSDoc (params / returns / throws)

**Verify:** `npm.cmd run build` from `backend` passes.

---

### Phase 3 — Backend: Strain search tool

**Owner:** subagent: backend-nest

**Steps**

1. Add `searchStrains(query, limit)` + `escapeLike()` to `strain-hunter.service.ts` — reuses the already-injected `strainRepository`.
2. Add `GET /strain-hunter/search` to `strain-hunter.controller.ts` — delegates to the service.
3. Create `backend/src/modules/strain-hunter/dto/strain-search-result-response.dto.ts`.

**Checklist**

- [ ] `limit` clamped to `1..25` (default `10`), NaN rejected via `Number.isFinite`
- [ ] `escapeLike()` escapes `\`, `%`, `_` before building `Like()` patterns
- [ ] Empty/whitespace `query` returns the first `limit` rows (agent can browse without a term)
- [ ] Search covers `name`, `enName`, `terpenes`, `originStrain`, `parent1`, `parent2` (the store's `extractIngredients` reads the same six columns for genetics)
- [ ] Endpoint returns `ServiceResultContainer<StrainDto[]>` (reuses the existing `StrainDto`)
- [ ] No repo injection added to the controller
- [ ] `Like` combined with the existing `Repository` import in the service file
- [ ] Full Swagger decorators + `summaryHe` + `toolIcon` on the new endpoint

**Verify:** `npm.cmd run build` from `backend` passes.

---

### Phase 4 — Agent integration: system context

**Owner:** subagent: backend-agent

**Steps**

1. Update `backend/src/modules/admin-agent/constants/system-context.constant.ts` — append the `STRAIN RECOMMENDATION RULE` block (full text in the listings section).
2. Do NOT add the preferences/search tools to the `VISUAL RESPONSE RULE` list — they are not render cards.

**Checklist**

- [ ] RULE names both tools by their exact Swagger names (`UserPreferencesController_getPreferences`, `StrainHunterController_searchStrains`)
- [ ] RULE instructs: read prefs first → if none, say so and point to the Strain Hunter page → search by top loved/liked terpene/genetics → never recommend an `avoid` ingredient → prefer the higher-weighted category → recommend ≤ 3 with a short reason
- [ ] RULE forbids fabricating terpene/genetics data and repeating identical tool calls
- [ ] No render-spec mapping added for the new tools

**Verify:** `npm.cmd run build` from `backend` passes.

---

### Phase 5 — Frontend: UserPreferencesService

**Owner:** subagent: frontend-ng

**Steps**

1. Create `frontend/src/app/core/services/user-preferences.service.ts` (full file in the listings section).

**Checklist**

- [ ] `@Injectable({ providedIn: 'root' })` + `inject(HttpClient)` (no constructor injection)
- [ ] Base URL from `environment.apiUrl` → `${environment.apiUrl}/me/preferences` (matches the backend controller base path)
- [ ] `import { environment } from '../../environments/environment';` — TWO levels, not three. The file lives at `frontend/src/app/environments/environment.ts`.
- [ ] Responses typed as `ServiceResultContainer<IUserPreferences | null>` / `ServiceResultContainer<IUserPreferences>`
- [ ] No manual `withCredentials` (interceptor handles it)
- [ ] Single quotes + 4-space indent, project style

**Verify:** `npx ng build` from `frontend` passes.

---

### Phase 6 — Frontend: MatchingEngineStore sync

**Owner:** subagent: frontend-ng

**Steps**

1. Rewrite `frontend/src/app/core/store/matching-engine.store.ts` (full file in the listings section) with:
   - `syncState` signal (`'idle' | 'saving' | 'saved' | 'error'`)
   - `hydratedFromServer` + `userInteracted` + `serverSyncEnabled` guards
   - `hydrationVersion` counter to ignore stale responses from earlier calls
   - debounced `pushToBackend()` (1.2s) using `DestroyRef` (safe from timer callbacks)
   - fixed mojibake `'לא ידוע'`
   - **constructor does NOT call `loadFromBackend()`** — see Auth wiring below
2. Wire auth lifecycle in `frontend/src/app/core/store/auth.store.ts`:
   - on login success → `matchingEngineStore.loadFromBackend()` (after `user.set`, before `router.navigate`)
   - on logout (both success and error) → `matchingEngineStore.resetForUserChange()` (after `user.set(null)`, before `router.navigate`)
3. Wire bootstrap session restore in `frontend/src/app/app.config.ts`:
   - add `MatchingEngineStore` to `initializeApp` deps
   - on `checkSession` returning a user → `matchingEngineStore.loadFromBackend()`

**Checklist**

- [ ] No echo loop: scheduleBackendSync guards on `userInteracted` alone (NOT `!hasAnyPreference()`)
- [ ] No race: server hydration never overwrites `userInteracted` edits
- [ ] No concurrency bug: `hydrationVersion` discards stale responses from earlier `loadFromBackend` calls
- [ ] Constructor does NOT call `loadFromBackend` (would 401 at APP_INITIALIZER time)
- [ ] PUT error path also sets `serverSyncEnabled = false` (not just `syncState = 'error'`)
- [ ] 401/error path disables server sync → localStorage-only mode
- [ ] `loadFromBackend()` re-enables sync on every call (login retry)
- [ ] `resetForUserChange()` clears state + resets all guards (user switch)
- [ ] All scoring logic (`calculateScore`, `topScored`, `scoreCategory`, `extractIngredients`, `stripTerpeneParens`) preserved unchanged
- [ ] `Hebrew` mojibake scan clean on the rewritten file
- [ ] `auth.store.ts` wiring present for login + logout, in the correct order
- [ ] `app.config.ts` updated to call `loadFromBackend()` on `checkSession` success

**Verify:** `npx ng build` from `frontend` passes.

---

### Phase 7 — Tests

**Owner:** subagent: backend-tests + subagent: frontend-tests

**Steps**

1. Backend — `backend/src/modules/users/user-preferences.service.spec.ts`:
   - `getForUser` returns the DTO for the given user id
   - `getForUser` returns null when no row exists
   - `upsertForUser` creates when no row exists
   - `upsertForUser` updates the existing row (preferences + weights) and preserves `createdAt`
2. Backend — `backend/src/modules/users/user-preferences.controller.spec.ts` (if added):
   - override `JwtAuthGuard` with `{ canActivate: () => true }` so tests do not need a real token
   - mock `req.user = { sub: 1 }` via a custom guard return value
3. Backend — `backend/src/modules/strain-hunter/strain-hunter.service.spec.ts` additions:
   - search filters by name/enName/terpenes/originStrain/parent1/parent2
   - empty query returns `limit` first rows
   - `limit` is clamped to 1..25
   - `%` / `_` in the query are escaped (no wildcard injection)
4. Frontend — `frontend/src/app/core/store/matching-engine.store.spec.ts`:
   - hydration from server populates prefs/weights
   - hydration does NOT fire a PUT (no echo) — guard on `userInteracted` alone
   - user edit during in-flight hydration wins (race guard via `userInteracted`)
   - **a second `loadFromBackend()` while the first is in flight discards the older response** (hydrationVersion)
   - debounce fires a single PUT for rapid chip cycling (fake timers)
   - non-recoverable error (e.g. 500 after the auth interceptor gave up) disables sync
   - PUT error path also sets `serverSyncEnabled = false`
   - `resetForUserChange()` clears state + resets guards + bumps hydrationVersion
   - constructor does NOT call `loadFromBackend` (no HTTP at construction time)

**Checklist**

- [ ] Backend service spec covers create + update + get + DTO mapping
- [ ] Controller spec (if added) overrides `JwtAuthGuard` with a fake guard
- [ ] Strain search spec covers filter (incl. parent1/parent2), clamp, escape, empty-query
- [ ] Frontend store spec covers echo, race, debounce, non-recoverable error, reset, version flag
- [ ] No test uses real network — `HttpClientTestingModule` / fake service
- [ ] Hebrew messages in frontend tests only where the store surfaces them
- [ ] "401 disables sync" test reworded to "non-recoverable error disables sync" — the auth interceptor catches 401 first, so the store's error callback only fires on a terminal failure

**Verify:** `npm run test -w backend` (backend); `npx ng test --watch=false` (frontend).

---

### Phase 8 — Verification, architecture diagram, session docs

**Owner:** primary agent (integrates and reviews all subagent diffs)

**Steps**

1. Review each subagent diff (blame/review pass) before integration.
2. Run full verification:
   - Backend: `npm.cmd run build`; `npm run test -w backend`.
   - Frontend: `npx ng build`; `npx ng test --watch=false`.
3. Mojibake scan on every touched file containing Hebrew:
   `rg -n "׳|ג€�|ג†|ג€|�" <touched files>`
4. Update `documents/architecture-diagram.md`:
   - add `user_matching_preferences` entity + `UserPreferencesController` (GET/PUT `me/preferences`)
   - add `StrainHunterController_searchStrains` tool
   - add frontend edge: `MatchingEngineStore → UserPreferencesService → API` (debounced sync)
   - add agent tool edges for the two new tools
5. Update `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md`.
6. Cold-boot smoke: load the app with a valid session, confirm `loadFromBackend` runs and prefs/weights hydrate; then load with no session and confirm NO redirect to /login fires from the matching-engine store.

**Checklist**

- [ ] All subagent diffs reviewed and integrated
- [ ] Backend build + tests green
- [ ] Frontend build + tests green
- [ ] Mojibake scan clean on touched Hebrew files
- [ ] `documents/architecture-diagram.md` updated
- [ ] `documents/HANDOFF.md`, `documents/STATUS.md`, `documents/LOG.md` updated
- [ ] `app.config.ts` updated to call `loadFromBackend()` on session restore (S5, S6)
- [ ] Manual smoke (live server + JWT): set a chip in Strain Hunter → row upserts; ask the chat agent for a strain recommendation → it reads prefs + searches strains
- [ ] Cold-boot smoke: logged-in user → prefs hydrated; logged-out user → no /login redirect from matching-engine store

---

## Out of Scope (explicitly rejected)

- Render-spec/visual card for `searchStrains` (input to reasoning, not a display card)
- Real-time cross-device sync (polling/websockets) — next session only if requested
- Preference merge strategy on conflict (v1: hydration wins unless user interacted)
- Deleting the preferences row via API (v1: `reset()` PUTs empty JSON instead)
- Server-side validation of the preference JSON schema beyond `IsJSON`

## Definition of Done

- [ ] Every requirement in the "Goal" section is satisfied and verified
- [ ] Backend + frontend builds and tests pass (only pre-existing warnings/failures)
- [ ] Both new endpoints exposed in Swagger as tools with full decorators
- [ ] `system-context.constant.ts` teaches the agent the recommendation workflow
- [ ] `MatchingEngineStore` syncs debounced to the server with no echo / race / concurrency / cold-boot bugs
- [ ] `app.config.ts` updated to call `loadFromBackend()` on session restore
- [ ] Architecture diagram and session docs updated

---

## Full File Listings

### Backend — Entity

`backend/src/modules/users/entities/user-matching-preference.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "./user.entity";

/**
 * One-to-one per-user row holding the matching-engine preferences and
 * category weights as JSON strings. The preferences and weights column shapes
 * mirror the frontend MatchingEngineStore PersistedShape so the row can be
 * serialized/deserialized without a schema.
 */
@Entity("user_matching_preferences")
export class UserMatchingPreference {
  @ApiProperty({ description: "Unique primary key for user preferences.", example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({
    description: "Owning user id. Unique - one preferences row per user.",
    example: 1,
  })
  @Column({ name: "user_id", unique: true })
  userId!: number;

  @ApiProperty({
    description: "Owning user. Deleting the user deletes this row (CASCADE).",
    type: () => User,
  })
  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ApiProperty({
    description:
      'Serialized JSON string mapping preference keys to state values, e.g. {"terpene:Myrcene":"love","genetics:Sour Dubb":"avoid"}.',
    example: '{"terpene:Myrcene":"love","genetics:Sour Dubb":"avoid"}',
    required: false,
  })
  @Column({ type: "text", nullable: true })
  preferences!: string | null;

  @ApiProperty({
    description:
      'Serialized JSON string specifying category weights, e.g. {"terpene":60,"genetics":40}.',
    example: '{"terpene":60,"genetics":40}',
    required: false,
  })
  @Column({ type: "text", nullable: true })
  weights!: string | null;

  @ApiProperty({
    description: "Row creation timestamp.",
    example: "2026-07-31T08:00:00.000Z",
  })
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ApiProperty({
    description: "Last update timestamp.",
    example: "2026-07-31T09:00:00.000Z",
  })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
```

### Backend — Update DTO

`backend/src/modules/users/dto/update-preferences.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsJSON, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdatePreferencesDto {
  @ApiProperty({
    description:
      'JSON serialized string mapping preference keys to state values, e.g. {"terpene:Myrcene":"love"}. Must be valid JSON.',
    example: '{"terpene:Myrcene":"love","genetics:Sour Dubb":"avoid"}',
  })
  @IsString()
  @IsNotEmpty({ message: "preferences must not be empty" })
  @IsJSON({ message: "preferences must be a valid JSON string" })
  @MaxLength(65535, { message: "preferences must not exceed 65535 characters" })
  preferences!: string;

  @ApiProperty({
    description:
      'JSON serialized string specifying category weights, e.g. {"terpene":60,"genetics":40}. Must be valid JSON.',
    example: '{"terpene":60,"genetics":40}',
  })
  @IsString()
  @IsNotEmpty({ message: "weights must not be empty" })
  @IsJSON({ message: "weights must be a valid JSON string" })
  @MaxLength(65535, { message: "weights must not exceed 65535 characters" })
  weights!: string;
}
```

### Backend — Response DTOs

`backend/src/modules/users/dto/user-matching-preference-response.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class UserMatchingPreferenceResponseDto {
  @ApiProperty({ description: "Unique primary key for user preferences.", example: 1 })
  id!: number;

  @ApiProperty({ description: "Owning user id.", example: 1 })
  userId!: number;

  @ApiProperty({
    description: "Serialized JSON preferences map, or null when never saved.",
    example: '{"terpene:Myrcene":"love"}',
    required: false,
  })
  preferences!: string | null;

  @ApiProperty({
    description: "Serialized JSON weights, or null when never saved.",
    example: '{"terpene":60,"genetics":40}',
    required: false,
  })
  weights!: string | null;

  @ApiProperty({
    description: "Row creation timestamp.",
    example: "2026-07-31T08:00:00.000Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Last update timestamp.",
    example: "2026-07-31T09:00:00.000Z",
  })
  updatedAt!: Date;
}
```

`backend/src/modules/users/dto/user-preferences-result-response.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { UserMatchingPreferenceResponseDto } from "./user-matching-preference-response.dto";

export class UserPreferencesResultResponseDto {
  @ApiProperty({ description: "Whether the request succeeded.", example: true })
  success!: boolean;

  @ApiProperty({
    description: "Human-readable result message.",
    example: "User matching preferences retrieved successfully",
  })
  message!: string;

  @ApiProperty({
    description:
      "The preferences row for the authenticated user, or null when none exists yet.",
    type: UserMatchingPreferenceResponseDto,
    required: false,
  })
  result!: UserMatchingPreferenceResponseDto | null;
}
```

### Backend — Service

`backend/src/modules/users/user-preferences.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserMatchingPreference } from "./entities/user-matching-preference.entity";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UserMatchingPreferenceResponseDto } from "./dto/user-matching-preference-response.dto";

/**
 * Data access layer for per-user matching preferences. All repository access
 * for the user_matching_preferences table lives here - controllers only
 * delegate. The service maps entities to response DTOs to guarantee the
 * response shape is independent of any future `relations` additions on the
 * repository query (defense in depth - same pattern as UsersService).
 */
@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserMatchingPreference)
    private readonly preferencesRepo: Repository<UserMatchingPreference>,
  ) {}

  /**
   * Fetches the preferences row for a user and maps it to a DTO.
   * @param userId - the numeric user id (from the JWT `sub`).
   * @returns the DTO or null when the user never saved preferences.
   */
  async getForUser(userId: number): Promise<UserMatchingPreferenceResponseDto | null> {
    const row = await this.preferencesRepo.findOne({ where: { userId } });
    return row ? this.toResponseDto(row) : null;
  }

  /**
   * Creates or updates the preferences row for a user and returns the DTO.
   * @param userId - the numeric user id (from the JWT `sub`).
   * @param dto - validated preferences/weights JSON strings.
   * @returns the saved row as a DTO.
   */
  async upsertForUser(
    userId: number,
    dto: UpdatePreferencesDto,
  ): Promise<UserMatchingPreferenceResponseDto> {
    let preference = await this.preferencesRepo.findOne({ where: { userId } });

    if (!preference) {
      preference = this.preferencesRepo.create({ userId });
    }

    preference.preferences = dto.preferences;
    preference.weights = dto.weights;

    const saved = await this.preferencesRepo.save(preference);
    return this.toResponseDto(saved);
  }

  private toResponseDto(row: UserMatchingPreference): UserMatchingPreferenceResponseDto {
    return {
      id: row.id,
      userId: row.userId,
      preferences: row.preferences,
      weights: row.weights,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
```

### Backend — Controller

`backend/src/modules/users/user-preferences.controller.ts`

```typescript
import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import type { RequestWithUser } from "../../core/interfaces/request-with-user.interface";
import { CustomApiOperationOptions } from "../../core/types/custom-api-operation-options.type";
import { ServiceResultContainer } from "../../core/models/service-result-container.model";
import { UserPreferencesService } from "./user-preferences.service";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UserMatchingPreferenceResponseDto } from "./dto/user-matching-preference-response.dto";
import { UserPreferencesResultResponseDto } from "./dto/user-preferences-result-response.dto";

/**
 * Per-user matching preferences.
 * Base path: /me/preferences
 * Endpoints:
 * - GET /me/preferences - fetch the current user's preferences (null when never saved)
 * - PUT /me/preferences - create or update the current user's preferences
 * The user identity always comes from the JWT (req.user.sub) - never from a body/query param (IDOR protection).
 *
 * Why /me/preferences and not /users/preferences: UsersController declares @Get(':id') with ParseIntPipe
 * (users.controller.ts:90). A literal /users/preferences path would be shadowed by the parametric :id
 * route (NestJS matches in registration order) and rejected by ParseIntPipe as 400. /me/preferences
 * is outside the /users namespace, so no cross-controller ordering risk.
 */
@ApiTags("user-preferences")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("me/preferences")
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  /**
   * Fetches the authenticated user's matching preferences and weights.
   * Returns a result of null when the user never saved preferences - the client
   * should keep its local defaults in that case.
   */
  @Get()
  @ApiOperation({
    summary: "Get matching preferences for the current user",
    summaryHe: "שולף את העדפות ההתאמה האישית של המשתמש המחובר",
    toolIcon: "ph-sliders",
    description:
      "Fetches the matching-engine preferences and category weights of the authenticated user (identity from the JWT). " +
      "Returns a null result when the user never saved preferences - treat it as defaults.",
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: "ServiceResultContainer with the preferences row or null.",
    type: UserPreferencesResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing or expired JWT token." })
  @ApiForbiddenResponse({ description: "Not applicable for this endpoint." })
  @ApiNotFoundResponse({
    description: "Not applicable - a missing row returns a null result instead.",
  })
  @ApiInternalServerErrorResponse({ description: "Unexpected server error." })
  async getPreferences(
    @Req() req: RequestWithUser,
  ): Promise<ServiceResultContainer<UserMatchingPreferenceResponseDto | null>> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException("User not authenticated");
    }

    const result = await this.userPreferencesService.getForUser(userId);

    return {
      success: true,
      message: "User matching preferences retrieved successfully",
      result,
    };
  }

  /**
   * Creates or updates the authenticated user's matching preferences.
   * Upserts the single row keyed by the JWT user id.
   */
  @Put()
  @ApiOperation({
    summary: "Update matching preferences for the current user",
    summaryHe: "מעדכן את העדפות ההתאמה האישית של המשתמש המחובר",
    toolIcon: "ph-sliders",
    description:
      "Creates or updates the matching-engine preferences and category weights of the authenticated user (identity from the JWT). " +
      "Both fields are JSON strings and must be valid JSON.",
  } as CustomApiOperationOptions)
  @ApiBody({
    type: UpdatePreferencesDto,
    description:
      'Example: { "preferences": "{\\"terpene:Myrcene\\":\\"love\\"}", "weights": "{\\"terpene\\":60,\\"genetics\\":40}" }',
  })
  @ApiOkResponse({
    description: "ServiceResultContainer with the saved preferences row.",
    type: UserPreferencesResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing or expired JWT token." })
  @ApiForbiddenResponse({ description: "Not applicable for this endpoint." })
  @ApiNotFoundResponse({ description: "Not applicable for this endpoint." })
  @ApiInternalServerErrorResponse({ description: "Unexpected server error." })
  async updatePreferences(
    @Req() req: RequestWithUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<ServiceResultContainer<UserMatchingPreferenceResponseDto>> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException("User not authenticated");
    }

    const result = await this.userPreferencesService.upsertForUser(userId, dto);

    return {
      success: true,
      message: "User matching preferences updated successfully",
      result,
    };
  }
}
```

### Backend — Module

`backend/src/modules/users/users.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { UserMatchingPreference } from "./entities/user-matching-preference.entity";
import { UsersController } from "./users.controller";
import { UserPreferencesController } from "./user-preferences.controller";
import { UsersService } from "./users.service";
import { UserPreferencesService } from "./user-preferences.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserMatchingPreference]), AuthModule],
  controllers: [UsersController, UserPreferencesController],
  providers: [UsersService, UserPreferencesService],
  exports: [UsersService],
})
export class UsersModule {}
```

### Backend — Strain search (service methods)

Add to `backend/src/modules/strain-hunter/strain-hunter.service.ts` (the repository is already injected):

```typescript
import { Like, Repository } from 'typeorm';

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 25;

/**
 * Lightweight strain search for the AI agent. Searches name/enName/terpenes/
 * originStrain/parent1/parent2 with a LIKE filter and returns at most `limit`
 * rows so the agent can recommend strains without blowing up its token context.
 *
 * Note: parent1/parent2 are searched because the frontend MatchingEngineStore's
 * extractIngredients (matching-engine.store.ts:285-289) treats them as genetics
 * inputs. Without this, the agent cannot find strains matching a genetics
 * preference that lives only in the parent1/parent2 columns.
 * @param query - optional free-text term; empty returns the first `limit` rows.
 * @param limit - max rows, clamped to 1..25 (default 10).
 * @returns matching Strain entities.
 */
async searchStrains(query = '', limit = DEFAULT_SEARCH_LIMIT): Promise<Strain[]> {
  const parsedLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Math.floor(Number(limit)), 1), MAX_SEARCH_LIMIT)
    : DEFAULT_SEARCH_LIMIT;
  const searchTerm = this.escapeLike(query.trim());

  const where = searchTerm
    ? [
        { name: Like(`%${searchTerm}%`) },
        { enName: Like(`%${searchTerm}%`) },
        { terpenes: Like(`%${searchTerm}%`) },
        { originStrain: Like(`%${searchTerm}%`) },
        { parent1: Like(`%${searchTerm}%`) },
        { parent2: Like(`%${searchTerm}%`) },
      ]
    : undefined;

  return this.strainRepository.find({ where, take: parsedLimit });
}

/**
 * Escapes MySQL LIKE wildcards so user input is matched literally.
 */
private escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
```

### Backend — Strain search (controller endpoint)

Add to `backend/src/modules/strain-hunter/strain-hunter.controller.ts` (delegates to the service — no repo injection):

```typescript
@Get('search')
@UseGuards(JwtAuthGuard)
@ApiOperation({
  summary: 'Search and filter strains for the AI agent recommendations',
  summaryHe: 'חיפוש וסינון זנים ממוקד עבור המלצות סוכן ה-AI',
  toolIcon: 'ph-magnifying-glass',
  description:
    'Returns a lightweight, filtered list of strains (max 25) so the agent can recommend strains from the ' +
    'user\'s matching preferences without exceeding the LLM token context. Searches Hebrew name, English name, ' +
    'terpenes, origin strain, and parent strains. Empty query returns the first rows for browsing.',
} as CustomApiOperationOptions)
@ApiQuery({
  name: 'query',
  required: false,
  type: String,
  description: 'Free-text term matching name, English name, terpenes, origin strain, or parent strains.',
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Max number of results (1-25, default 10).',
})
@ApiOkResponse({
  description: 'ServiceResultContainer with the matching strain items.',
  type: StrainSearchResultResponseDto,
})
@ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
@ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
async searchStrains(
  @Query('query') query?: string,
  @Query('limit') limit?: string,
): Promise<ServiceResultContainer<StrainDto[]>> {
  const items = await this.strainHunterService.searchStrains(query ?? '', Number(limit));

  return {
    success: true,
    message: 'Strains retrieved successfully',
    result: items,
  };
}
```

Imports to add in the controller file: `StrainSearchResultResponseDto` (DTO), `ServiceResultContainer` (`../../core/models/service-result-container.model`), `StrainDto` (`./dto/strain-hunter-fetch-response.dto`).

### Backend — Strain search response DTO

`backend/src/modules/strain-hunter/dto/strain-search-result-response.dto.ts`

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { StrainDto } from "./strain-hunter-fetch-response.dto";

export class StrainSearchResultResponseDto {
  @ApiProperty({ description: "Whether the request succeeded.", example: true })
  success!: boolean;

  @ApiProperty({
    description: "Human-readable result message.",
    example: "Strains retrieved successfully",
  })
  message!: string;

  @ApiProperty({
    description: "Matching strain items (at most the requested limit).",
    type: [StrainDto],
  })
  result!: StrainDto[];
}
```

### Agent integration — system context block

Append to `backend/src/modules/admin-agent/constants/system-context.constant.ts` (inside `SYSTEM_CONTEXT_BASE`, before the closing backtick):

```text
STRAIN RECOMMENDATION RULE:
- When the user asks which strains fit them ("איזה זנים הכי מתאימים לי", "recommend strains", etc.):
  1. Call "UserPreferencesController_getPreferences" to read the user's saved terpene/genetics likes, loves, and avoids, and the terpene/genetics weight split.
  2. If the tool returns a null result or an empty preference map, tell the user they have no saved preferences and suggest setting them in the Strain Hunter page - do NOT guess.
  3. Otherwise call "StrainHunterController_searchStrains" once per distinct top preferred ingredient (loved/liked terpenes and genetics, up to 3 calls). Never call it twice with the same arguments in one turn.
  4. Recommend at most 3 strains that contain loved/liked terpenes or genetics. NEVER recommend a strain that contains an "avoid" ingredient (it carries a 30-point penalty in the matching engine).
  5. Prefer the category with the higher weight (terpene vs genetics) when choosing between two matches.
  6. Keep each recommendation short: strain name, why it matches (which terpenes/genetics), and the penalty if one applies. Never fabricate terpene or genetics data - only repeat what the search tool returned.
```

### Frontend — Service

`frontend/src/app/core/services/user-preferences.service.ts`

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { ServiceResultContainer } from "../models/service-result-container.model";

export interface IUserPreferences {
  id: number;
  userId: number;
  preferences: string | null;
  weights: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: "root" })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me/preferences`;

  public getPreferences(): Observable<ServiceResultContainer<IUserPreferences | null>> {
    return this.http.get<ServiceResultContainer<IUserPreferences | null>>(this.baseUrl);
  }

  public updatePreferences(payload: {
    preferences: string;
    weights: string;
  }): Observable<ServiceResultContainer<IUserPreferences>> {
    return this.http.put<ServiceResultContainer<IUserPreferences>>(this.baseUrl, payload);
  }
}
```

### Frontend — MatchingEngineStore (rewritten)

`frontend/src/app/core/store/matching-engine.store.ts`

```typescript
import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UserPreferencesService } from "../services/user-preferences.service";

export type PrefState = "neutral" | "like" | "love" | "avoid";

export type PrefMap = Record<string, PrefState>;

export type Weights = {
  terpene: number;
  genetics: number;
};

export type SyncState = "idle" | "saving" | "saved" | "error";

export type ScoreBreakdown = {
  terpene: {
    weight: number;
    earnedPoints: number;
    maxPoints: number;
    hits: string[];
    misses: string[];
  };
  genetics: {
    weight: number;
    /** For genetics (OR logic): true if at least one preferred genetics was found */
    hasMatch: boolean;
    /** All preferred genetics (for display) */
    preferred: string[];
    /** Genetics found in the strain */
    hits: string[];
  };
  penalty: boolean;
  penaltyIngredient: string | null;
};

export type ScoredStrain<T = Record<string, unknown>> = T & {
  score: number;
  penalty: boolean;
  penaltyIngredient: string | null;
  breakdown: ScoreBreakdown;
};

const STORAGE_KEY = "matching-engine:v1";

const PREF_STATES: PrefState[] = ["neutral", "like", "love", "avoid"];

const DEFAULT_WEIGHTS: Weights = {
  terpene: 60,
  genetics: 40,
};

const SYNC_DEBOUNCE_MS = 1200;

type PersistedShape = {
  prefs: PrefMap;
  weights: Weights;
};

@Injectable({ providedIn: "root" })
export class MatchingEngineStore {
  private readonly userPrefsService = inject(UserPreferencesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly prefsState = signal<PrefMap>({});
  private readonly weightsState = signal<Weights>({ ...DEFAULT_WEIGHTS });
  private readonly syncStateSignal = signal<SyncState>("idle");

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private hydratedFromServer = false;
  private userInteracted = false;
  private serverSyncEnabled = true;
  private hydrationVersion = 0;

  public readonly prefs = this.prefsState.asReadonly();
  public readonly weights = this.weightsState.asReadonly();
  public readonly syncState = this.syncStateSignal.asReadonly();

  public readonly hasAnyPreference = computed(() => {
    const prefs = this.prefsState();
    return Object.values(prefs).some((state) => state !== "neutral");
  });

  constructor() {
    this.hydrateFromLocalStorage();

    effect(() => {
      const snapshot: PersistedShape = {
        prefs: this.prefsState(),
        weights: this.weightsState(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Storage unavailable
      }

      this.scheduleBackendSync();
    });
  }

  /**
   * Loads the preferences for the currently authenticated user from the server.
   * Safe to call again after login/logout (re-enables server sync). Server data
   * never overwrites edits the user made while the request was in flight.
   *
   * NOT called from the constructor on purpose: at APP_INITIALIZER time the
   * session is not yet restored, so an HTTP GET would 401 and the auth
   * interceptor's refresh-fail path would force a redirect to /login on every
   * cold boot. The bootstrap path (app.config.ts -> initializeApp) and the
   * login() success path call this explicitly.
   */
  public loadFromBackend(): void {
    this.serverSyncEnabled = true;
    this.hydratedFromServer = false;
    const currentVersion = ++this.hydrationVersion;

    this.userPrefsService
      .getPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          // A newer loadFromBackend() call started after this one - drop this
          // response to prevent stale data from overwriting newer state.
          if (currentVersion !== this.hydrationVersion) {
            return;
          }
          this.hydratedFromServer = true;
          if (!res.success || !res.result || this.userInteracted) {
            return;
          }
          try {
            const prefs = res.result.preferences
              ? JSON.parse(res.result.preferences)
              : {};
            const weights = res.result.weights ? JSON.parse(res.result.weights) : null;
            this.prefsState.set(prefs);
            if (weights) {
              this.weightsState.set(weights);
            }
          } catch {
            // Parse failed, fallback silently
          }
        },
        error: () => {
          // Non-recoverable failure (network or refresh already attempted by
          // the auth interceptor and failed). Degrade to localStorage-only
          // mode so we don't keep hammering the server.
          if (currentVersion !== this.hydrationVersion) {
            return;
          }
          this.hydratedFromServer = true;
          this.serverSyncEnabled = false;
          this.syncStateSignal.set("idle");
        },
      });
  }

  /**
   * Clears the in-memory + localStorage state and resets all sync guards.
   * Call on logout so one user's preferences never leak to the next user.
   */
  public resetForUserChange(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.prefsState.set({});
    this.weightsState.set({ ...DEFAULT_WEIGHTS });
    this.syncStateSignal.set("idle");
    this.hydratedFromServer = false;
    this.userInteracted = false;
    this.serverSyncEnabled = true;
    this.hydrationVersion++;
  }

  public cyclePref(key: string): void {
    const trimmed = key.trim();
    if (!trimmed) {
      return;
    }
    this.userInteracted = true;

    this.prefsState.update((prev) => {
      const current = prev[trimmed] ?? "neutral";
      const next = PREF_STATES[(PREF_STATES.indexOf(current) + 1) % PREF_STATES.length];
      const updated = { ...prev, [trimmed]: next };

      if (next === "neutral") {
        delete updated[trimmed];
      }

      return updated;
    });
  }

  public setPref(key: string, state: PrefState): void {
    const trimmed = key.trim();
    if (!trimmed) {
      return;
    }
    this.userInteracted = true;

    this.prefsState.update((prev) => {
      const updated = { ...prev, [trimmed]: state };

      if (state === "neutral") {
        delete updated[trimmed];
      }

      return updated;
    });
  }

  public setWeight(category: keyof Weights, value: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const otherCategory = category === "terpene" ? "genetics" : "terpene";

    this.userInteracted = true;

    this.weightsState.set({
      [category]: clamped,
      [otherCategory]: 100 - clamped,
    } as Weights);
  }

  public reset(): void {
    this.userInteracted = true;
    this.prefsState.set({});
    this.weightsState.set({ ...DEFAULT_WEIGHTS });
  }

  public prefState(key: string): PrefState {
    return this.prefsState()[key] ?? "neutral";
  }

  public calculateScore<T extends Record<string, unknown>>(item: T): ScoredStrain<T> {
    const prefs = this.prefsState();
    const weights = this.weightsState();

    // Terpenes: proportional scoring (more terpenes = better match)
    const terpeneData = this.scoreCategory(item, "terpene", prefs, "proportional");
    // Genetics: OR logic (at least one preferred genetics = full score)
    const geneticsData = this.scoreCategory(item, "genetics", prefs, "any");

    const activeTerpWeight = terpeneData.hasPositivePrefs ? weights.terpene : 0;
    const activeGenWeight = geneticsData.hasPositivePrefs ? weights.genetics : 0;
    const totalActiveWeight = activeTerpWeight + activeGenWeight;

    let weightedBaseScore = 100;

    if (totalActiveWeight > 0) {
      // Terpenes: proportional (0-100% based on how many matched)
      const terpScore =
        terpeneData.maxPoints > 0 ? terpeneData.earnedPoints / terpeneData.maxPoints : 0;
      // Genetics: binary (0% or 100% based on whether any matched)
      const genScore = geneticsData.hasMatch ? 1 : 0;

      weightedBaseScore =
        ((terpScore * activeTerpWeight + genScore * activeGenWeight) /
          totalActiveWeight) *
        100;
    }

    const penaltyIngredient =
      terpeneData.penaltyIngredient ?? geneticsData.penaltyIngredient;
    const penaltyDeduction = penaltyIngredient ? 30 : 0;

    const score = Math.max(
      0,
      Math.min(100, Math.round(weightedBaseScore - penaltyDeduction)),
    );

    const breakdown: ScoreBreakdown = {
      terpene: {
        weight: activeTerpWeight,
        earnedPoints: terpeneData.earnedPoints,
        maxPoints: terpeneData.maxPoints,
        hits: terpeneData.hits,
        misses: terpeneData.misses,
      },
      genetics: {
        weight: activeGenWeight,
        hasMatch: geneticsData.hasMatch,
        preferred: geneticsData.misses.concat(geneticsData.hits),
        hits: geneticsData.hits,
      },
      penalty: penaltyIngredient !== null,
      penaltyIngredient: penaltyIngredient,
    };

    return {
      ...item,
      score,
      penalty: penaltyIngredient !== null,
      penaltyIngredient,
      breakdown,
    };
  }

  public topScored<T extends Record<string, unknown>>(
    items: T[],
    limit = 5,
  ): ScoredStrain<T>[] {
    if (items.length === 0) {
      return [];
    }

    return [...items]
      .map((item) => this.calculateScore(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private scoreCategory(
    item: Record<string, unknown>,
    category: keyof Weights,
    prefs: PrefMap,
    matchMode: "proportional" | "any",
  ): {
    earnedPoints: number;
    maxPoints: number;
    hasPositivePrefs: boolean;
    hasMatch: boolean;
    penaltyIngredient: string | null;
    hits: string[];
    misses: string[];
  } {
    const ingredients = this.extractIngredients(item, category);

    let maxPoints = 0;
    let hasPositivePrefs = false;
    const desired: string[] = [];

    for (const [key, state] of Object.entries(prefs)) {
      if (key.startsWith(`${category}:`)) {
        const name = key.substring(category.length + 1);
        if (state === "love") {
          maxPoints += 2;
          hasPositivePrefs = true;
          desired.push(name);
        } else if (state === "like") {
          maxPoints += 1;
          hasPositivePrefs = true;
          desired.push(name);
        }
      }
    }

    let earnedPoints = 0;
    let penaltyIngredient: string | null = null;
    const hits: string[] = [];

    for (const name of ingredients) {
      const state = prefs[`${category}:${name}`];

      if (state === "love") {
        earnedPoints += 2;
        hits.push(name);
      } else if (state === "like") {
        earnedPoints += 1;
        hits.push(name);
      } else if (state === "avoid") {
        if (penaltyIngredient === null) {
          penaltyIngredient = name;
        }
      }
    }

    const misses = desired.filter((d) => {
      return !hits.includes(d);
    });

    const hasMatch = hits.length > 0;

    return {
      earnedPoints,
      maxPoints,
      hasPositivePrefs,
      hasMatch,
      penaltyIngredient,
      hits,
      misses,
    };
  }

  private extractIngredients(
    item: Record<string, unknown>,
    category: keyof Weights,
  ): string[] {
    if (category === "terpene") {
      const raw = this.stringField(item, ["terpenes"]);

      if (!raw || raw === "לא ידוע") {
        return [];
      }

      return raw
        .split(",")
        .map((part) => this.stripTerpeneParens(part.trim()))
        .filter((part) => part.length > 0);
    }

    return [
      this.stringField(item, ["originStrain"]),
      this.stringField(item, ["parent1"]),
      this.stringField(item, ["parent2"]),
    ].filter((value) => value.length > 0);
  }

  private stringField(item: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = item[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return "";
  }

  private stripTerpeneParens(value: string): string {
    const noTrailingPct = value.replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, "");
    return noTrailingPct.replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, "").trim();
  }

  private scheduleBackendSync(): void {
    if (!this.serverSyncEnabled || !this.hydratedFromServer) {
      return;
    }

    // Gate sync on user interaction alone. The previous guard also checked
    // !hasAnyPreference() which created the echo loop: when the server returned
    // real prefs, prefsState.set() during hydration fired the effect, the
    // guard saw `userInteracted=false` AND `hasAnyPreference=true` -> false ->
    // did NOT return -> debounced PUT of the server's own data back to itself.
    // Policy: "hydration wins unless user interacted" (Out of Scope). When
    // hydration runs, userInteracted is false, so no sync fires. As soon as
    // the user touches a chip, the first sync is scheduled.
    if (!this.userInteracted) {
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.pushToBackend();
    }, SYNC_DEBOUNCE_MS);
  }

  private pushToBackend(): void {
    this.syncStateSignal.set("saving");

    this.userPrefsService
      .updatePreferences({
        preferences: JSON.stringify(this.prefsState()),
        weights: JSON.stringify(this.weightsState()),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.syncStateSignal.set("saved");
        },
        error: () => {
          // Disable server sync on a non-recoverable error (the auth
          // interceptor has already tried refresh+retry; reaching this
          // callback means the failure is terminal). Without this, a 500 or
          // network error would cause a PUT on every subsequent chip
          // change, hammering a failing server.
          this.syncStateSignal.set("error");
          this.serverSyncEnabled = false;
        },
      });
  }

  private hydrateFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedShape>;

      if (parsed.prefs && typeof parsed.prefs === "object") {
        this.prefsState.set(parsed.prefs as PrefMap);
      }

      if (parsed.weights && typeof parsed.weights === "object") {
        this.weightsState.set({ ...DEFAULT_WEIGHTS, ...parsed.weights });
      }
    } catch {
      // Storage unavailable
    }
  }
}
```

### Frontend — Auth wiring

**1. `frontend/src/app/core/store/auth.store.ts`** — inject `MatchingEngineStore` and wire two call sites:

```typescript
import { MatchingEngineStore } from './matching-engine.store';
// inside the class:
private readonly matchingEngineStore = inject(MatchingEngineStore);

// login() success handler - after `this.user.set(res.result);` and BEFORE
// `this.router.navigate(['/'])` so the HTTP fires before the new route renders:
this.matchingEngineStore.loadFromBackend();

// logout() success AND error handlers - after `this.user.set(null);` and BEFORE
// `this.router.navigate(['/login'])`. resetForUserChange() already calls
// clearTimeout on the debounce timer, so no extra wiring is needed.
this.matchingEngineStore.resetForUserChange();
```

**2. `frontend/src/app/app.config.ts`** — the bootstrap path uses
`authService.checkSession()` directly (not `AuthStore.loadMe()`), so the
session-restore success path must call `loadFromBackend` explicitly. This
replaces the previous plan's wiring via `loadMe`:

```typescript
export function initializeApp(
  authService: AuthService,
  authStore: AuthStore,
  matchingEngineStore: MatchingEngineStore, // <- added dep
  themeService: ThemeService,
) {
  return async () => {
    themeService.init();
    const user = await authService.checkSession();
    authStore.user.set(user);
    if (user) {
      // Hydrate the store only after a confirmed user. This is the
      // cold-boot equivalent of login() success.
      matchingEngineStore.loadFromBackend();
    }
  };
}

// Update the APP_INITIALIZER deps:
{
  provide: APP_INITIALIZER,
  useFactory: initializeApp,
  deps: [AuthService, AuthStore, MatchingEngineStore, ThemeService],
  multi: true,
}
```

**Why this matters:** without the explicit `loadFromBackend` here, the
session-restore case (page refresh while still logged in) never hydrates
preferences from the server. The MatchingEngineStore's constructor does NOT
call `loadFromBackend` on purpose (see the constructor comment in Phase 6
above) — the timing would force a /login redirect on every cold boot.

Review: user-matching-preferences-sync-plan.md

Verdict

The plan is well-researched, well-structured, and mostly accurate in its description of the current codebase. Its analysis of the draft's bugs (IDOR, repo-in-controller, missing Swagger) is sound, and its architecture decisions are reasonable. However, it contains 2 build/runtime breakers, 1 incorrect central correctness claim (the echo-loop fix doesn't actually fix the echo loop), and several latent issues that would surface during implementation. The plan should be revised before execution. Below, every finding is backed by a file:line reference so it can be verified.
✅ What the plan gets right (verified against code)
Claim in plan
MatchingEngineStore persists only to localStorage under matching-engine:v1
UsersController has no preferences endpoints
StrainHunterService already injects Repository<Strain>
synchronize: true + autoLoadEntities: true → table auto-creates
Global interceptors withCredentialsInterceptor + authInterceptor (401→refresh→retry)
ServiceResultContainer<T> shape (success/message/result) on both sides
CustomApiOperationOptions has summaryHe + toolIcon
JwtPayload.sub: number → safe to use as userId
StrainDto exists & is exported from strain-hunter-fetch-response.dto
Global ValidationPipe({ whitelist, transform }) is on → DTO validators will run
Tool naming convention <Controller>\_<method> matches UserPreferencesController_getPreferences / StrainHunterController_searchStrains
Hebrew 'לא ידוע' in current store is clean (plan preserves it)
The phase breakdown, owner assignments, and checklists are practical and align with the project's AGENTS.md session-workflow.
🔴 Critical issues (will break the build or the endpoint)

C1. Frontend environment import path is one level too deep — build-breaker

The plan's user-preferences.service.ts imports:
import { environment } from "../../../environments/environment";
The file is at frontend/src/app/core/services/user-preferences.service.ts. Resolving ../../../environments/environment:

- ../ → app/core/ → ../../ → app/ → ../../../ → src/ → environments/environment = frontend/src/environments/environment, which does not exist.

The actual environment files live at frontend/src/app/environments/environment.ts (+ .prod.ts) — confirmed by with-credentials.interceptor.ts importing '../../environments/environment' from app/core/interceptors/ (same depth as app/core/services/).

Fix: use ../../environments/environment (two levels, not three). The depth is off by exactly one ../.

C2. GET /users/preferences is shadowed by UsersController's @Get(':id') — endpoint won't work

The plan adds a second controller @Controller('users/preferences') with @Get() and @Put(), registered in UsersModule as controllers: [UsersController, UserPreferencesController] (UsersController first).

But UsersController declares @Get(':id') with ParseIntPipe (users.controller.ts:90,160). NestJS/Express matches routes in registration order, and a parametric segment matches any literal — so a request to GET /users/preferences hits UsersController.getById with id = 'preferences', and ParseIntPipe rejects it → 400 Bad Request. The UserPreferencesController.getPreferences handler never runs.

This is the classic NestJS static-vs-parametric ordering gotcha. Note that @Get('me') works only because it's declared before @Get(':id') within the same controller (users.controller.ts:66 before :90); cross-controller ordering does not get that benefit.

- PUT /users/preferences is not affected (there is no @Put(':id') in UsersController).
- Only the GET is shadowed.

Fix options (pick one):

1. Reorder: controllers: [UserPreferencesController, UsersController] so the static route registers first.
2. Use a non-conflicting base path, e.g. @Controller('me/preferences') or @Controller('user-preferences') (and update the frontend baseUrl + system-context tool name accordingly).
3. Constrain :id to digits at the route level (more invasive).

I recommend option 2 — it's the most robust against future users/:something additions and avoids relying on registration order.
🟠 Significant correctness issues

S1. The "echo-loop fix" does not prevent the echo loop (the plan's headline goal)

The plan lists fixing the echo loop as bug #3 and as a Phase-6 checklist item ("No echo loop: no PUT fires from hydration itself"). But the guard is insufficient:
private scheduleBackendSync(): void {
if (!this.serverSyncEnabled || !this.hydratedFromServer) return;
if (!this.userInteracted && !this.hasAnyPreference()) return; // ← the bug
...
}
Trace for a logged-in user whose server row has prefs (e.g. {terpene:Myrcene: love}):

1. login() → loadFromBackend(): sets hydratedFromServer = true, then prefsState.set({terpene:Myrcene:love}).
2. The effect() fires → scheduleBackendSync().
3. serverSyncEnabled ✓, hydratedFromServer ✓ (set before the set calls in next). Then !userInteracted is true but !hasAnyPreference() is now false (prefs were just set) → true && false = false → does not return → schedules a debounced PUT.
4. 1.2s later pushToBackend() PUTs the server's own data back to the server. Echo.

The guard only suppresses the echo when the server returns empty prefs. When the server returns real prefs, the PUT fires — exactly the bug the plan claims to fix. The hasAnyPreference() clause is what opens the hole.

Fix: gate sync on user interaction alone:
if (!this.userInteracted) return;
(or set an isHydrating flag that suppresses the effect's sync for the hydration cycle). The current hasAnyPreference term should be removed; it conflicts with the stated "hydration wins unless user interacted" policy in the Out-of-Scope section.

S2. PUT-error path does not disable server sync

loadFromBackend's error handler sets serverSyncEnabled = false (good). But pushToBackend's error handler only does syncStateSignal.set('error') — it never sets serverSyncEnabled = false. So a persistent non-401 failure (e.g. 500) on PUT will cause a PUT on every subsequent interaction (debounced, but repeated), hammering a failing server. The Phase-6 checklist says "401/error path disables server sync" but only the GET path actually disables it.

Note: a 401 on PUT is intercepted by authInterceptor (refresh→retry→logout), so it won't reach the store's error handler directly — meaning the "401 disables sync" test case in Phase 7 is only reachable when refresh also fails (cascade). The store spec must account for the interceptor, or the test description should be reworded to "non-recoverable error disables sync."

S3. Recommendation workflow blind spot: genetics search misses parent1/parent2

The store extracts genetics from originStrain, parent1, parent2 (matching-engine.store.ts:285-289), so a user can mark genetics:Chem's Sister (a parent1 value). But searchStrains only searches name, enName, terpenes, originStrain — not parent1/parent2. So the agent, following the system-context rule ("search by top loved/liked genetics"), would search "Chem's Sister" and get no matches even though strains with that parent exist in those columns.

The Phase-3 checklist claim "Search covers … originStrain (matches how the store extracts ingredients)" is inaccurate for genetics. Either add parent1/parent2 to the LIKE array, or scope the rule to "search by loved/liked terpenes and originStrain only" and tell the user that parent-based preferences aren't searchable.

S4. Returning raw entities risks leaking the User relation (latent security)

getForUser returns the UserMatchingPreference entity directly, and the controller returns it as result. The entity has a user!: User relation (@OneToOne … @JoinColumn). Today it's safe because findOne({ where: { userId } }) doesn't load relations (no eager, no relations:), so user is undefined and omitted from JSON. But:

- The sibling convention is to return safe DTOs from the service (UsersService.findAllSafe() returns DTOs without password).
- If anyone later adds relations: ['user'] to getForUser, the password hash leaks into the GET response.

Recommendation: map the entity to UserMatchingPreferenceResponseDto in the service (explicit field selection) instead of returning the raw entity, so the response shape is guaranteed regardless of future query changes.
🟡 Moderate issues

M1. import type for RequestWithUser (convention / latent risk)

The plan's controller uses a plain import { RequestWithUser }. The sibling auth.controller.ts:33 uses import type { RequestWithUser } (and import type { Response }). The repo's errors-list.md documents TS1272 ("A type referenced in a decorated signature must be imported with import type … when isolatedModules and emitDecoratorMetadata are enabled").

Caveat: the backend tsconfig.json sets emitDecoratorMetadata: true but not isolatedModules (the frontend tsconfig.json:10 does set isolatedModules: true). So with the current backend config a plain import builds, but it diverges from the established pattern in the same domain and would break the day isolatedModules is enabled on the backend. Use import type { RequestWithUser } to match auth.controller.ts.

M2. Entity has @Column({ name: 'user_id' }) and @OneToOne @JoinColumn({ name: 'user_id' }) on the same physical column

Two property→column mappings (userId and user) both target user_id. With synchronize: true TypeORM generally merges same-named columns, and @Column({ unique: true }) + the OneToOne's implied uniqueness are redundant. It usually works, but this pattern is a known source of "column already exists"/duplicate-index surprises on synchronize. Verify the table creates cleanly on first backend boot (Phase 1/2 "Verify" step should include booting, not just npm run build).

M3. Constructor fires an HTTP GET unconditionally (timing/auth risk)

MatchingEngineStore calls loadFromBackend() in its constructor. Under the plan's auth wiring, AuthStore injects MatchingEngineStore, so the store (and its GET) is constructed at first AuthStore use. The GET relies on cookies being present; if it 401s, authInterceptor → refresh → (if that fails) authStore.logout() + navigate to /login. There's a narrow window where store construction before auth is established could trigger an unwanted /login navigation. Consider gating the constructor GET behind an auth-state check, or removing it from the constructor and relying solely on the explicit login() wiring (then also wire loadMe() for refresh — see M4).

M4. loadMe() (page-refresh session restore) is not wired

The plan wires login() → loadFromBackend() and logout() → resetForUserChange(). But auth.store.ts:63 loadMe() (which restores a session on refresh via /auth/me) is not wired to loadFromBackend(). The constructor GET covers the refresh case if the store is constructed after cookies are set — which is usually true, but the plan should either (a) explicitly call loadFromBackend() from loadMe() success, or (b) document that the constructor call is intentional for this case. As written, the behavior on refresh is implicit/fragile.

M5. Inconsistent response shape within the strain-hunter module

The existing GET /strain-hunter/fetch returns { items, lastScrapedAt } (typed StrainHunterFetchResponseDto, not a ServiceResultContainer). The plan's new GET /strain-hunter/search returns ServiceResultContainer<StrainDto[]> (success/message/result). Choosing ServiceResultContainer matches the app-wide convention (users/auth), so it's defensible, but it creates two different response shapes within the same module. Worth a conscious decision; the agent's tool-consumption logic should handle both. (Not a bug — a consistency note.)
🟢 Minor / nits

- N1. Quote style mismatch. Every file in the repo uses single quotes; the plan's entire "Full File Listings" section uses double quotes — directly contradicting its own checklists ("Single quotes + project TS style throughout"). The prettier hook (post-edit-format.sh) will auto-convert on commit, but the listings as-written don't match the target style, suggesting the listings weren't validated against the actual files. Low impact (auto-fixed), but fix for accuracy.
- N2. Indentation. strain-hunter.service.ts/.controller.ts use 4-space indent; the plan's strain-hunter snippets use 2-space. Prettier normalizes, but the new user-preferences.\* files (2-space) match the users module while the strain-hunter additions should match the strain-hunter module's 4-space.
- N3. syncState never returns to idle. After a successful PUT it's set to 'saved' and stays there. Not a bug, but the UI contract for the exposed syncState() signal is undefined — specify when (or if) it resets.
- N4. req.user?.sub redundant guard. @UseGuards(JwtAuthGuard) already guarantees req.user is populated, so if (!userId) is unreachable in practice. Matches the defensive style in auth.controller.ts (if (!user) throw), so it's consistent — just noting it's redundant, not wrong.
- N5. @ApiForbiddenResponse/@ApiNotFoundResponse "Not applicable". Adding N/A responses matches the auth/users convention (e.g. auth.controller.ts:64-66), so this is correct and consistent — no action, just confirmed.
- N6. The draft new-plan.md the plan "replaces" no longer exists (Test-Path → False). The mojibake/echo-loop/repo-in-controller rationale is therefore unverifiable against the actual draft. The historical rationale is plausible and the current store's Hebrew is clean (matching-engine.store.ts:275), so this is fine — just flagging that section 2's bug list can't be independently confirmed.
- N7. Strain search route ordering is safe (no @Get(':x') in StrainHunterController to shadow search), unlike the users/preferences case in C2. ✓
  Recommended plan revisions (priority order)

1. Fix C2 (routing) — switch UserPreferencesController to a non-conflicting base path (e.g. me/preferences) and update the frontend baseUrl, the system-context tool name, and the Phase-2 checklist. (This also changes the Swagger tool name from UserPreferencesController_getPreferences → still valid, just confirm.)
2. Fix C1 (frontend import) — correct to ../../environments/environment.
3. Fix S1 (echo loop) — change the guard to if (!this.userInteracted) return; and update the Phase-6 checklist claim, which is currently false.
4. Fix S2 (PUT error) — set serverSyncEnabled = false in pushToBackend's error path (or add a retry budget); reword the Phase-7 "401 disables sync" test to account for the interceptor's refresh behavior.
5. Decide S3 — add parent1/parent2 to the search, or narrow the agent rule.
6. Apply M1 — import type { RequestWithUser }.
7. Apply S4 — map entity → response DTO in the service (don't return raw entities).
8. Verify M2 — boot the backend once during Phase 1/2 to confirm the table auto-creates.
9. Decide M4/M3 — explicitly wire loadMe() or document the constructor-GET intent.
