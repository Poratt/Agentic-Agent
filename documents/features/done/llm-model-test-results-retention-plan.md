# LLM Model Test Results Retention Plan

## Problem

The `llm_model_test_results` table grows continuously because every scheduled model test writes a row.

Current expected volume:

- 4 scheduled test runs per day.
- About 20 models per run.
- About 80 rows per day.
- About 2,400 rows per month.
- About 29,200 rows per year.

These historical test logs are useful for recent model health and ranking, but old rows lose operational value quickly. Keeping all rows forever makes provider/model loading heavier, increases database storage, and can slow pages or APIs that load `models.testResults`.

## Goal

Add automatic retention for `llm_model_test_results`.

Default behavior:

- Keep the most recent 30 days of model test results.
- Delete test results older than 30 days.
- Run the cleanup automatically once per week at night.
- Log how many rows were deleted.
- Keep manual model tests and scheduled model health checks unchanged.

## Non-Goals

- Do not change the test result schema unless required.
- Do not archive old rows in version 1.
- Do not add a frontend screen for retention settings.
- Do not change model ranking logic unless it currently depends on rows older than 30 days.
- Do not make retention configurable until there is a real product need.

## Existing Context

Relevant existing files:

```txt
backend/src/modules/llm-provider/entities/llm-model-test-results.entity.ts
backend/src/modules/llm-provider/llm-provider.service.ts
backend/src/modules/llm-provider/llm-provider.module.ts
backend/src/modules/llm/services/llm-tasks.service.ts
backend/src/app.module.ts
```

Current implementation notes:

- `LlmModelTestResultEntity` maps to `llm_model_test_results`.
- The entity has `createdAt` through `@CreateDateColumn()`.
- `LlmProviderService.saveTestResult(...)` persists each model test result.
- `LlmTasksService` already owns scheduled LLM maintenance jobs through `@Cron(...)`.
- `ScheduleModule.forRoot()` is already registered in `AppModule`.

## Recommended Design

Keep retention close to the LLM provider/test-result owner:

- Add cleanup logic to `LlmProviderService`.
- Trigger it from `LlmTasksService` with a new weekly cron.
- Use the existing `LlmModelTestResultEntity.createdAt` column as the cutoff field.

Suggested service method:

```ts
async deleteOldTestResults(retentionDays = 30): Promise<number>
```

Responsibilities:

- Calculate a cutoff date: `now - retentionDays`.
- Delete rows where `createdAt < cutoff`.
- Return the number of deleted rows.
- Avoid deleting rows newer than the cutoff.

Suggested cron:

```ts
@Cron('0 0 2 * * 0')
```

Meaning:

- Every Sunday.
- 02:00 server time.
- Runs during a low-traffic nighttime window.

If the project standardizes on another timezone or maintenance window later, update only the cron expression.

## Implementation Steps

### Step 1 - Add Retention Method

Update:

```txt
backend/src/modules/llm-provider/llm-provider.service.ts
```

Add:

```ts
async deleteOldTestResults(retentionDays = 30): Promise<number>
```

Implementation recommendation:

- Use TypeORM repository delete/query builder.
- Use a computed `Date` cutoff.
- Delete by `createdAt < cutoff`.
- Return `DeleteResult.affected ?? 0`.

Verification:

- The method deletes only `LlmModelTestResultEntity` rows.
- The method has no user input.
- The default retention is exactly 30 days.

### Step 2 - Add Weekly Cleanup Cron

Update:

```txt
backend/src/modules/llm/services/llm-tasks.service.ts
```

Inject `LlmProviderService` in addition to `LlmHealthService`.

Add a new cron method:

```ts
@Cron('0 0 2 * * 0')
async cleanupOldLlmModelTestResults() {
  // call provider service retention cleanup
}
```

Logging requirements:

- Log when cleanup starts.
- Log retention window and cutoff date.
- Log deleted row count.
- Catch and log errors so cleanup failure does not crash other scheduled tasks.

Verification:

- Existing health-check cron still runs.
- The new cleanup cron does not call `testAllModels()`.
- Cleanup errors are isolated to the cleanup job.

### Step 3 - Confirm Module Wiring

Check:

```txt
backend/src/modules/llm/llm.module.ts
backend/src/modules/llm-provider/llm-provider.module.ts
```

Expected:

- `LlmProviderModule` exports `LlmProviderService`.
- `LlmModule` imports `LlmProviderModule` or otherwise already has access to `LlmProviderService`.

If this dependency is not currently available, add the smallest module import needed.

Verification:

- No circular dependency is introduced.
- Backend build passes.

### Step 4 - Add Focused Tests

Add or update backend tests around the service cleanup behavior.

Recommended test cases:

- Deletes rows older than 30 days.
- Keeps rows exactly within the last 30 days.
- Returns the affected/deleted count.
- Uses a custom retention value only when explicitly passed by code.

If the project does not currently have repository-level tests for this module, add the smallest service test that mocks `testResultRepo.delete(...)` or query-builder behavior.

Verification command:

```txt
npm.cmd test
npm.cmd run build
```

Run from:

```txt
backend/
```

### Step 5 - Runtime Verification

Manual verification query before cleanup:

```sql
SELECT COUNT(*) AS total_count
FROM llm_model_test_results;
```

Manual verification query for old rows:

```sql
SELECT COUNT(*) AS old_count
FROM llm_model_test_results
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

After running the cleanup method manually in a controlled environment, verify:

```sql
SELECT COUNT(*) AS old_count
FROM llm_model_test_results
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

Expected result:

- `old_count = 0`.
- Recent rows remain.

## Risks And Decisions

### Risk: Ranking Depends On Older Rows

If model ranking or UI summaries use all historical test results, deleting old rows may change displayed averages or ranking.

Decision:

- Retention is correct because the product value is recent health, not long-term analytics.
- Before implementation, inspect any model ranking logic and confirm it does not require lifetime history.

### Risk: Server Timezone

Cron runs based on server/runtime timezone.

Decision:

- Use a nighttime cron expression and document that it is server-time based.
- Do not add timezone configuration in version 1 unless production runtime requires it.

### Risk: Large First Delete

The first cleanup may delete many old rows.

Decision:

- Accept this for the current expected volume.
- If production volume is much larger, switch to batched deletes later.

### Risk: Missing Index On `createdAt`

Deleting by `createdAt` can become slower as the table grows.

Decision:

- Check whether `createdAt` is indexed.
- If not indexed, add an index on `createdAt` as part of implementation or through the existing migration workflow.

## Suggested Implementation Order

1. Inspect model ranking/test-result reads for assumptions about full history.
2. Add an index on `createdAt` if one does not already exist.
3. Add `deleteOldTestResults(...)` to `LlmProviderService`.
4. Add the weekly cleanup cron to `LlmTasksService`.
5. Add focused tests.
6. Run backend tests and build.
7. Optionally run one controlled manual cleanup in local/dev DB and verify row counts.

## Definition Of Done

- `llm_model_test_results` rows older than 30 days are deleted automatically.
- Cleanup runs weekly at night.
- Cleanup logs deleted row count.
- Existing model health tests continue to write new rows.
- Recent test results remain visible to provider/model management.
- Backend tests pass.
- Backend build passes.
- `documents/architecture-diagram.md` is updated if the scheduled maintenance flow is considered architectural; otherwise final implementation notes explicitly say no diagram update was needed.

## Open Decisions

- Should the weekly cleanup run on Sunday at 02:00 server time, or another night/time?
- Should retention be hardcoded at 30 days for version 1, or read from environment/config?
- Should implementation add a `createdAt` index immediately if none exists?
- Should old rows ever be archived for long-term analytics, or is deletion enough?
