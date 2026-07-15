# GenUI → JSON + Custom Components Migration Plan

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

The `AdminAgentService` populates `renderSpec` at the same time it prepares tool results for the LLM context. The LLM is **not** instructed to generate HTML — it receives the data + `renderSpec` in its tool-result context, and it produces a short prose summary + a structured marker:

```
[RENDER: weather-current]
```

The backend's streaming logic detects `RENDER:` markers and streams a structured JSON block instead of raw HTML:

```json
{"type":"render","component":"weather-current","data":{...}}
```

The `token` event still carries partial text chunks (prose), but the `render` event carries typed JSON.

### Frontend Change

`AiFormat` is simplified: the ` ```component ` parsing and all sanitization code is removed. It becomes a markdown renderer with a new `RenderHostComponent` for structured blocks.

`ChatMessage` detects `RENDER:` markers in the streamed content and routes them to `RenderHostComponent` with the correct component type and data.

`RenderHostComponent` is a thin switch — it selects the right Angular component and passes typed data:

```typescript
// render-host.component.ts
@Component({
  selector: 'app-render-host',
  template: `
    @switch (componentType) {
      @case ('weather-current') { <app-weather-current-card [data]="renderData" /> }
      @case ('currency') { <app-currency-card [data]="renderData" /> }
      ...
    }
  `
})
export class RenderHostComponent {
  componentType = input.required<string>();
  renderData = input.required<Record<string, unknown>>();
}
```

### Streaming Protocol Update

```
Backend                              Frontend
─────                              ───────
Tools execute
  ├─ yield {step} ──────────────► │ step notifications (unchanged)
  └─ LLM generates response
      ├─ prose tokens ──────────► │ token events (unchanged)
      └─ [RENDER: type] ────────► │ detect marker in stream
          └─ yield {render, type, data} ──► │ RenderHostComponent receives typed data
```

`step`, `token`, and `done` events are unchanged. One new event is added:

| Event Type | JSON Shape | Description |
|---|---|---|
| `render` | `{ type: "render", component: string, data: unknown }` | Structured component data from `renderSpec` |

---

## Phases

### Phase 1 — JSON Contracts and Backend Infrastructure

**Goal**: Define typed `RenderSpec` interfaces and populate `renderSpec` fields in tool-response DTOs.

1. Create `backend/src/modules/admin-agent/render-spec/` directory.
2. Define a shared `RenderSpec` union type and per-domain interfaces:

```
render-spec/
  render-spec.interface.ts   — union type: RenderSpecWeatherCurrent | RenderSpecCurrency | ...
  weather.render-spec.ts     — WeatherCurrentRenderData, WeatherForecastRenderData
  currency.render-spec.ts    — CurrencyConvertRenderData, CurrencyRatesRenderData
  users.render-spec.ts       — UserProfileRenderData, UsersTableRenderData, RoleChangeRenderData
  chat.render-spec.ts        — ChatSessionsRenderData, TranscriptRenderData, SessionCreatedRenderData
  analytics.render-spec.ts   — AnalyticsChartRenderData
  system.render-spec.ts    — SystemStatusRenderData
  db-monitor.render-spec.ts  — DatabaseStorageRenderData
  llm.render-spec.ts         — LlmTestResultsRenderData
  common.render-spec.ts      — DeleteConfirmRenderData
```

3. Extend existing tool-response DTOs with optional `renderSpec?: RenderSpec` field.
4. Create a `RenderSpecService` that takes a tool result and returns the appropriate `RenderSpec` — mapping raw DB/API data to the typed render data shape. This service is called by `AdminAgentService` when processing tool results, **before** sending them to the LLM.
5. Update `AdminAgentService` streaming logic:
   - Detect `RENDER:` prose markers produced by the LLM
   - Stream `render` events with the pre-built `renderSpec` data
   - The LLM prompt is updated to output `[RENDER: <type>]` instead of ` ```component ` HTML
6. Add `render` event to the streaming protocol documentation.

**Verification**: `npm run build` passes; unit tests for `RenderSpecService` cover all 15+ render types.

**Who**: Backend agent.

---

### Phase 2 — Core Frontend Rendering Infrastructure

**Goal**: Replace `AiFormat`'s GenUI block handling with a `RenderHostComponent` and simplify the directive.

1. Create `frontend/src/app/features/chat/render-host/`:
   - `render-host.component.ts` — switch component, selects sub-component by type
   - `render-host.component.html`
   - `render-host.component.css` (minimal — only layout)
2. Create a base `ChatBlockComponent` interface:
   ```typescript
   interface ChatBlockComponent {
     readonly blockType: string;
     readonly data: unknown;
   }
   ```
3. Update `ChatMessage` component:
   - Detect `[RENDER: <type>]` markers in `displayedContent` alongside existing ` ```component ` detection
   - When a `render` event arrives from the stream, route to `RenderHostComponent`
   - Remove `isInsideComponentStream()` logic from `nextChunkSize()` / `nextDelay()` — the GenUI streaming queue logic no longer applies
4. Simplify `AiFormat` directive:
   - Remove all ` ```component ` parsing, `extractComponentParts`, `extractProgressiveComponentParts`, `sanitizeProgressiveComponentHtml`, `sanitizeComponentHtml`, `sanitizeComponentCss`, `sanitizeCssRule`, `sanitizeSelectorList`, `isUnsafeSelector`, `containsUnsafeGlobalTarget`, `startsWithLocalScope`, `splitCssRules`, `removeCssCustomPropertyDeclarations` — approximately **200 lines** removed
   - Keep: markdown parsing, table rendering, role-badge detection, prose animations
   - Rename `ai-format.directive.ts` to `chat-prose-format.directive.ts` if desired, or keep as `AiFormat` (scope reduction only)
5. Update `chat-message.html` to render `RenderHostComponent` alongside the prose `AiFormat` div.
6. Add a `ChatBlock` model: `{ type: 'prose' | 'render', renderType?: string, renderData?: unknown }`.

**Verification**: `npx ng build` passes; `npx ng test --watch=false` passes; GenUI streaming still works (prose + skeleton) during migration.

**Who**: Frontend agent.

---

### Phase 3 — Build Angular Components (Batch 1: Standalone Cards)

**Goal**: Implement the 5 simplest, highest-value components. These replace the GenUI templates that emit compact, self-contained cards.

| # | Component | GenUI Template | Priority Rationale |
|---|---|---|---|
| 1 | `WeatherCurrentCardComponent` | `WEATHER_CURRENT` | Most complex GenUI; rich animations; weather is high-visibility |
| 2 | `CurrencyCardComponent` | `CURRENCY` | Medium complexity; clear data structure |
| 3 | `DeleteConfirmCardComponent` | `DELETE_CONFIRM` | Trivial — 1-field card; fast win |
| 4 | `SessionCreatedCardComponent` | `CHAT_SESSION_CREATED` | Trivial — session metadata card; fast win |
| 5 | `RoleChangeCardComponent` | `USER_ROLE_CHANGE_CONFIRMATION` | Simple confirmation card; fast win |

Each component:
- Lives in `frontend/src/app/features/chat/blocks/`
- Has its own `.ts`, `.html`, `.css` file
- Receives a typed `input()` signal for its data
- Uses only `var(--token)` CSS custom properties
- Has a `.spec.ts` test that verifies rendering with sample data
- Uses PrimeNG components where appropriate (badges, chips, icons)

**Verification**: `npx ng build`; each component's spec passes with `npx ng test --watch=false`.

**Who**: Frontend agent.

---

### Phase 4 — Build Angular Components (Batch 2: Tables and Charts)

| # | Component | GenUI Template | Notes |
|---|---|---|---|
| 6 | `UsersTableComponent` | `USERS_TABLE` | Replace existing PrimeNG table with typed component |
| 7 | `AnalyticsChartComponent` | `ANALYTICS_CHART` | Bar/line/pie from render data; SVG charts already in GenUI |
| 8 | `ChatSessionsListComponent` | `CHAT_SESSIONS_LIST` | Session list card |
| 9 | `UserProfileCardComponent` | `USER_PROFILE`, `USER_UPDATE_CONFIRMATION` | Reuse across both templates |
| 10 | `LlmTestResultsComponent` | `LLM_TEST_RESULTS` | Model status grid |

**Verification**: `npx ng build`; component specs pass.

**Who**: Frontend agent.

---

### Phase 5 — Build Angular Components (Batch 3: Remaining)

| # | Component | GenUI Template | Notes |
|---|---|---|---|
| 11 | `WeatherForecastComponent` | `WEATHER_FORECAST` | Horizontal 5-day card list |
| 12 | `TranscriptTimelineComponent` | `CHAT_TRANSCRIPT_TIMELINE` | Message group timeline |
| 13 | `SystemStatusDashboardComponent` | `SYSTEM_STATUS` | Metric cards + SVG bar chart |
| 14 | `DatabaseStorageMonitorComponent` | `DATABASE_STORAGE_MONITOR` | Donut chart (CSS conic-gradient) + table cards |
| 15 | `RegisterFormComponent` | `REGISTER_FORM` | Form with validation — minimal GenUI usage |

**Verification**: `npx ng build`; component specs pass.

**Who**: Frontend agent.

---

### Phase 6 — Backend Cleanup: Remove GenUI

**Goal**: Delete all GenUI-related code from the backend.

1. Delete `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts` entirely.
2. Update `system-context.constant.ts`:
   - Remove `DESIGN_TOKENS_REFERENCE` (no longer needed — components use tokens directly)
   - Remove `SYSTEM_CONTEXT_GENUI` constant
   - Remove `VISUAL_TRIGGER_KEYWORDS` array
   - Update `buildSystemContext()` — remove the `includeGenui` parameter; always use `SYSTEM_CONTEXT_BASE`
3. Update `AdminAgentService`:
   - Remove any logic that injects GenUI spec into the LLM prompt
   - Remove `genUiSpec` references from tool descriptions
   - Update Swagger decorator generation to remove GenUI instructions from tool descriptions
4. Run a grep across the entire codebase for `genui`, `GenUi`, `GenUI`, `genUiSpec`, ````component`, `SYSTEM_CONTEXT_GENUI` — delete or update all remaining references.
5. Update `swagger-spec.json` to remove GenUI instructions from tool descriptions.
6. Update `documents/architecture-diagram.md` — remove the "GenUI Rendering Path" flowchart and the `GenUiSpec` node from the architecture diagram.

**Verification**: `npm run build` passes; `npm run lint` passes; grep for `GenUI\|genui\|genUiSpec\|```component` returns zero results in `backend/src`.

**Who**: Backend agent.

---

### Phase 7 — Frontend Cleanup: Simplify AiFormat

**Goal**: Remove GenUI remnants from the frontend entirely.

1. Delete all GenUI-specific CSS rules from global stylesheets (search for `.genui-root`, `.genui-skeleton`, etc. in `_utilities.css` and `_layout.css`).
2. Remove ` ```component ` related code from `AiFormat` — the directive should now only handle markdown.
3. Remove GenUI-specific CSS classes from `chat-message.css` (any `.ai-skeleton-*` styles that are no longer used after GenUI removal).
4. Remove `skeletonHtml()` and `ensureSkeletonStyle()` from `AiFormat` — skeletons are only shown during tool-step thinking now, not during component streaming.
5. Update `chat-message.ts` — remove `isRenderingTemplate` computed signal, `isInsideComponentStream()` method, and all component-stream-related logic from `nextChunkSize()` / `nextDelay()`. The chunking logic becomes simpler: prose only, no component vs. prose distinction.
6. Update `chat-message.html` — remove any GenUI-specific skeleton markup or conditional rendering for ` ```component ` blocks.
7. Update `documents/architecture-diagram.md` — remove the streaming event flow diagram's GenUI-specific path (`Progressive Preview`, `AiFormat renderComponentResponse`) — simplify to prose-only path.

**Verification**: `npx ng build` passes; `npx ng test --watch=false` passes; grep for `component\|genui\|GenUI` in `AiFormat` returns only markdown/prose code.

**Who**: Frontend agent.

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

The LLM prompt is updated per component batch:

- **After Phase 3**: LLM no longer emits ` ```component ` for weather, currency, delete-confirm, session-created, role-change. Instead it outputs `[RENDER: weather-current]` etc.
- **After Phase 4**: Same for users, analytics, chat-sessions, profile, LLM test results.
- **After Phase 5**: Same for forecast, transcript, system status, DB monitor, register form.
- **After Phase 7**: All GenUI prompt instructions are gone.

The `AdminAgentService` maintains a `RENDERABLE_TYPES` constant (array of component types with built components). When the LLM outputs `[RENDER: <type>]` for a type not yet built, the service falls back to prose description — no broken UI.

---

## Open Questions

1. **Multi-tool rendering**: The current GenUI spec says "render multiple separate, sequential HTML GenUI components" for multi-city weather etc. With the new JSON path, this is straightforward — stream one `render` event per tool result. However, should the LLM be responsible for deciding the order, or should the backend deterministically order them by tool execution time?

2. **Partial/streaming JSON**: The `render` event is streamed as a complete JSON object after the LLM produces the `[RENDER: <type>]` marker. Should we stream component data progressively (e.g., chart data first, then animation triggers) or always as one complete block? Recommendation: one complete block — simpler, less frontend complexity.

3. **Error states in components**: Some tool results can be partial (e.g., weather API returns null). Should components handle their own error/empty states, or should the `renderSpec` include an explicit `error?: string` field? Recommendation: explicit `error?: string` field on each render data interface — components render error states, not the LLM.

4. **Register form interactivity**: The current `REGISTER_FORM` GenUI has `onclick` handlers that call `window.agentPrompt(...)`. With custom Angular components, button clicks can call Angular methods directly. Should the form submit trigger a new agent tool call (via `ChatService`) or redirect through the existing `window.agentPrompt` bridge? Recommendation: direct `ChatService` call — removes the `window.agentPrompt` dependency entirely.

5. **` ```component ` in old chat history**: Chat sessions saved before the migration contain ` ```component ` blocks in message content. These are stored as plain text and rendered by `AiFormat` on page load. After Phase 7, `AiFormat` no longer handles ` ```component `. Should we:
   a. Migrate old messages: run a one-time DB script to convert stored ` ```component ` blocks to structured JSON on read?
   b. Keep a minimal ` ```component ` handler in `AiFormat` permanently for backward compatibility with old sessions?
   Recommendation: Option (b) — keep a minimal ` ```component ` parser in `AiFormat` that renders old blocks as a styled quote block (not the full GenUI), with a note "rendered from legacy format". Simple, no migration needed.

6. **AiFormat renaming**: The directive still handles markdown, badges, tables. Rename to `ChatProseFormatDirective` to clarify its reduced scope? Or keep as `AiFormat` for minimal diff? Recommendation: keep as `AiFormat` — rename is cosmetic and increases diff for no functional benefit.

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

---

## File Inventory

### Backend (delete)

```
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts   ← DELETE
backend/src/modules/admin-agent/constants/system-context.constant.ts  ← EDIT (remove GenUI blocks)
backend/src/modules/admin-agent/constants/index.ts                   ← EDIT (remove gen-ui-spec export)
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
- The compatibility layer (Phase 1 note) means the frontend is never in a broken state.
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
