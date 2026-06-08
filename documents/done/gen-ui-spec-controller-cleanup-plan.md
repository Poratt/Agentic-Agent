# GenUI Spec Controller Cleanup Plan

## Goal

Move all long `GENUI_HTML(...)` hints out of NestJS controllers and into ready-to-use `GenUiSpec.*` constants.

The desired controller pattern is:

```ts
genUiSpec: GenUiSpec.SOME_READY_CONSTANT
```

instead of:

```ts
genUiSpec: GENUI_HTML('long endpoint-specific hint')
```

This keeps controllers focused on endpoint metadata, keeps GenUI rendering guidance centralized, and makes Swagger tool behavior easier to maintain.

## Current State

The base template function already exists in:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

Controllers should import `GenUiSpec` only. They should not import or call `GENUI_HTML(...)` directly.

Current direct controller usage remains in:

| Controller | Direct Uses | Required Action |
| ---------- | ----------- | --------------- |
| `users.controller.ts` | 3 | Replace with user-related `GenUiSpec.*` constants |
| `system.controller.ts` | 1 | Replace with `GenUiSpec.SYSTEM_STATUS` |
| `admin-agent.controller.ts` | 3 | Replace with chat/session `GenUiSpec.*` constants |
| `auth.controller.ts` | 1 | Replace with `GenUiSpec.USER_PROFILE` |

Additional cleanup:

| Controller | Required Action |
| ---------- | --------------- |
| `weather.controller.ts` | Remove unused `GENUI_HTML` import |

## Template Reuse Principle

`GenUiSpec.*` constants represent reusable display patterns, not necessarily one constant per endpoint.

If multiple endpoints return data that should be rendered with the same UI structure, they can and should share the same `GenUiSpec` constant. This keeps controller metadata small and avoids duplicating nearly identical hints.

Recommended rule:

- If the difference is only the entity name, label, or text, reuse an existing template.
- If the response needs a different UI structure, such as a table, profile card, chart, transcript timeline, forecast layout, or destructive-action confirmation, create or use a separate `GenUiSpec` constant for that display type.

Examples:

| Endpoints | Shared Template |
| --------- | --------------- |
| `GET /users/:id`, `GET /users/me`, `GET /auth/me` | `GenUiSpec.USER_PROFILE` |
| `DELETE /users/:id`, future delete endpoints with a response body | `GenUiSpec.DELETE_CONFIRM` or a more specific destructive-action template |
| `GET /users`, future list endpoints with the same table behavior | `GenUiSpec.USERS_TABLE` only if the table instruction stays generic enough |

Endpoints such as `GET /weather/current` and `GET /weather/forecast` should keep separate constants because their display structures are meaningfully different.

## Target Structure

Keep all GenUI HTML instructions centralized here:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

Recommended shape:

```ts
export const GENUI_HTML = (hint: string) => {
  ...
};

export const GenUiSpec = {
  WEATHER_CURRENT: GENUI_HTML(...),
  WEATHER_FORECAST: GENUI_HTML(...),
  USERS_TABLE: GENUI_HTML(...),
  USER_PROFILE: GENUI_HTML(...),
  SYSTEM_STATUS: GENUI_HTML(...),
  DELETE_CONFIRM: GENUI_HTML(...),
  ...
};
```

Controllers should use only:

```ts
import { GenUiSpec } from '../admin-agent/constants/gen-ui-spec.constant';
```

or the equivalent relative path from the controller location.

## Implementation Plan

### Step 1 - Add Missing `GenUiSpec` Constants

Owner:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

Add only the constants that are needed by controllers after applying the reuse principle.

Recommended additions:

```ts
USER_UPDATE_CONFIRMATION: GENUI_HTML(
  'Render an updated user profile card. Highlight the user id, full name, email, numeric role label, and updatedAt timestamp. Make it clear the profile fields were updated successfully.',
),

USER_ROLE_CHANGE_CONFIRMATION: GENUI_HTML(
  'Render a role-change confirmation card. Show the user id, email, full name, and new role. Translate numeric roles as 1 = Admin and 2 = User, while preserving the numeric value.',
),

CHAT_SESSIONS_LIST: GENUI_HTML(
  'Render a compact chat sessions list. Show each session title, id, createdAt, and updatedAt. Sort visually by updatedAt when possible and make the session id easy to copy or reference.',
),

CHAT_TRANSCRIPT_TIMELINE: GENUI_HTML(
  'Render a chat transcript timeline. Group messages by role, show user prompts and assistant replies clearly, include createdAt timestamps, and keep long message content readable with wrapping.',
),

CHAT_SESSION_CREATED: GENUI_HTML(
  'Render a small new-session confirmation card. Show the new session id, title, createdAt, and updatedAt. Keep the output concise.',
),
```

Recommended reuse:

| Use Case | Constant |
| -------- | -------- |
| User delete confirmation | `GenUiSpec.DELETE_CONFIRM`, unless the delete response needs user-specific wording |
| System status | `GenUiSpec.SYSTEM_STATUS`, expanded if the current inline hint contains important details |
| Auth current user | `GenUiSpec.USER_PROFILE` |

Verification:

```txt
rg -n "USER_UPDATE_CONFIRMATION|CHAT_SESSIONS_LIST|CHAT_TRANSCRIPT_TIMELINE" backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

### Step 2 - Update `UsersController`

Owner:

```txt
backend/src/modules/users/users.controller.ts
```

Replace direct `GENUI_HTML(...)` usage:

| Endpoint | Target |
| -------- | ------ |
| `PATCH /users/:id` | `GenUiSpec.USER_UPDATE_CONFIRMATION` |
| `DELETE /users/:id` | `GenUiSpec.DELETE_CONFIRM` or `GenUiSpec.USER_DELETE_CONFIRMATION` |
| `PATCH /users/:id/role` | `GenUiSpec.USER_ROLE_CHANGE_CONFIRMATION` |

Keep existing constants:

| Endpoint | Existing Constant |
| -------- | ----------------- |
| `GET /users` | `GenUiSpec.USERS_TABLE` |
| `GET /users/me` | `GenUiSpec.USER_PROFILE` |
| `GET /users/:id` | `GenUiSpec.USER_PROFILE` |

Remove `GENUI_HTML` from the import after replacements.

Verification:

```txt
rg -n "GENUI_HTML|GenUiSpec.USER_UPDATE_CONFIRMATION|GenUiSpec.USER_ROLE_CHANGE_CONFIRMATION" backend/src/modules/users/users.controller.ts
```

### Step 3 - Update `SystemController`

Owner:

```txt
backend/src/modules/system/system.controller.ts
```

Replace:

```ts
genUiSpec: GENUI_HTML(...)
```

with:

```ts
genUiSpec: GenUiSpec.SYSTEM_STATUS
```

If the inline controller hint is richer than the existing `SYSTEM_STATUS` constant, move the richer wording into the constant before replacing the controller usage.

Remove `GENUI_HTML` from the import.

Verification:

```txt
rg -n "GENUI_HTML|GenUiSpec.SYSTEM_STATUS" backend/src/modules/system/system.controller.ts
```

### Step 4 - Update `AdminAgentController`

Owner:

```txt
backend/src/modules/admin-agent/admin-agent.controller.ts
```

Replace direct `GENUI_HTML(...)` usage:

| Endpoint | Target |
| -------- | ------ |
| `GET /admin-agent/sessions` | `GenUiSpec.CHAT_SESSIONS_LIST` |
| `GET /admin-agent/sessions/:id/messages` | `GenUiSpec.CHAT_TRANSCRIPT_TIMELINE` |
| `POST /admin-agent/sessions` | `GenUiSpec.CHAT_SESSION_CREATED` |

Keep `DELETE /admin-agent/sessions/:id` as a plain string unless the project explicitly wants all `genUiSpec` values centralized. That endpoint returns `204`, so forcing an HTML GenUI block may imply response data that does not exist.

Remove `GENUI_HTML` from the import.

Verification:

```txt
rg -n "GENUI_HTML|CHAT_SESSIONS_LIST|CHAT_TRANSCRIPT_TIMELINE|CHAT_SESSION_CREATED" backend/src/modules/admin-agent/admin-agent.controller.ts
```

### Step 5 - Update `AuthController`

Owner:

```txt
backend/src/modules/auth/auth.controller.ts
```

Replace:

```ts
genUiSpec: GENUI_HTML(...)
```

on `GET /auth/me` with:

```ts
genUiSpec: GenUiSpec.USER_PROFILE
```

Keep `POST /auth/logout` as a plain string unless the project explicitly wants all plain instructions centralized.

Remove `GENUI_HTML` from the import.

Verification:

```txt
rg -n "GENUI_HTML|GenUiSpec.USER_PROFILE" backend/src/modules/auth/auth.controller.ts
```

### Step 6 - Clean `WeatherController`

Owner:

```txt
backend/src/modules/weather/weather.controller.ts
```

Remove the unused `GENUI_HTML` import.

Keep:

| Endpoint | Constant |
| -------- | -------- |
| `GET /weather/current` | `GenUiSpec.WEATHER_CURRENT` |
| `GET /weather/forecast` | `GenUiSpec.WEATHER_FORECAST` |

Verification:

```txt
rg -n "GENUI_HTML|GenUiSpec.WEATHER" backend/src/modules/weather/weather.controller.ts
```

### Step 7 - Final Verification

Run backend build:

```txt
npm.cmd run build
```

from:

```txt
backend/
```

Search all controllers:

```txt
rg -n "GENUI_HTML\(" backend/src --glob "*.controller.ts"
```

Expected result:

```txt
No matches
```

Search all controller imports:

```txt
rg -n "GENUI_HTML" backend/src --glob "*.controller.ts"
```

Expected result:

```txt
No matches
```

Refresh `backend/swagger-spec.json` if the project workflow requires Swagger output to be committed.

## Agent Checklist By Module

### Agent 1 - GenUI Constants

Owner:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

- [ ] Add `USER_UPDATE_CONFIRMATION`.
- [ ] Add `USER_ROLE_CHANGE_CONFIRMATION`.
- [ ] Add `CHAT_SESSIONS_LIST`.
- [ ] Add `CHAT_TRANSCRIPT_TIMELINE`.
- [ ] Add `CHAT_SESSION_CREATED`.
- [ ] Decide whether to reuse `DELETE_CONFIRM` or add `USER_DELETE_CONFIRMATION`.
- [ ] Expand `SYSTEM_STATUS` only if the inline controller hint contains important missing guidance.
- [ ] Do not create one constant per endpoint when an existing display template is equivalent.

### Agent 2 - Users Controller

Owner:

```txt
backend/src/modules/users/users.controller.ts
```

- [ ] Replace `PATCH /users/:id` inline `GENUI_HTML(...)`.
- [ ] Replace `DELETE /users/:id` inline `GENUI_HTML(...)`.
- [ ] Replace `PATCH /users/:id/role` inline `GENUI_HTML(...)`.
- [ ] Remove unused `GENUI_HTML` import.
- [ ] Verify existing `GET` endpoints still use `GenUiSpec.USER_PROFILE` and `GenUiSpec.USERS_TABLE`.

### Agent 3 - System Controller

Owner:

```txt
backend/src/modules/system/system.controller.ts
```

- [ ] Replace inline `GENUI_HTML(...)` with `GenUiSpec.SYSTEM_STATUS`.
- [ ] Move any useful inline wording into `GenUiSpec.SYSTEM_STATUS` first.
- [ ] Remove unused `GENUI_HTML` import.

### Agent 4 - Admin Agent Controller

Owner:

```txt
backend/src/modules/admin-agent/admin-agent.controller.ts
```

- [ ] Replace `GET /admin-agent/sessions` inline `GENUI_HTML(...)`.
- [ ] Replace `GET /admin-agent/sessions/:id/messages` inline `GENUI_HTML(...)`.
- [ ] Replace `POST /admin-agent/sessions` inline `GENUI_HTML(...)`.
- [ ] Keep `DELETE /admin-agent/sessions/:id` plain unless intentionally centralized.
- [ ] Remove unused `GENUI_HTML` import.

### Agent 5 - Auth And Weather Controllers

Owner:

```txt
backend/src/modules/auth/auth.controller.ts
backend/src/modules/weather/weather.controller.ts
```

- [ ] Replace `GET /auth/me` inline `GENUI_HTML(...)` with `GenUiSpec.USER_PROFILE`.
- [ ] Keep `POST /auth/logout` plain unless intentionally centralized.
- [ ] Remove unused `GENUI_HTML` imports.
- [ ] Confirm weather endpoints still use separate current and forecast constants.

### Agent 6 - Verification

Owner:

```txt
backend/
```

- [ ] Run backend build.
- [ ] Verify no controller calls `GENUI_HTML(...)`.
- [ ] Verify no controller imports `GENUI_HTML`.
- [ ] Verify only `gen-ui-spec.constant.ts` defines and calls `GENUI_HTML(...)`.
- [ ] Refresh `backend/swagger-spec.json` if required.
- [ ] Confirm no unrelated Swagger endpoints changed.

## Open Decisions

- Should delete responses use one shared `GenUiSpec.DELETE_CONFIRM`, or should user delete get `GenUiSpec.USER_DELETE_CONFIRMATION`?
- Should plain string `genUiSpec` values, such as logout and session delete, also move into named constants?
- Should `GenUiSpec.USERS_TABLE` be renamed later to a generic table display spec if other list endpoints reuse it?
