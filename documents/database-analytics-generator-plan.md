# Database Analytics Generator Plan

## Goal

Add a safe analytics tool that lets the admin agent answer business-style questions from database data and render the result as rich GenUI.

The tool should support natural admin questions such as:

- "Show me a chart of user signups this month."
- "What is the user distribution by role?"
- "How many active sessions were there this week?"

Expected result:

- The agent selects a supported analytics metric.
- The backend runs a controlled database query.
- The backend returns structured analytics data.
- The agent renders the data as GenUI, usually with SVG charts such as bar, pie, or line charts.

## Product Principle

The admin should not manually choose tables, columns, joins, or chart internals. The admin asks a business question, and the agent maps that question to a supported analytics request.

The tool should behave like a built-in analyst inside the admin system:

- Natural language comes from the user.
- The agent chooses a supported metric from a known catalog.
- The server runs only predefined safe database queries.
- The response shape is consistent.
- GenUI renders the most appropriate chart.

## Development Style

This implementation should follow the project style:

- Keep controllers thin.
- Put business logic in services.
- Use DTOs for request and response shapes.
- Use explicit supported metrics instead of dynamic SQL.
- Use Swagger metadata for every agent-facing endpoint.
- Keep `genUiSpec` in the gen-ui-spec constants area when it is shared or large.
- Add tests around validation and metric selection before expanding the metric catalog.
- Avoid frontend work unless a real frontend analytics page is explicitly requested.

This is an API and agent-tool feature first. A dedicated Angular analytics dashboard is not required for the first version.

## Initial Scope

The first version should not be a free-form SQL generator. That is too risky and unnecessary for the current product stage.

Use a supported metric catalog:

- User distribution by role.
- User signups over time.
- Active sessions over time.
- Basic module usage over time, only if an activity/audit table already exists.

Each supported metric is defined in code with limited parameters. The client and agent never send table names, column names, joins, raw SQL, or query fragments.

## Recommended Target Structure

```txt
backend/src/modules/
  analytics/
    analytics.module.ts
    analytics.controller.ts
    analytics.service.ts
    dto/
      analytics-query.dto.ts
      analytics-query-response.dto.ts
      analytics-series-point.dto.ts
    constants/
      analytics-catalog.constant.ts

  admin-agent/
    constants/
      agent-instructions.constant.ts
```

## Proposed Module Name

### `AnalyticsModule`

Use for agent-safe database analytics and chart-ready data.

Suggested endpoint:

```txt
POST /analytics/query
```

## Endpoint Contract

### Request

```ts
type AnalyticsQueryRequest = {
  metric: AnalyticsMetric;
  range?: {
    from: string;
    to: string;
  };
  groupBy?: AnalyticsGroupBy;
};
```

Rules:

- `metric` must be one of the numeric catalog enum values.
- `groupBy` must be allowed for the selected metric.
- `range.from` and `range.to` must be valid dates when provided.
- If no range is provided, the service should choose a conservative default such as the last 30 days.
- The backend should enforce a maximum date range to protect the database.

### Response

```ts
type AnalyticsQueryResponse = {
  title: string;
  chartType: "bar" | "line" | "pie";
  xAxisLabel?: string;
  yAxisLabel?: string;
  series: Array<{
    label: string;
    value: number;
    date?: string;
  }>;
  summary: string;
};
```

The response should stay simple so the agent can render SVG without complex client-side chart logic.

## Analytics Catalog

Create:

```txt
backend/src/modules/analytics/constants/analytics-catalog.constant.ts
```

Each catalog item should define:

- Metric id.
- Display title.
- Recommended chart type.
- Allowed `groupBy` values.
- Default date range.
- Short agent-facing description.

Suggested initial catalog:

| Metric Enum | Meaning                     | Chart Type | Allowed Grouping               | Notes                            |
| ----------- | --------------------------- | ---------- | ------------------------------ | -------------------------------- |
| `1`         | `users_by_role`             | `pie`      | `role`                         | No date range required initially |
| `2`         | `user_signups_over_time`    | `line`     | `day`, `week`, `month`         | Uses user creation date          |
| `3`         | `active_sessions_over_time` | `bar`      | `hour`, `day`, `week`, `month` | Uses chat/session timestamps     |

## GenUI Instruction

Add a dedicated analytics chart instruction in:

```txt
backend/src/modules/admin-agent/constants/agent-instructions.constant.ts
```

The instruction should tell the agent:

- Use the analytics endpoint only for supported database metrics.
- Render only values that appear in the tool response.
- Do not invent missing values to make a chart look full.
- Pick the chart type from `chartType`.
- Render an empty state when `series` is empty or every value is `0`.

### SVG Rendering Rules

The GenUI should render SVG charts directly in the returned HTML.

Requirements:

- Use a fixed `viewBox`, for example `0 0 500 260`.
- Normalize numeric values against `maxValue`.
- Keep internal padding for titles, axes, labels, and legends.
- If `maxValue` is `0`, render an empty state instead of a broken chart.
- Use system CSS variables only when the token name is known.
- Avoid hardcoded chart values that are not present in the response.
- Use `role="img"` and a useful `aria-label`.

Example scaling rule:

```txt
maxValue = Math.max(...values)
y = chartBottom - (value / maxValue) * chartHeight
```

### Empty State

When there is no chartable data, the agent should render a stable empty state inside the same GenUI area.

Suggested message for the UI:

```txt
No data available for the selected range
```

## Reasons To Avoid A Chart Library In Version 1

Manual SVG is enough for the first version because:

- GenUI can already return HTML/SVG directly.
- The first metric set is small.
- The backend response can stay chart-ready.
- No new frontend dependency is required.
- Design control stays inside the agent instruction.

If advanced interaction is needed later, a chart library can be considered in a separate frontend-focused step.

## Implementation Steps

### Step 1 - Define DTOs

Create:

```txt
backend/src/modules/analytics/dto/analytics-query.dto.ts
backend/src/modules/analytics/dto/analytics-query-response.dto.ts
backend/src/modules/analytics/dto/analytics-series-point.dto.ts
```

Verification:

- DTOs use Swagger decorators.
- DTO validation rejects unknown metrics.
- DTO validation rejects unsupported `groupBy` values.
- DTO validation rejects invalid date ranges.

### Step 2 - Define The Metric Catalog

Create:

```txt
backend/src/modules/analytics/constants/analytics-catalog.constant.ts
```

Verification:

- Every supported metric is defined in one place.
- No SQL is built from free text.
- Every metric has a default chart type.

### Step 3 - Create `AnalyticsModule`

Create:

```txt
backend/src/modules/analytics/analytics.module.ts
backend/src/modules/analytics/analytics.controller.ts
backend/src/modules/analytics/analytics.service.ts
```

Register `AnalyticsModule` in `AppModule`.

Verification:

- Backend build passes.
- The module does not depend on unrelated feature modules except required repositories/entities.

### Step 4 - Implement Safe Queries

Add explicit service handlers for:

- `users_by_role`
- `user_signups_over_time`
- `active_sessions_over_time`

Verification:

- Each metric returns `AnalyticsQueryResponse`.
- Unknown metrics are rejected.
- Unsupported groupings are rejected.
- Invalid dates are rejected.
- The client cannot send table names, column names, joins, or raw SQL.

### Step 5 - Add Controller And Swagger Metadata

Expose:

```txt
POST /analytics/query
```

Controller requirements:

- Use `@ApiTags` directly before `@Controller`.
- Use `@ApiOperation({...} as CustomApiOperationOptions)`.
- Include `summaryHe`.
- Include `toolIcon`.
- Include `genUiSpec`.
- Add request and response decorators.
- Keep the controller thin.

Verification:

- Swagger exposes `/analytics/query`.
- The endpoint appears as an agent tool.
- The tool metadata clearly describes when to use the analytics tool.

### Step 6 - Add GenUI Chart Instruction

Add analytics chart rendering guidance to:

```txt
backend/src/modules/admin-agent/constants/agent-instructions.constant.ts
```

Verification:

- The instruction supports `pie`, `bar`, and `line`.
- The instruction includes empty-state behavior.
- The instruction forbids invented values.
- The instruction tells the agent to use response data only.

### Step 7 - Tests

Add focused backend tests for:

- Known metric returns a valid response.
- Unknown metric is rejected.
- Unsupported `groupBy` is rejected.
- Invalid date range is rejected.
- Empty data returns a valid empty `series`.

Verification commands:

```txt
npm run test -w backend
npm run build -w backend
```

## Example Prompts

### Users By Role

Admin prompt:

```txt
Show me a pie chart of users by role.
```

Tool request:

```json
{
  "metric": 1,
  "groupBy": 5
}
```

Expected chart:

```txt
pie
```

### Signups Over Time

Admin prompt:

```txt
Show me user signups this month as a chart.
```

Tool request:

```json
{
  "metric": 2,
  "groupBy": 2,
  "range": {
    "from": "2026-06-01",
    "to": "2026-06-30"
  }
}
```

Expected chart:

```txt
line
```

### Active Sessions Over Time

Admin prompt:

```txt
How many active sessions did we have this week by day?
```

Tool request:

```json
{
  "metric": 3,
  "groupBy": 2
}
```

Expected chart:

```txt
bar
```

## Risks And Decisions

### Risk: Free SQL From The Agent

Do not allow the agent to write SQL directly. The agent chooses a metric from the catalog, and the server owns the query implementation.

### Risk: Nice Charts With Incorrect Data

The SVG must be generated from response data only. The agent must not invent values to fill a chart.

### Risk: Database Load

Limit date ranges. Consider short caching only after real usage shows that the queries are expensive.

### Decision: Real-Time Analytics

"Real time" can mean either manual refresh or automatic polling/streaming.

Version 1 should use manual refresh only. Polling or streaming should be added only after an explicit product requirement.

## Suggested Implementation Order

1. Add DTOs and metric enums.
2. Add the analytics catalog.
3. Create `AnalyticsModule`, `AnalyticsController`, and `AnalyticsService`.
4. Implement the first three metrics.
5. Add Swagger and agent tool metadata.
6. Add GenUI chart instructions.
7. Add focused backend tests.
8. Regenerate `backend/swagger-spec.json` if the project workflow requires it.

## Open Decisions

- Should analytics be protected by admin-only guards from day one?
- Should `users_by_role` include inactive/deleted users if such states exist later?
- What is the maximum allowed date range for time-based metrics?
- Should the first version include module usage, or wait until there is a clear activity table?
- Should response summaries be generated by the service, the agent, or both?

## Agent Checklist By Module

### Agent 1 - Analytics DTOs And Catalog

Owner: `backend/src/modules/analytics/dto/` and `backend/src/modules/analytics/constants/`

- [x] Create `AnalyticsMetric` enum with values starting from `1` if implemented as a TypeScript enum.
- [x] Create `AnalyticsGroupBy` enum with values starting from `1` if implemented as a TypeScript enum.
- [x] Create `AnalyticsQueryDto`.
- [x] Create `AnalyticsSeriesPointDto`.
- [x] Create `AnalyticsQueryResponseDto`.
- [x] Add Swagger decorators to every DTO field.
- [x] Define `analytics-catalog.constant.ts`.
- [x] Verify invalid metrics and invalid groupings are rejected.

### Agent 2 - Analytics Service

Owner: `backend/src/modules/analytics/analytics.service.ts`

- [x] Create `AnalyticsService`.
- [x] Inject only the repositories required for the initial metrics.
- [x] Implement `users_by_role`.
- [x] Implement `user_signups_over_time`.
- [x] Implement `active_sessions_over_time`.
- [x] Apply default date ranges when missing.
- [x] Enforce maximum date range.
- [x] Return the same response shape for every metric.
- [x] Verify there is no free-form SQL from request text.

### Agent 3 - Analytics Controller And Module

Owner: `backend/src/modules/analytics/analytics.controller.ts` and `backend/src/modules/analytics/analytics.module.ts`

- [x] Create `AnalyticsModule`.
- [x] Register required TypeORM repositories.
- [x] Register `AnalyticsModule` in `AppModule`.
- [x] Create `AnalyticsController`.
- [x] Add `POST /analytics/query`.
- [x] Keep the controller thin.
- [x] Add complete Swagger metadata.
- [x] Add `summaryHe`, `toolIcon`, and `genUiSpec`.

### Agent 4 - gen-ui-spec / GenUI

Owner: `backend/src/modules/admin-agent/constants/agent-instructions.constant.ts`

- [x] Add analytics chart GenUI instruction.
- [x] Include rules for `pie`, `bar`, and `line`.
- [x] Include fixed `viewBox` guidance.
- [x] Include numeric normalization guidance.
- [x] Include empty-state guidance.
- [x] Explicitly forbid invented values.
- [x] Verify the instruction uses existing CSS variables only when names are known.

### Agent 5 - Tests And Verification

Owner: backend test files and generated Swagger output

- [x] Add focused tests for supported metrics.
- [x] Add focused tests for unknown metrics.
- [x] Add focused tests for unsupported `groupBy`.
- [x] Add focused tests for invalid date ranges.
- [x] Run backend tests.
- [x] Run backend build.
- [x] Regenerate `backend/swagger-spec.json` if required.
- [x] Verify `/analytics/query` appears in Swagger.
- [x] Verify no unrelated endpoints changed.

### Agent 6 - Frontend Decision

Owner: frontend route/service only if product asks for a page

- [x] Do not add a frontend analytics page by default.
- [ ] If a page is requested later, create an Angular service for `/analytics/query`.
- [ ] If a page is requested later, create a focused feature page using `PageStates`.
- [ ] If a page is requested later, use existing global styles and CSS tokens only.
- [ ] Verify frontend build after any frontend change.
