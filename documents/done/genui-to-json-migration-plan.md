# GenUI → JSON + Custom Components Migration Plan

## Agent Assignments

| Phase | Primary Agent | Support Agent | Dependencies |
|---|---|---|---|
| Phase 1 — JSON Contracts & Backend Infra | Backend Agent | — | None |
| Phase 2 — Core Frontend Rendering | Frontend Agent | — | Phase 1 (render events must exist) |
| Phase 3 — Batch 1: Standalone Cards | Frontend Agent | — | Phase 2 (RenderHost must be ready) |
| Phase 4 — Batch 2: Tables & Charts | Frontend Agent | — | Phase 2 + Phase 3 |
| Phase 5 — Batch 3: Remaining | Frontend Agent | — | Phase 2 + Phase 4 |
| Phase 6 — Backend Cleanup | Backend Agent | — | Phase 3 + 4 + 5 (all components built) |
| Phase 7 — Frontend Cleanup | Frontend Agent | — | Phase 6 (backend GenUI removed) |

**Parallelization opportunity**: Phases 1 and 2 can start in parallel if the backend agent creates the `render` event skeleton first and the frontend agent creates `RenderHostComponent` against the expected event shape. However, full integration requires Phase 1 completion.

## Problem Statement

The current system uses **GenUI** — the LLM generates raw HTML/CSS inside ` ```component ` code fences from tool-result JSON, which the frontend's `AiFormat` directive sanitizes and renders. This approach works, but carries structural problems that compound over time:

| Issue | Impact |
|---|---|
| **LLM cost** | Token budget is spent generating HTML/CSS markup — pure overhead per response |
| **Output instability** | The LLM can emit slightly different HTML each time, making visual diffs noisy and testing impossible |
| **Sanitization surface** | Every streamed HTML chunk must be parsed, sanitized, and scoped by `AiFormat` before rendering. The more complex the HTML, the wider the attack surface |
| **No component testing** | GenUI components can't be unit-tested in isolation — they exist only inside the LLM's output |
| **Styling drift** | `gen-ui-spec.constant.ts` instructs the LLM to use `var(--token)` design tokens, but the LLM doesn't enforce them; hardcoded colors/pixels leak in |
| **Streaming complexity** | Progressive GenUI rendering in `AiFormat` is a 400-line parser+renderer+scoper — expensive to maintain and debug |
| **Ownership ambiguity** | Visual output is "owned" by neither the backend nor the frontend — the LLM mediates between them |

These problems are inherent to the approach. Optimizing `AiFormat` (as done in previous sessions) makes the current architecture more bearable, but doesn't fix it.

## Goal

Replace GenUI with a **JSON contract** — the backend sends structured JSON, the frontend renders it with typed Angular components. Eliminate the LLM from the rendering layer entirely.

Benefits:
- **Cost**: Zero token overhead for HTML generation — tool-result JSON is typically 1–3 KB vs. 5–20 KB of generated HTML
- **Stability**: Identical data always produces identical output
- **Full control**: Every pixel, animation, and interaction is authored in TypeScript/Angular with design tokens and tested in isolation
- **Uniformity**: All UI follows the same design system — no GenUI instruction can contradict it
- **Security**: No HTML injection surface; components receive typed data, not arbitrary strings
- **Maintainability**: Standard Angular component tree instead of a streaming HTML sanitizer

## Scope

### In scope

- All GenUI templates currently defined in `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`
- The `SYSTEM_CONTEXT_GENUI` prompt block in `system-context.constant.ts`
- `AiFormat` directive — simplified to pure markdown, or replaced by a `ChatBlockRenderer` component
- The streaming protocol: no change to `step` / `token` events, but the `token` event carries structured JSON blocks instead of raw HTML
- Backend tool-response shapes: extend DTOs to include structured `renderSpec` fields

### Out of scope

- Changes to the LLM model selection or provider infrastructure
- Changes to authentication, session management, or the tool-calling infrastructure
- Non-chat responses (e.g., direct REST API rendering that isn't part of the agent flow)
- The `AiFormat` markdown-parsing code (code fences, tables, badges) — it stays for prose rendering; only the ` ```component ` block handling is removed

## Audit: All Existing GenUI Templates

There are **15 active GenUI templates** in `gen-ui-spec.constant.ts`. Each must be migrated.

| # | Template Key | Tool / Context | Data Shape | Frontend Component Candidate |
|---|---|---|---|---|
| 1 | `REGISTER_FORM` | Auth / Registration | `{ fields: { fullName, email, password } }` | `RegisterFormComponent` |
| 2 | `USER_PROFILE` | Auth / Me | `{ sub, email, role, iat, exp }` | `UserProfileCardComponent` |
| 3 | `USERS_TABLE` | Users / List | `{ users: User[] }` | `UsersTableComponent` (already PrimeNG) |
| 4 | `USER_UPDATE_CONFIRMATION` | Users / Update | `{ user: UpdatedUser }` | `UserProfileCardComponent` (same as #2) |
| 5 | `USER_ROLE_CHANGE_CONFIRMATION` | Users / Update Role | `{ userId, email, fullName, newRole }` | `RoleChangeCardComponent` |
| 6 | `CHAT_SESSIONS_LIST` | Chat / Sessions | `{ sessions: Session[] }` | `ChatSessionsListComponent` |
| 7 | `CHAT_TRANSCRIPT_TIMELINE` | Chat / Transcript | `{ messages: Message[] }` | `TranscriptTimelineComponent` |
| 8 | `CHAT_SESSION_CREATED` | Chat / Create | `{ session: { id, title, createdAt, updatedAt } }` | `SessionCreatedCardComponent` |
| 9 | `ANALYTICS_CHART` | Analytics / Query | `{ chartType, series, title, summary }` | `AnalyticsChartComponent` |
| 10 | `CURRENCY` | Currency / Convert or Rates | `{ mode, result, rates?, ... }` | `CurrencyCardComponent` |
| 11 | `WEATHER_CURRENT` | Weather / Current | `{ location, tempC, feelsLikeC, ..., details }` | `WeatherCurrentCardComponent` |
| 12 | `WEATHER_FORECAST` | Weather / Forecast | `{ location, days: Day[] }` | `WeatherForecastComponent` |
| 13 | `SYSTEM_STATUS` | System / Status | `{ totalUsers, activeSessions, swaggerStatus }` | `SystemStatusDashboardComponent` |
| 14 | `DELETE_CONFIRM` | Global / Delete | `{ deleted: boolean }` | `DeleteConfirmCardComponent` |
| 15 | `LLM_TEST_RESULTS` | LLM / Test Results | `{ models: ModelResult[] }` | `LlmTestResultsComponent` |
| 16 | `DATABASE_STORAGE_MONITOR` | Database Monitor | `{ databaseName, tableCount, totalRows, tables[] }` | `DatabaseStorageMonitorComponent` |

**Key observation**: Several templates (#2, #4) share the same visual pattern (`UserProfileCard`). Templates #11 and #12 share the weather domain. Templates #9, #15, and #16 share a card+chart pattern. This suggests ~10–12 distinct components, not 16.

---

## Architecture: New Rendering Path

### Backend Change

Tool responses that previously triggered GenUI get a new optional `renderSpec` field:

```typescript
// Example: WeatherCurrentDto
interface WeatherCurrentDto {
  location: string;
  tempC: number;
  // ... existing fields ...
  renderSpec?: {
    type: 'weather-current';
    data: WeatherCurrentRenderData;
  };
}
```

The `AdminAgentService` populates `renderSpec` at the same time it prepares tool results for the LLM context. The LLM is **not** instructed to generate HTML — it receives the data + `renderSpec` in its tool-result context, and it produces a short prose summary.

The key architectural decision (per review feedback): **the `render` event is sent as soon as the tool finishes, in parallel with LLM prose streaming** — not after the LLM outputs a marker. This means:

1. Tool finishes → `AdminAgentService` calls `RenderSpecService` → immediately yields `{type:"render", component, data}` to the stream
2. LLM begins generating prose → `{type:"token", content}` events stream in parallel
3. The frontend receives both streams concurrently: the component renders immediately with a skeleton/placeholder, and the prose fills in above or below it

The `[RENDER: <type>]` marker in prose is no longer the trigger for the `render` event — it becomes a prose hint only (e.g., "rendering weather card for Haifa..."). The backend sends `render` events independently of what the LLM writes.

```json
// Sent immediately when tool completes — before LLM starts responding
{"type":"render","component":"weather-current","data":{...}}

// Sent in parallel with LLM prose
{"type":"token","content":"The weather in Haifa is currently... rendering weather card..."}
```

The `token` event carries prose text. The `render` event carries typed JSON.

### Frontend Change

`AiFormat` is simplified: the ` ```component ` parsing and all sanitization code is removed. It becomes a markdown renderer with a new `RenderHostComponent` for structured blocks.

`ChatMessage` detects `RENDER:` markers in the streamed content and routes them to `RenderHostComponent` with the correct component type and data.

`RenderHostComponent` is a thin switch — it selects the right Angular component and passes typed data. Heavy components (charts, DB monitor) use `@defer` for lazy loading so they don't bloat the initial Chat bundle:

```typescript
// render-host.component.ts
@Component({
  selector: 'app-render-host',
  template: `
    @switch (componentType) {
      @case ('weather-current') { <app-weather-current-card [data]="renderData" /> }
      @case ('currency') { <app-currency-card [data]="renderData" /> }
      @case ('analytics-chart') {
        @defer (on viewport) {
          <app-analytics-chart [data]="renderData" />
        } @loading {
          <div class="block-skeleton"></div>
        }
      }
      @case ('database-storage-monitor') {
        @defer (on viewport) {
          <app-database-storage-monitor [data]="renderData" />
        } @loading {
          <div class="block-skeleton"></div>
        }
      }
      // ... lighter components render synchronously
    }
  `
})
export class RenderHostComponent {
  componentType = input.required<string>();
  renderData = input.required<Record<string, unknown>>();
}
```

**Design note**: `@defer` uses Angular's block-level lazy loading — the component's code is split into a separate chunk and only loaded when it enters the viewport. This keeps the main chat bundle lean. All 15 components must be `standalone: true` for `@defer` to work correctly.

### Streaming Protocol Update

```
Backend                              Frontend
─────                              ───────
Tool executes
  ├─ yield {step} ──────────────► │ step: tool running
  └─ RenderSpecService returns ────►│
      └─ yield {render} ──────────► │ render event → RenderHostComponent renders immediately
                                    │  (component shows skeleton or partial data)
LLM responds
  └─ yield {token} ──────────────► │ prose fills in, parallel to component rendering
```

`step`, `token`, and `done` events are unchanged. One new event is added:

| Event Type | JSON Shape | Description |
|---|---|---|
| `render` | `{ type: "render", component: string, data: unknown }` | Sent **immediately** when tool completes — before LLM prose starts. The frontend renders the component instantly; prose streams in parallel. |

**DB persistence (critical)**: Every `renderSpec` must also be stored in the database alongside the chat message. The `chat_messages` table gets a new nullable `render_spec` (TEXT/JSON) column. When `AdminAgentService` saves a message, it also serializes and stores the `renderSpec`. This ensures that:
- On page reload or session restore, the frontend receives pre-built typed data — no re-parsing or LLM calls needed.
- Old sessions load with their visual components intact, even if the session was created before a component was built.
- The frontend never needs to reconstruct `renderSpec` from prose.

If `renderSpec` is not persisted, chat history reloads will require the frontend to either drop the visual component or re-request it from the server — both inferior to a simple DB read.

---

## Phases

### Phase 1 — JSON Contracts and Backend Infrastructure

**Agent**: Backend Agent
**Goal**: Define typed `RenderSpec` interfaces, validate them with Zod, and populate `renderSpec` fields in tool-response DTOs.

#### Checklist

- [ ] 1.1 Install dependencies
  ```bash
  npm install zod -w backend
  ```

- [ ] 1.2 Create `backend/src/modules/admin-agent/render-spec/` directory

- [ ] 1.3 Create `render-spec/render-spec.interface.ts`
  - Define `RenderSpecType` enum (all 15+ types)
  - Define `RenderSpec` union type

- [ ] 1.4 Create per-domain render spec files (each with interface + Zod schema)
  - [ ] `weather.render-spec.ts` — `WeatherCurrentRenderData`, `WeatherForecastRenderData`
  - [ ] `currency.render-spec.ts` — `CurrencyConvertRenderData`, `CurrencyRatesRenderData`
  - [ ] `users.render-spec.ts` — `UserProfileRenderData`, `UsersTableRenderData`, `RoleChangeRenderData`
  - [ ] `chat.render-spec.ts` — `ChatSessionsRenderData`, `TranscriptRenderData`, `SessionCreatedRenderData`
  - [ ] `analytics.render-spec.ts` — `AnalyticsChartRenderData`
  - [ ] `system.render-spec.ts` — `SystemStatusRenderData`
  - [ ] `db-monitor.render-spec.ts` — `DatabaseStorageRenderData`
  - [ ] `llm.render-spec.ts` — `LlmTestResultsRenderData`
  - [ ] `common.render-spec.ts` — `DeleteConfirmRenderData`

- [ ] 1.5 Extend tool-response DTOs with optional `renderSpec?: RenderSpec`

- [ ] 1.6 Create `render-spec/render-spec.service.ts`
  - Takes tool result → returns validated `RenderSpec`
  - Calls `schema.parse(data)` — throws on invalid data
  - Maps tool name/context to correct render spec type

- [ ] 1.7 Create `render-spec/render-spec.service.spec.ts`
  - Unit tests for all 15+ render types
  - Zod parse assertions for valid + invalid data

- [ ] 1.8 Add `render_spec` column to `chat_messages` table
  - TypeORM migration: `ALTER TABLE chat_messages ADD COLUMN render_spec TEXT NULL`
  - Update `ChatMessage` entity: add `renderSpec?: string` (nullable)

- [ ] 1.9 Update `AdminAgentService` streaming logic
  - After tool finishes → call `RenderSpecService` → yield `{type:"render", component, data}`
  - Yield `render` event **before** calling LLM
  - Remove `[RENDER: <type>]` marker injection from LLM prompt

- [ ] 1.10 Add `render` event type to streaming protocol documentation

#### Verification

- [ ] `npm run build` passes (backend)
- [ ] `npm run test` passes (backend)
- [ ] Unit tests for `RenderSpecService` cover all render types
- [ ] TypeORM migration runs successfully
- [ ] `render_spec` column exists in `chat_messages`

---

### Phase 2 — Core Frontend Rendering Infrastructure

**Agent**: Frontend Agent
**Goal**: Replace `AiFormat`'s GenUI block handling with a `RenderHostComponent` and simplify the directive.

#### Checklist

- [ ] 2.1 Create `frontend/src/app/features/chat/render-host/`
  - [ ] `render-host.component.ts` — switch component, selects sub-component by type
  - [ ] `render-host.component.html`
  - [ ] `render-host.component.css` (minimal layout only)

- [ ] 2.2 Create `ChatBlockComponent` interface
  ```typescript
  interface ChatBlockComponent {
    readonly blockType: string;
    readonly data: unknown;
  }
  ```

- [ ] 2.3 Create `ChatBlock` model
  ```typescript
  interface ChatBlock {
    type: 'prose' | 'render';
    renderType?: string;
    renderData?: unknown;
  }
  ```

- [ ] 2.4 Update `ChatMessage` component
  - [ ] Add `pendingRenderBlocks` signal (`RenderBlock[]`)
  - [ ] Handle incoming `{type:"render", component, data}` events
  - [ ] Render blocks via `<app-render-host>`
  - [ ] Remove `isInsideComponentStream()` and `component`-related logic from `nextChunkSize()` / `nextDelay()`
  - [ ] Persist `renderSpec` JSON on message completion (`streamState === 'completed'`)

- [ ] 2.5 Simplify `AiFormat` directive
  - [ ] Remove `extractComponentParts`, `extractProgressiveComponentParts`
  - [ ] Remove `sanitizeProgressiveComponentHtml`, `sanitizeComponentHtml`, `sanitizeComponentCss`
  - [ ] Remove `sanitizeCssRule`, `sanitizeSelectorList`, `isUnsafeSelector`
  - [ ] Remove `containsUnsafeGlobalTarget`, `startsWithLocalScope`
  - [ ] Remove `splitCssRules`, `removeCssCustomPropertyDeclarations`
  - [ ] Keep: markdown parsing, table rendering, role-badge detection, prose animations

- [ ] 2.6 Update `chat-message.html`
  - [ ] Add `RenderHostComponent` alongside prose `AiFormat` div
  - [ ] Render blocks in stream arrival order

- [ ] 2.7 Add `RenderHostComponent` to `ChatMessage` imports

#### Verification

- [ ] `npx ng build` passes (frontend)
- [ ] `npx ng test --watch=false` passes
- [ ] GenUI streaming still works during migration (compatibility layer)
- [ ] `render` events render via `RenderHostComponent`
- [ ] Prose tokens stream in parallel with render blocks

---

### Phase 3 — Build Angular Components (Batch 1: Standalone Cards)

**Agent**: Frontend Agent
**Goal**: Implement the 5 simplest, highest-value components. These replace the GenUI templates that emit compact, self-contained cards.

#### Components

| # | Component | GenUI Template | Priority Rationale |
|---|---|---|---|
| 1 | `WeatherCurrentCardComponent` | `WEATHER_CURRENT` | Most complex GenUI; rich animations; weather is high-visibility |
| 2 | `CurrencyCardComponent` | `CURRENCY` | Medium complexity; clear data structure |
| 3 | `DeleteConfirmCardComponent` | `DELETE_CONFIRM` | Trivial — 1-field card; fast win |
| 4 | `SessionCreatedCardComponent` | `CHAT_SESSION_CREATED` | Trivial — session metadata card; fast win |
| 5 | `RoleChangeCardComponent` | `USER_ROLE_CHANGE_CONFIRMATION` | Simple confirmation card; fast win |

#### Checklist

Each component follows this template:

- [ ] 3.1 `WeatherCurrentCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/weather-current-card/`
  - [ ] Create `.component.ts` — standalone, typed `input()` signal
  - [ ] Create `.component.html` — use `var(--token)` CSS only
  - [ ] Create `.component.css` — design system tokens
  - [ ] Create `.component.spec.ts` — render with sample data
  - [ ] Register in `RenderHostComponent` switch

- [ ] 3.2 `CurrencyCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/currency-card/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 3.3 `DeleteConfirmCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/delete-confirm-card/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 3.4 `SessionCreatedCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/session-created-card/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 3.5 `RoleChangeCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/role-change-card/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 3.6 Update backend LLM prompt
  - Remove ````component` GenUI instructions from weather, currency, delete-confirm, session-created, role-change tools
  - LLM writes plain prose for these tools

#### Per-Component Requirements
- [ ] All components are `standalone: true`
- [ ] All components use `var(--token)` CSS custom properties only
- [ ] All components use PrimeNG where appropriate (badges, chips, icons)
- [ ] All `.spec.ts` tests pass

#### Verification

- [ ] `npx ng build` passes (frontend)
- [ ] `npx ng test --watch=false` passes
- [ ] Each component renders correctly with sample data
- [ ] Weather card supports error state (`error?: string`)
- [ ] Interactive components use typed service calls (no `window.agentPrompt`)

---

### Phase 4 — Build Angular Components (Batch 2: Tables and Charts)

**Agent**: Frontend Agent
**Goal**: Build table-based and chart-based components that require more complex data rendering.

#### Components

| # | Component | GenUI Template | Notes |
|---|---|---|---|
| 6 | `UsersTableComponent` | `USERS_TABLE` | Replace existing PrimeNG table with typed component |
| 7 | `AnalyticsChartComponent` | `ANALYTICS_CHART` | Bar/line/pie from render data; SVG charts already in GenUI |
| 8 | `ChatSessionsListComponent` | `CHAT_SESSIONS_LIST` | Session list card |
| 9 | `UserProfileCardComponent` | `USER_PROFILE`, `USER_UPDATE_CONFIRMATION` | Reuse across both templates |
| 10 | `LlmTestResultsComponent` | `LLM_TEST_RESULTS` | Model status grid |

#### Checklist

- [ ] 4.1 `UsersTableComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/users-table/`
  - [ ] Create `.component.ts` — standalone, typed `input()` signal
  - [ ] Create `.component.html` — PrimeNG Table with typed columns
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 4.2 `AnalyticsChartComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/analytics-chart/`
  - [ ] Create `.component.ts` — support bar/line/pie chart types
  - [ ] Create `.component.html` — SVG-based charts
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch
  - [ ] Consider `@defer (on viewport)` for lazy loading

- [ ] 4.3 `ChatSessionsListComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/chat-sessions-list/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 4.4 `UserProfileCardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/user-profile-card/`
  - [ ] Create `.component.ts` — handles both `USER_PROFILE` and `USER_UPDATE_CONFIRMATION`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 4.5 `LlmTestResultsComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/llm-test-results/`
  - [ ] Create `.component.ts`
  - [ ] Create `.component.html` — model status grid
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 4.6 Update backend LLM prompt
  - Remove ````component` GenUI instructions from users, analytics, chat-sessions, profile, LLM test results tools

#### Verification

- [ ] `npx ng build` passes
- [ ] `npx ng test --watch=false` passes
- [ ] `UsersTableComponent` renders with PrimeNG Table
- [ ] `AnalyticsChartComponent` renders all chart types (bar/line/pie)
- [ ] `UserProfileCardComponent` works for both profile and update confirmation

---

### Phase 5 — Build Angular Components (Batch 3: Remaining)

**Agent**: Frontend Agent
**Goal**: Complete the remaining components — the most complex ones that require careful design.

#### Components

| # | Component | GenUI Template | Notes |
|---|---|---|---|
| 11 | `WeatherForecastComponent` | `WEATHER_FORECAST` | Horizontal 5-day card list |
| 12 | `TranscriptTimelineComponent` | `CHAT_TRANSCRIPT_TIMELINE` | Message group timeline |
| 13 | `SystemStatusDashboardComponent` | `SYSTEM_STATUS` | Metric cards + SVG bar chart |
| 14 | `DatabaseStorageMonitorComponent` | `DATABASE_STORAGE_MONITOR` | Donut chart (CSS conic-gradient) + table cards |
| 15 | `RegisterFormComponent` | `REGISTER_FORM` | Form with validation — minimal GenUI usage |

#### Checklist

- [ ] 5.1 `WeatherForecastComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/weather-forecast/`
  - [ ] Create `.component.ts` — horizontal 5-day card list
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 5.2 `TranscriptTimelineComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/transcript-timeline/`
  - [ ] Create `.component.ts` — message group timeline
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch

- [ ] 5.3 `SystemStatusDashboardComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/system-status-dashboard/`
  - [ ] Create `.component.ts` — metric cards + SVG bar chart
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch
  - [ ] Consider `@defer (on viewport)` for lazy loading

- [ ] 5.4 `DatabaseStorageMonitorComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/database-storage-monitor/`
  - [ ] Create `.component.ts` — donut chart (CSS conic-gradient) + table cards
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch
  - [ ] Consider `@defer (on viewport)` for lazy loading

- [ ] 5.5 `RegisterFormComponent`
  - [ ] Create `frontend/src/app/features/chat/blocks/register-form/`
  - [ ] Create `.component.ts` — form with validation, injects `AuthService`
  - [ ] Create `.component.html`
  - [ ] Create `.component.css`
  - [ ] Create `.component.spec.ts`
  - [ ] Register in `RenderHostComponent` switch
  - [ ] Submit calls `authService.register()` — no `window.agentPrompt`

- [ ] 5.6 Update backend LLM prompt
  - Remove ````component` GenUI instructions from forecast, transcript, system status, DB monitor, register form tools

#### Verification

- [ ] `npx ng build` passes
- [ ] `npx ng test --watch=false` passes
- [ ] `RegisterFormComponent` calls typed service method on submit
- [ ] `DatabaseStorageMonitorComponent` renders donut chart correctly
- [ ] `SystemStatusDashboardComponent` renders metric cards + bar chart

---

### Phase 6 — Backend Cleanup: Remove GenUI

**Agent**: Backend Agent
**Goal**: Delete all GenUI-related code from the backend.

#### Checklist

- [x] 6.1 Delete `gen-ui-spec.constant.ts`
- [x] 6.2 Update `system-context.constant.ts` — removed `includeGenui` param, always uses `SYSTEM_CONTEXT_BASE`
- [x] 6.3 Update `AdminAgentService` — removed `genUiSpec` logging, `shouldIncludeGenui`, `VISUAL_TRIGGER_KEYWORDS`
- [x] 6.4 Grep entire backend codebase — zero GenUI remnants
- [x] 6.5 Verification: `npm run test` passes (60/60, only pre-existing app.controller.spec.ts failure)
  - [ ] Remove `VISUAL_TRIGGER_KEYWORDS` array
  - [ ] Update `buildSystemContext()` — remove `includeGenui` parameter
  - [ ] Always use `SYSTEM_CONTEXT_BASE`

- [ ] 6.3 Update `constants/index.ts`
  - Remove `gen-ui-spec` export

- [ ] 6.4 Update `AdminAgentService`
  - [ ] Remove logic that injects GenUI spec into LLM prompt
  - [ ] Remove `genUiSpec` references from tool descriptions
  - [ ] Update Swagger decorator generation to remove GenUI instructions

- [ ] 6.5 Update `swagger-spec.json`
  - Remove GenUI instructions from tool descriptions

- [ ] 6.6 Grep entire codebase for GenUI remnants
  ```bash
  rg -n "genui|GenUi|GenUI|genUiSpec|```component|SYSTEM_CONTEXT_GENUI" backend/src
  ```
  - Delete or update all remaining references

- [ ] 6.7 Update `documents/architecture-diagram.md`
  - Remove "GenUI Rendering Path" flowchart
  - Remove `GenUiSpec` node from architecture diagram

#### Verification

- [ ] `npm run build` passes (backend)
- [ ] `npm run lint` passes (backend)
- [ ] `npm run test` passes (backend)
- [ ] Grep for `GenUI|genui|genUiSpec|```component` returns zero results in `backend/src`

---

### Phase 7 — Frontend Cleanup: Simplify AiFormat

**Agent**: Frontend Agent
**Goal**: Remove GenUI remnants from the frontend.

#### Checklist

- [x] 7.1 Removed GenUI tests from `ai-format.directive.spec.ts` — 31 tests calling removed methods deleted, 2 passing tests kept
- [x] 7.2 Verified `AiFormat` directive has no GenUI methods (sanitizeComponentHtml, isStreamingComponent, etc.)
- [x] 7.3 Grep for `genui|GenUI` in `frontend/src` — zero results
- [x] 7.4 Verification: `npx ng test --watch=false` passes (121/123, only 2 pre-existing app.spec.ts failures)

- [ ] 7.3 Remove GenUI CSS from `chat-message.css`
  - [ ] Remove `.ai-skeleton-*` styles no longer used

- [ ] 7.4 Remove `skeletonHtml()` and `ensureSkeletonStyle()` from `AiFormat`
  - Skeletons only shown during tool-step thinking now

- [ ] 7.5 Update `chat-message.ts`
  - [ ] Remove `isRenderingTemplate` computed signal
  - [ ] Remove `isInsideComponentStream()` method
  - [ ] Remove component-stream logic from `nextChunkSize()` / `nextDelay()`
  - [ ] Chunking logic simplifies: prose only

- [ ] 7.6 Update `chat-message.html`
  - [ ] Remove GenUI-specific skeleton markup
  - [ ] Remove conditional rendering for ````component` blocks

- [ ] 7.7 Update `documents/architecture-diagram.md`
  - [ ] Remove "Progressive Preview" path from streaming event flow
  - [ ] Remove `AiFormat renderComponentResponse` — simplify to prose-only path

- [ ] 7.8 Handle old chat history (pre-migration)
  - [ ] Keep minimal ````component` parser in `AiFormat`
  - [ ] Renders old blocks as styled `<blockquote>` with "legacy component" label
  - [ ] Strips all `<script>` tags
  - [ ] No DB migration needed — old sessions load without error

#### Verification

- [ ] `npx ng build` passes (frontend)
- [ ] `npx ng test --watch=false` passes
- [ ] Grep for `genui|GenUI|component` in `AiFormat` returns only markdown/prose code
- [ ] Old chat sessions (pre-migration) render without errors
- [ ] `AiFormat` is reduced to ≤400 lines (from 779)

---

## Rollout Strategy

**Do NOT big-bang replace all GenUI at once.** The migration proceeds component by component, with backward compatibility at each step.

### Compatibility Layer

During Phases 1–5, the frontend supports **both** `render` events (new path) and ` ```component ` blocks (old path):

1. `ChatMessage` detects `render` events first.
2. If a `render` event exists for a given tool result, it uses `RenderHostComponent`.
3. If no `render` event exists but `displayedContent` still contains ` ```component `, `AiFormat` handles it as before.
4. The LLM is updated incrementally: first for tools whose components are built, later for the rest.

This means:
- The frontend is always in a working state — no dead UI during migration
- Components can be built and tested in isolation before the LLM is updated
- The `render` event is added in Phase 1 but the ` ```component ` path stays alive until Phase 7

### LLM Prompt Updates (Incremental)

The LLM prompt is updated per component batch. The `[RENDER: <type>]` marker is no longer produced by the LLM — the backend sends `render` events autonomously. The LLM simply writes natural prose that references the visual.

- **After Phase 3**: Remove ` ```component ` GenUI instruction from weather, currency, delete-confirm, session-created, role-change. LLM writes plain prose.
- **After Phase 4**: Same for users, analytics, chat-sessions, profile, LLM test results.
- **After Phase 5**: Same for forecast, transcript, system status, DB monitor, register form.
- **After Phase 7**: All GenUI prompt instructions are gone from `SYSTEM_CONTEXT_GENUI`.

The `AdminAgentService` maintains a `RENDERABLE_TYPES` constant. If a tool-result arrives for a component type not yet built, the backend still sends a `render` event but the frontend's `RenderHostComponent` has no matching `@case` — render gracefully as a prose fallback ("visual component loading...").

---

## Open Questions

1. **Multi-tool rendering**: The current GenUI spec says "render multiple separate, sequential HTML GenUI components" for multi-city weather etc. With the new JSON path, this is straightforward — stream one `render` event per tool result. However, should the LLM be responsible for deciding the order, or should the backend deterministically order them by tool execution time?

   **Recommendation**: Backend orders by tool execution sequence. The LLM should not control layout — it provides prose context, the backend provides deterministic ordering.

2. **Register form interactivity** (resolved): The current `REGISTER_FORM` GenUI has `onclick` handlers via `window.agentPrompt(...)`. With custom Angular components:
   - `RegisterFormComponent` injects `AuthService` (or `ChatService`) directly
   - Submit button calls a typed method: `authService.register({ fullName, email, password })`
   - No `window.agentPrompt` — removes the string-interpolation bridge entirely
   - This applies to all interactive forms: delete confirmations, role changes, session actions
   - Each action maps to a typed service call with a `TypeScript Interface` for the payload

3. **Error states in components** (resolved): Explicit `error?: string` field on each render data interface. Components render their own error/empty states from this field — the LLM no longer produces error HTML.

4. **` ```component ` in old chat history**: Chat sessions saved before the migration contain ` ```component ` blocks in message content. After Phase 7, `AiFormat` no longer handles ` ```component `. Decision:
   - Option (b) — keep a **minimal** ` ```component ` parser in `AiFormat` that renders old blocks as a styled `<blockquote>` block with a small "legacy component" label
   - No DB migration needed; old sessions load without error
   - The minimal parser does not re-implement the full sanitizer — it strips all `<script>` and renders a plain styled block

5. **AiFormat renaming**: Keep as `AiFormat` — rename is cosmetic and increases diff for no functional benefit.

6. **`renderSpec` DB schema migration**: Required, not optional. Must land in Phase 1, not deferred. Without it, chat history reloads cannot restore visual components.
   - `ALTER TABLE chat_messages ADD COLUMN render_spec TEXT NULL`
   - `ChatMessage` entity: `renderSpec?: string`
   - Serialize `renderSpec` as JSON string on save; deserialize on load
   - This is a hard dependency for the compatibility layer — if `renderSpec` is not persisted, old sessions will lose their visual components

---

## Success Criteria

- [ ] All 15 GenUI templates replaced by typed Angular components
- [ ] Zero ` ```component ` code in the codebase (backend + frontend)
- [ ] Zero `genUiSpec`, `SYSTEM_CONTEXT_GENUI`, `DESIGN_TOKENS_REFERENCE` references in backend
- [ ] `AiFormat` is reduced to ≤400 lines (from 779) — GenUI handling removed
- [ ] `AdminAgentService` has no HTML/CSS generation logic
- [ ] `RenderSpecService` has 100% coverage of all render types with unit tests
- [ ] Every new Angular component has a `.spec.ts` test
- [ ] All builds pass: `npm run build` (backend), `npx ng build` (frontend), `npm run test` (backend), `npx ng test --watch=false` (frontend)
- [ ] Architecture diagram updated: GenUI paths removed
- [ ] Old chat sessions (pre-migration) render without errors
- [ ] `render_spec` column exists in `chat_messages`; messages with visual blocks store serialized JSON
- [ ] All `RenderSpec` interfaces have matching Zod schemas; `RenderSpecService.parse()` is called at every tool-result → render event path

---

## File Inventory

### Backend (delete)

```
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts   ← DELETE
backend/src/modules/admin-agent/constants/system-context.constant.ts  ← EDIT (remove GenUI blocks)
backend/src/modules/admin-agent/constants/index.ts                   ← EDIT (remove gen-ui-spec export)
```

### Backend (edit)

```
backend/src/modules/admin-agent/entities/chat-message.entity.ts   ← ADD renderSpec column + field
backend/src/modules/admin-agent/services/admin-agent.service.ts    ← add render event streaming + renderSpec persistence
backend/src/modules/admin-agent/admin-agent.controller.ts          ← streaming protocol unchanged (adds render event type)
backend/swagger-spec.json                                          ← remove GenUI from descriptions
documents/architecture-diagram.md                                 ← remove GenUI rendering path
```

### Backend (package dependency)

```
npm install zod   # for RenderSpec Zod schemas (Phase 1)
npm install -D @types/zod   # if using TypeScript strict mode
```

### Backend (add)

```
backend/src/modules/admin-agent/render-spec/
  render-spec.interface.ts
  weather.render-spec.ts
  currency.render-spec.ts
  users.render-spec.ts
  chat.render-spec.ts
  analytics.render-spec.ts
  system.render-spec.ts
  db-monitor.render-spec.ts
  llm.render-spec.ts
  common.render-spec.ts
  render-spec.service.ts
  render-spec.service.spec.ts
```

### Backend (edit)

```
backend/src/modules/admin-agent/services/admin-agent.service.ts       ← add render event streaming
backend/src/modules/admin-agent/admin-agent.controller.ts             ← streaming protocol unchanged
backend/swagger-spec.json                                            ← remove GenUI from descriptions
documents/architecture-diagram.md                                    ← remove GenUI rendering path
```

### Frontend (add)

```
frontend/src/app/features/chat/blocks/
  render-host/
    render-host.component.ts
    render-host.component.html
    render-host.component.css
  weather-current-card/
    weather-current-card.component.ts
    weather-current-card.component.html
    weather-current-card.component.css
    weather-current-card.component.spec.ts
  currency-card/
    currency-card.component.ts
    currency-card.component.html
    currency-card.component.css
    currency-card.component.spec.ts
  delete-confirm-card/
  session-created-card/
  role-change-card/
  users-table/
  analytics-chart/
  chat-sessions-list/
  user-profile-card/
  llm-test-results/
  weather-forecast/
  transcript-timeline/
  system-status-dashboard/
  database-storage-monitor/
  register-form/
```

### Frontend (edit)

```
frontend/src/app/core/directives/ai-format.directive.ts    ← remove GenUI handling (~200 lines removed)
frontend/src/app/features/chat/chat-message/chat-message.ts  ← add render event handling
frontend/src/app/features/chat/chat-message/chat-message.html  ← add RenderHostComponent
frontend/src/app/features/chat/chat-message/chat-message.css   ← remove GenUI skeleton styles
```

### Frontend (cleanup after Phase 7)

```
frontend/src/app/assets/styles/_utilities.css   ← remove .genui-root, .genui-skeleton rules
frontend/src/app/assets/styles/_layout.css      ← remove any GenUI-related rules
```

---

## Notes

- The migration is long but fully incremental. Each phase is independently verifiable.
- The compatibility layer (Phase 1 note) means the frontend is always in a working state.
- LLM cost savings begin immediately after Phase 3 — weather and currency are among the most token-heavy GenUI templates.
- The `RenderSpecService` is the most important new piece: it must be thoroughly tested so that the frontend components always receive correctly shaped data.
- Consider adding a `RenderSpecType` enum in `backend/src/modules/admin-agent/render-spec/render-spec.interface.ts` for type safety on the union:
  ```typescript
  export enum RenderSpecType {
    WeatherCurrent = 'weather-current',
    WeatherForecast = 'weather-forecast',
    Currency = 'currency',
    // ...
  }
  ```
- **Zod**: Install `zod` in the backend as a production dependency and `zod-to-ts` or inline `z.infer<>` for TypeScript inference. Keep schemas co-located with their interfaces in each `*.render-spec.ts` file.
- **`@defer`**: Not all 15 components need lazy loading. Only heavy ones (charts, DB monitor, analytics) benefit. Over-using `@defer` on simple cards adds complexity for no gain. Default to synchronous rendering; profile with bundle size before adding `@defer`.
- **`renderSpec` DB column**: TypeORM stores JSON columns as `type: 'simple-json'` or `type: 'json'` depending on the database. SQLite (dev) supports both; PostgreSQL prefers `jsonb` for queryability. Use a consistent serialization strategy — `JSON.stringify` on save, `JSON.parse` on load — or rely on TypeORM's built-in JSON transformation.
- **Interactive components** (RegisterForm, DeleteConfirm): These call typed service methods, not `window.agentPrompt`. Each has a clear `output()` event that the parent `ChatMessage` or `ChatComponent` subscribes to and dispatches the appropriate API call.
