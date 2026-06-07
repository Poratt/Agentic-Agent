# Database Storage Monitor Plan

## Goal

Add an admin-safe database maintenance tool that reports current database storage usage by table.

The tool should help the admin answer operational questions such as:

- "What is the current size of our database tables?"
- "Which tables are the largest in the system?"
- "Show me storage usage for users, chat_messages, and chat_sessions."

Expected result:

- The agent calls a dedicated backend tool.
- The backend reads metadata from MySQL `information_schema`.
- The backend returns table-level row counts and storage sizes.
- The agent renders a GenUI maintenance dashboard with a pie chart and table cards.

## Product Value

This is an operations and maintenance feature, not a business analytics feature.

It helps the admin:

- See which tables consume the most storage.
- Detect tables that are growing faster than expected.
- Understand whether chat history, user data, or other modules are becoming storage-heavy.
- Prevent storage issues before they become production incidents.

## Development Style

Follow the project style:

- Keep controllers thin.
- Put database inspection logic in a service.
- Use DTOs for response shapes.
- Use Swagger metadata for every agent-facing endpoint.
- Keep large GenUI instructions in the shared GenUI constants area.
- Do not expose raw SQL, table names from user input, or arbitrary database metadata.
- Do not add a frontend page in version 1 unless explicitly requested.

This is an API and agent-tool feature first.

## Recommended Target Structure

```txt
backend/src/modules/
  database-monitor/
    database-monitor.module.ts
    database-monitor.controller.ts
    database-monitor.service.ts
    dto/
      database-table-storage.dto.ts
      database-storage-summary.dto.ts
      database-storage-result-response.dto.ts

  admin-agent/
    constants/
      gen-ui-spec.constant.ts
```

## Proposed Module Name

### `DatabaseMonitorModule`

Use for database operational metrics and storage monitoring.

Suggested endpoint:

```txt
GET /database-monitor/storage
```

Reasoning:

- `SystemModule` is already used for general runtime status.
- `AnalyticsModule` is business-metric oriented.
- Storage monitoring is database operations, so a dedicated `DatabaseMonitorModule` keeps ownership clear.

## Endpoint Contract

### Request

Version 1 should not require any query parameters.

```txt
GET /database-monitor/storage
```

Optional future query params:

```ts
type DatabaseStorageQuery = {
  limit?: number;
  includeSystemTables?: boolean;
};
```

Do not add these until needed. Start with the simplest no-input endpoint.

### Response

```ts
type DatabaseTableStorage = {
  tableName: string;
  rowCount: number;
  dataSizeBytes: number;
  indexSizeBytes: number;
  totalSizeBytes: number;
  dataSizeFormatted: string;
  indexSizeFormatted: string;
  totalSizeFormatted: string;
  percentOfDatabase: number;
};

type DatabaseStorageSummary = {
  databaseName: string;
  tableCount: number;
  totalRows: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  largestTableName: string | null;
  tables: DatabaseTableStorage[];
};
```

Return it inside the standard project wrapper:

```ts
ServiceResultContainer<DatabaseStorageSummary>
```

## Data Source

Use MySQL `information_schema.tables`.

Suggested query:

```sql
SELECT
  table_name AS tableName,
  table_rows AS rowCount,
  data_length AS dataSizeBytes,
  index_length AS indexSizeBytes,
  (data_length + index_length) AS totalSizeBytes
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE'
ORDER BY totalSizeBytes DESC;
```

Implementation recommendation:

- Inject TypeORM `DataSource`.
- Use a fixed SQL string owned by the service.
- Do not accept table names, schema names, SQL fragments, or sorting expressions from the user.
- Use `DATABASE()` instead of reading a schema name from the request.

## Growth Rate

The user request mentions "growth rate". Version 1 cannot calculate real growth over time from `information_schema` alone, because it only gives the current snapshot.

Recommended version 1:

- Return current table sizes and row counts only.
- Mention in the UI summary that growth rate requires stored snapshots.

Recommended version 2:

Add a snapshot table:

```txt
database_storage_snapshots
```

Suggested columns:

```txt
id
tableName
rowCount
dataSizeBytes
indexSizeBytes
totalSizeBytes
capturedAt
```

Then add:

```txt
POST /database-monitor/storage/snapshot
GET /database-monitor/storage/growth
```

Do not add this in version 1 unless product explicitly wants historical growth tracking now.

## GenUI Instruction

Add a dedicated storage monitor GenUI instruction in:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

The instruction should tell the agent:

- Render only values returned by the tool.
- Do not invent table sizes or growth rates.
- Render a pie/donut chart showing `percentOfDatabase` by table.
- Render separate cards for each table.
- Each card should show:
  - Table name.
  - Row count.
  - Data size.
  - Index size.
  - Total size.
  - Percent of database.
- Render an empty state if there are no tables.
- Use an operational maintenance tone, not a sales dashboard tone.

### Chart Rendering Rules

Use CSS `conic-gradient` for the pie/donut chart instead of hand-written SVG arcs.

Reason:

- Easier for the agent to render accurately.
- Avoids broken arc math.
- Works well for a small table count.

Suggested rules:

- Sort tables by `totalSizeBytes` descending.
- Show the top 6 tables in the chart.
- If there are more than 6 tables, group the rest visually as "Other" only if the backend provides an explicit `Other` bucket. Otherwise list all tables in cards and chart only the top 6 with a note.
- If `totalSizeBytes` is `0`, render an empty state instead of a chart.

## Backend Implementation Steps

### Step 1 - Define DTOs

Create:

```txt
backend/src/modules/database-monitor/dto/database-table-storage.dto.ts
backend/src/modules/database-monitor/dto/database-storage-summary.dto.ts
backend/src/modules/database-monitor/dto/database-storage-result-response.dto.ts
```

Verification:

- DTOs use Swagger decorators.
- Numeric fields are documented as numbers.
- Formatted fields are documented as display strings.

### Step 2 - Create `DatabaseMonitorModule`

Create:

```txt
backend/src/modules/database-monitor/database-monitor.module.ts
backend/src/modules/database-monitor/database-monitor.controller.ts
backend/src/modules/database-monitor/database-monitor.service.ts
```

Register `DatabaseMonitorModule` in `AppModule`.

Verification:

- Backend build passes.
- The module does not depend on feature repositories.
- The service injects `DataSource`, not individual repositories.

### Step 3 - Implement Storage Query

In `DatabaseMonitorService`, implement:

```ts
getStorageSummary(): Promise<ServiceResultContainer<DatabaseStorageSummaryDto>>
```

Service responsibilities:

- Query `information_schema.tables`.
- Convert raw string/number values to safe numbers.
- Calculate `totalSizeBytes`.
- Calculate `percentOfDatabase`.
- Format bytes into `B`, `KB`, `MB`, or `GB`.
- Sort tables by `totalSizeBytes` descending.
- Return a stable response shape even when there are no tables.

Verification:

- No user input is used in the SQL.
- Empty database metadata returns `tables: []`.
- Percent totals are reasonable and do not divide by zero.

### Step 4 - Add Controller And Swagger Metadata

Expose:

```txt
GET /database-monitor/storage
```

Controller requirements:

- Use `@ApiTags` directly before `@Controller`.
- Use `@ApiBearerAuth()`.
- Use `@UseGuards(JwtAuthGuard)`.
- Use `@ApiOperation({...} as CustomApiOperationOptions)`.
- Include `summaryHe`.
- Include `toolIcon`, for example `ph-database`.
- Include `genUiSpec`.
- Add `@ApiOkResponse` with a response DTO.
- Keep the controller thin.

Verification:

- Swagger exposes `/database-monitor/storage`.
- The endpoint appears as an agent tool.
- The operation has `summaryHe`, `toolIcon`, and `genUiSpec`.

### Step 5 - Add GenUI Spec

Add:

```txt
DATABASE_STORAGE_MONITOR_GEN_UI_SPEC
```

to:

```txt
backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts
```

Verification:

- The instruction forbids invented values.
- The instruction uses only known CSS variables.
- The instruction uses CSS `conic-gradient` or simple bars, not complex SVG arcs.
- The instruction includes empty-state behavior.

### Step 6 - Tests

Add focused backend tests for:

- Normal storage rows return a sorted summary.
- Byte formatting works for KB, MB, and GB.
- Empty result returns an empty table list and `totalSizeBytes: 0`.
- `percentOfDatabase` does not divide by zero.
- Service uses a fixed query and does not accept user SQL input.

Verification commands:

```txt
npm.cmd test
npm.cmd run build
```

Run from:

```txt
backend/
```

### Step 7 - Swagger Refresh

Regenerate or refresh:

```txt
backend/swagger-spec.json
```

Verification:

- `/database-monitor/storage` exists in Swagger.
- The tool name is generated from the controller operation id.
- The tool contains the expected parameters object with no required user input.

## Example Prompts

Admin prompt:

```txt
What is the current size of our database tables?
```

Expected tool:

```txt
GET /database-monitor/storage
```

Admin prompt:

```txt
Which database tables are the largest?
```

Expected tool:

```txt
GET /database-monitor/storage
```

Admin prompt:

```txt
Show me storage usage for users, chat_messages, and chat_sessions.
```

Expected behavior:

- The agent calls the storage tool once.
- The agent renders the returned tables.
- The agent may visually emphasize the requested tables if they exist in the response.
- The agent must not query arbitrary table names from user input.

## Risks And Decisions

### Risk: MySQL Metadata Accuracy

`information_schema.tables.table_rows` can be approximate for some MySQL engines.

Decision:

- Use it for operational monitoring.
- Do not describe row counts as exact audit-grade counts.

### Risk: Exposing Internal Schema

Table names reveal backend internals.

Decision:

- Protect the endpoint with JWT from day one.
- Consider adding admin-only guard if role-based tool restrictions are required.

### Risk: Growth Rate Without Snapshots

Current metadata cannot show real growth rate.

Decision:

- Version 1 reports current storage only.
- Version 2 can add snapshot history and growth deltas.

### Risk: Database Portability

The query is MySQL-specific.

Decision:

- This project currently uses MySQL through TypeORM config.
- Keep the implementation MySQL-specific and explicit.

## Suggested Implementation Order

1. Add DTOs.
2. Create `DatabaseMonitorModule`, controller, and service.
3. Implement the fixed `information_schema` storage query.
4. Add GenUI spec.
5. Register the module in `AppModule`.
6. Add focused backend tests.
7. Run backend tests and build.
8. Regenerate and verify `backend/swagger-spec.json`.

## Open Decisions

- Should this endpoint require admin-only access, or is authenticated access enough for now?
- Should hidden/system tables be filtered if more internal tables are added later?
- Should version 1 include only current storage, or should snapshot-based growth tracking be implemented immediately?
- Should the response include an explicit `otherTables` bucket for charts when there are many tables?

## Agent Checklist By Module

### Agent 1 - DTOs

Owner: `backend/src/modules/database-monitor/dto/`

- [ ] Create `DatabaseTableStorageDto`.
- [ ] Create `DatabaseStorageSummaryDto`.
- [ ] Create `DatabaseStorageResultResponseDto`.
- [ ] Add Swagger decorators to every field.
- [ ] Verify response DTOs match the service response shape.

### Agent 2 - Service

Owner: `backend/src/modules/database-monitor/database-monitor.service.ts`

- [ ] Inject TypeORM `DataSource`.
- [ ] Query `information_schema.tables` with fixed SQL.
- [ ] Use `DATABASE()` for the active schema.
- [ ] Convert raw values to numbers.
- [ ] Calculate total table size.
- [ ] Calculate percent of database.
- [ ] Format byte values for display.
- [ ] Return sorted tables by total size descending.
- [ ] Do not accept raw SQL, table names, or schema names from the request.

### Agent 3 - Controller And Module

Owner: `backend/src/modules/database-monitor/`

- [ ] Create `DatabaseMonitorModule`.
- [ ] Create `DatabaseMonitorController`.
- [ ] Add `GET /database-monitor/storage`.
- [ ] Protect the endpoint with `JwtAuthGuard`.
- [ ] Add complete Swagger metadata.
- [ ] Add `summaryHe`, `toolIcon`, and `genUiSpec`.
- [ ] Register `DatabaseMonitorModule` in `AppModule`.

### Agent 4 - GenUI Spec

Owner: `backend/src/modules/admin-agent/constants/gen-ui-spec.constant.ts`

- [ ] Add `DATABASE_STORAGE_MONITOR_GEN_UI_SPEC`.
- [ ] Include pie/donut chart guidance.
- [ ] Include per-table card guidance.
- [ ] Include empty-state guidance.
- [ ] Forbid invented table sizes and growth rates.
- [ ] Use known CSS variables only.

### Agent 5 - Tests And Verification

Owner: backend test files and Swagger output

- [ ] Add service tests for normal storage rows.
- [ ] Add tests for empty metadata.
- [ ] Add tests for byte formatting.
- [ ] Add tests for percent calculations.
- [ ] Run backend tests.
- [ ] Run backend build.
- [ ] Regenerate `backend/swagger-spec.json`.
- [ ] Verify `/database-monitor/storage` appears as a tool.

### Agent 6 - Future Growth Tracking

Owner: future version only

- [ ] Decide whether snapshot storage is needed.
- [ ] If needed, create `database_storage_snapshots`.
- [ ] Add snapshot capture endpoint or scheduled job.
- [ ] Add growth summary endpoint.
- [ ] Keep this out of version 1 unless explicitly approved.
