# Explorer Module Split Plan

## Goal

`backend/src/modules/explorer/` started as a small utility module, but it now contains several separate concerns:

- Internal system status metrics.
- Current weather lookup.
- Five-day weather forecast.
- Agent UI rendering instructions through `GENUI_HTML(...)`.

The goal is to split this into clearer modules so each module has one domain responsibility, while keeping the existing agent tools stable during the transition.

## Current State

Current backend files:

- `backend/src/modules/explorer/explorer.controller.ts`
- `backend/src/modules/explorer/explorer.service.ts`
- `backend/src/modules/explorer/dto/weather-query.dto.ts`
- `backend/src/modules/explorer/explorer.module.ts`

Current endpoints:

| Current Endpoint         | Responsibility   | Current Problem                       |
| ------------------------ | ---------------- | ------------------------------------- |
| `GET /explorer/status`   | System metrics   | Not really an explorer concern        |
| `GET /explorer/weather`  | Current weather  | Weather domain is mixed into Explorer |
| `GET /explorer/forecast` | Weather forecast | Forecast belongs with Weather         |

Additional concern:

`GENUI_HTML(...)` is currently defined in `explorer.controller.ts`, but it is not specific to Explorer. It is an agent rendering helper.

## Recommended Target Structure

```txt
backend/src/modules/
  system/
    system.module.ts
    system.controller.ts
    system.service.ts

  weather/
    weather.module.ts
    weather.controller.ts
    weather.service.ts
    dto/
      weather-query.dto.ts

  admin-agent/
    constants/
      agent-instructions.constant.ts
```

## Proposed Module Names

### `SystemModule`

Use for internal application status and runtime metrics.

Suggested endpoint:

```txt
GET /system/status
```

### `WeatherModule`

Use for all weather-related tools.

Suggested endpoints:

```txt
GET /weather/current
GET /weather/forecast
```

### `GENUI_HTML`

Merge into:

```txt
backend/src/modules/admin-agent/constants/agent-instructions.constant.ts
```

Reason: Agent display instructions already belong in the admin-agent constants area. Keeping `GENUI_HTML(...)` there avoids creating another constants file and keeps all agent-facing instructions in one place.

## Endpoint Migration Map

| Old Endpoint             | New Endpoint            | New Module      |
| ------------------------ | ----------------------- | --------------- |
| `GET /explorer/status`   | `GET /system/status`    | `SystemModule`  |
| `GET /explorer/weather`  | `GET /weather/current`  | `WeatherModule` |
| `GET /explorer/forecast` | `GET /weather/forecast` | `WeatherModule` |

## Compatibility Strategy

The system is not in production, there are no active users, and resets or restarts are acceptable.

Because of that, keeping a backward-compatibility layer is unnecessary over-engineering. It would add extra weight, duplicate tools in Swagger, and keep an unclear folder structure alive longer than needed.

Recommended transition:

1. Add the new modules and new endpoints.
2. Move the existing logic into the new modules.
3. Update Swagger/tool references to the new endpoints.
4. Delete the old `ExplorerModule` completely.
5. Remove the old frontend Explorer route if it is not rebuilt as a real page.

This keeps the backend clean, avoids duplicate tools in Swagger, and preserves a pure module structure.

## Refactor Steps

### Step 1 - Move `GENUI_HTML`

Target file:

```txt
backend/src/modules/admin-agent/constants/agent-instructions.constant.ts
```

Move this export out of `explorer.controller.ts`:

```ts
export const GENUI_HTML = ...
```

Then update imports in every controller that uses it.

Verification:

- Backend build passes.
- Swagger still includes the same `genUiSpec` values.
- No duplicate `GENUI_HTML` definition remains.

### Step 2 - Create `SystemModule`

Create:

```txt
backend/src/modules/system/system.module.ts
backend/src/modules/system/system.controller.ts
backend/src/modules/system/system.service.ts
```

Move this logic from `ExplorerService`:

```ts
getSystemStatus();
```

Expose it through:

```txt
GET /system/status
```

Keep the current response contract:

```ts
ServiceResultContainer<SystemStatus>;
```

Register `SystemModule` in `AppModule`.

Verification:

- `GET /system/status` returns the same payload as `GET /explorer/status`.
- Swagger exposes `summaryHe`, `toolIcon`, and `genUiSpec`.
- The new controller does not depend on `ExplorerService`.

### Step 3 - Create `WeatherModule`

Create:

```txt
backend/src/modules/weather/weather.module.ts
backend/src/modules/weather/weather.controller.ts
backend/src/modules/weather/weather.service.ts
backend/src/modules/weather/dto/weather-query.dto.ts
```

Move this logic from `ExplorerService`:

```ts
getWeather(city);
getFiveDayForecast(city);
```

Expose it through:

```txt
GET /weather/current
GET /weather/forecast
```

Move:

```txt
backend/src/modules/explorer/dto/weather-query.dto.ts
```

to:

```txt
backend/src/modules/weather/dto/weather-query.dto.ts
```

Register `WeatherModule` in `AppModule`.

Verification:

- `GET /weather/current?city=...` returns the same payload as `GET /explorer/weather?city=...`.
- `GET /weather/forecast?city=...` returns the same payload as `GET /explorer/forecast?city=...`.
- Swagger exposes the same gen-ui-spec on the new weather endpoints.

### Step 4 - Delete Explorer

Delete:

```txt
backend/src/modules/explorer/
```

Do not keep compatibility wrappers such as:

```ts
GET /explorer/status -> systemService.getSystemStatus()
GET /explorer/weather -> weatherService.getWeather(city)
GET /explorer/forecast -> weatherService.getFiveDayForecast(city)
```

Reason: The project is not in production, has no active users, and does not need backward compatibility. Keeping old routes would create duplicate Swagger tools and unnecessary code.

Verification:

- No `backend/src/modules/explorer/` files remain.
- `AppModule` no longer imports `ExplorerModule`.
- Swagger no longer exposes `/explorer/*` endpoints.
- New `SystemModule` and `WeatherModule` endpoints work.

### Step 5 - Update Swagger / Agent Tool Usage

Regenerate or refresh:

```txt
backend/swagger-spec.json
```

Then verify:

- New endpoints appear as tools.
- Old Explorer tools are gone.
- `POST /admin-agent/query-stream` remains unchanged.
- `GENUI_HTML(...)` is imported from `agent-instructions.constant.ts`.

### Step 6 - Clean Frontend References

After deleting the backend Explorer module, clean any frontend references to Explorer.

Verification:

- No frontend route points to `/explorer` unless the page is rebuilt with a new purpose.
- Sidebar no longer links to a dead route.
- Frontend build passes after route cleanup.

## Frontend Note

`frontend/src/app/features/explorer/` currently appears to be a placeholder page and does not call the real backend Explorer endpoints.

Recommended frontend decision:

- If the product does not need a visual Explorer page, remove the route later.
- If the product wants a tools/status page, rebuild it around the new modules:
  - System status card from `GET /system/status`.
  - Weather tester from `GET /weather/current`.
  - Forecast tester from `GET /weather/forecast`.

Do not keep the frontend page named `Explorer` if it becomes a system/weather page. Use clearer names such as:

```txt
SystemTools
SystemStatus
WeatherTools
```

## Suggested Implementation Order

1. Move `GENUI_HTML` into `agent-instructions.constant.ts`.
2. Add `SystemModule`.
3. Add `WeatherModule`.
4. Delete `ExplorerModule`.
5. Regenerate and verify Swagger.
6. Update frontend/tool references.

## Open Decisions

- Should the frontend Explorer page be removed or rebuilt as a real tools page?
- Should forecast use a real forecast API instead of generated data based on current weather?
- Should `SystemModule` later contain more admin/system diagnostics, or only public agent-safe status metrics?

## Checklist

### Agent 1 - Shared gen-ui-spec

Owner: `backend/src/modules/admin-agent/constants/agent-instructions.constant.ts`

- [ ] Move `GENUI_HTML(...)` out of `explorer.controller.ts`.
- [ ] Export `GENUI_HTML` from `agent-instructions.constant.ts`.
- [ ] Update all imports.
- [ ] Verify backend build.

### Agent 2 - System Module

Owner: `backend/src/modules/system/`

- [ ] Create `SystemModule`.
- [ ] Create `SystemController`.
- [ ] Create `SystemService`.
- [ ] Move `getSystemStatus()` logic into `SystemService`.
- [ ] Add `GET /system/status`.
- [ ] Preserve existing response shape.
- [ ] Preserve `genUiSpec`.
- [ ] Register `SystemModule` in `AppModule`.

### Agent 3 - Weather Module

Owner: `backend/src/modules/weather/`

- [ ] Create `WeatherModule`.
- [ ] Create `WeatherController`.
- [ ] Create `WeatherService`.
- [ ] Move `WeatherQueryDto`.
- [ ] Move `getWeather(city)` logic.
- [ ] Move `getFiveDayForecast(city)` logic.
- [ ] Add `GET /weather/current`.
- [ ] Add `GET /weather/forecast`.
- [ ] Preserve existing response shapes and gen-ui-spec.

### Agent 4 - Explorer Removal

Owner: `backend/src/modules/explorer/`

- [ ] Delete `ExplorerController`.
- [ ] Delete `ExplorerService`.
- [ ] Delete `ExplorerModule`.
- [ ] Delete old Explorer DTO files after moving anything still needed.
- [ ] Remove `ExplorerModule` from `AppModule`.
- [ ] Verify no `/explorer/*` endpoints remain in Swagger.

### Agent 5 - Swagger And Integration

Owner: cross-module

- [ ] Run backend build/test.
- [ ] Regenerate `backend/swagger-spec.json` if required by project workflow.
- [ ] Verify new endpoints exist in Swagger.
- [ ] Verify old `/explorer/*` endpoints do not exist in Swagger.
- [ ] Verify `genUiSpec` exists on new tool endpoints.
- [ ] Verify no duplicate `GENUI_HTML` definitions remain.

### Agent 6 - Frontend Decision

Owner: `frontend/src/app/features/explorer/`

- [ ] Decide whether the Explorer page should be removed or rebuilt.
- [ ] If rebuilt, rename the page to match its actual purpose.
- [ ] If removed, remove the sidebar route and route config.
- [ ] Verify frontend build after route/page changes.
