par# Parallel Tool Execution Plan

## Goal

Speed up multi-part admin prompts by executing independent tool calls in parallel inside the active agent orchestration flow.

Example user prompt:

```txt
Show me all users, current system status, and the weather in Herzliya.
```

Current behavior:

- The model may return several tool calls.
- The backend executes them one after another.
- Total latency becomes the sum of all tool call durations.

Target behavior:

- Read-only independent tools execute in parallel.
- Mutating or dependent tools remain sequential.
- The agent still returns one final answer in Hebrew.
- No additional LLM agents are required in version 1.

## Product Principle

The user should not care whether work is executed sequentially or in parallel.

The agent should behave the same semantically, but faster:

- Same final answer quality.
- Same data safety rules.
- Same tool authorization.
- Faster execution for independent read-only requests.

## Recommended Scope

Version 1 should not introduce true multi-agent orchestration.

Use the active agent only:

- One LLM planning step.
- Multiple tool calls from that LLM response.
- Backend groups safe calls.
- Backend runs eligible groups in parallel.
- Backend saves all tool results.
- Same LLM continues and produces one final response.

True multi-agent splitting can be planned later if needed.

## Current State

Main files:

- `backend/src/modules/admin-agent/admin-agent.service.ts`
- `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts`
- `backend/src/modules/admin-agent/services/swagger-tools.parser.ts`
- `backend/src/modules/admin-agent/services/agent-session.service.ts`

Current flow:

1. `AdminAgentService` calls `llmService.generateResponse(...)`.
2. The model returns `toolCalls`.
3. `AdminAgentService` loops over tool calls sequentially.
4. Each tool call is executed through `AgentToolExecutorService`.
5. Tool results are saved to session history.
6. The next LLM iteration sees tool results and either calls more tools or answers.

Current bottleneck:

```ts
for (const call of llmResponse.toolCalls) {
  const resultData = await this.agentToolExecutorService.executeToolCall(call, userId);
}
```

## Design Decision

Parallelization should happen in the orchestration layer, not inside the LLM service.

Reason:

- `LlmService` should only call LLM providers.
- `AgentToolExecutorService` should execute one tool call.
- `AdminAgentService` owns orchestration and can decide order, grouping, and safety.

## Safety Rules

### Safe To Parallelize

Tool calls are eligible for parallel execution when all are true:

- HTTP method is `GET`.
- Tool does not mutate database, cookies, files, session title, or external state.
- Tool arguments do not depend on the result of another tool in the same batch.
- Tool endpoint exists in parsed Swagger metadata.

Examples:

- `GET /users`
- `GET /users/:id`
- `GET /system/status`
- `GET /weather/current`
- `GET /weather/forecast`
- `POST /analytics/query` only if explicitly marked read-only later.

### Not Safe To Parallelize By Default

These must stay sequential:

- `POST`
- `PATCH`
- `DELETE`
- login/logout/session mutation endpoints
- role changes
- user updates
- any endpoint with side effects

### Special Case: Read-Only POST

Some APIs use `POST` for read-only query semantics, for example analytics.

Do not infer this automatically.

If needed later, add an explicit metadata allowlist:

```ts
const PARALLEL_SAFE_TOOL_NAMES = new Set(["AnalyticsController_query"]);
```

Version 1 should start with `GET` only.

## Execution Model

### Option A - Simple Mixed Sequential/Parallel

For each LLM tool-call response:

1. Split tool calls into groups.
2. Consecutive read-only calls run in one `Promise.all`.
3. Mutating calls execute one by one.
4. Preserve original tool result order when saving messages.

Example:

```txt
GET users
GET system status
PATCH user role
GET weather
```

Execution:

```txt
parallel: GET users + GET system status
sequential: PATCH user role
parallel: GET weather
```

Recommended for version 1.

### Option B - Full Dependency Planner

The orchestrator asks the model to annotate dependencies, then schedules a DAG.

Not recommended now:

- More complex.
- More tokens.
- More failure modes.
- Not needed for current tool set.

## Required Backend Changes

### Tool Metadata Lookup

`SwaggerToolsParser` already exposes endpoint metadata through:

```ts
getEndpoint(functionName);
```

Use this metadata to inspect:

- HTTP method.
- path.
- tool name.
- possibly `genUiSpec`.

### New Helper In `AdminAgentService`

Add helper:

```ts
private isParallelSafeTool(functionName: string): boolean
```

Version 1 rule:

```ts
return endpoint?.method.toUpperCase() === "GET";
```

Future extension:

```ts
return endpoint.method === "GET" || PARALLEL_SAFE_TOOL_NAMES.has(functionName);
```

### New Helper For Grouping

Add helper:

```ts
private groupToolCallsForExecution(toolCalls: LlmToolCall[]): LlmToolCall[][]
```

Behavior:

- Consecutive parallel-safe calls go into the same group.
- Unsafe calls become a single-call group.
- Original order is preserved.

Example:

```txt
[safe, safe, unsafe, safe] -> [[safe, safe], [unsafe], [safe]]
```

### New Helper For Executing Groups

Add helper:

```ts
private async executeToolCallGroup(
  calls: LlmToolCall[],
  userId: number,
): Promise<Array<{ call: LlmToolCall; resultData: string }>>
```

Behavior:

- If group size is `1`, execute normally.
- If group size is greater than `1`, execute with `Promise.all`.
- Catch per-call errors and convert to tool result strings, so one failed read-only tool does not cancel the whole batch.

Important:

- Preserve result order matching input call order.

## Stream Behavior

Current stream emits step events before and after each tool.

With parallel execution:

- Emit one step per tool before the batch starts.
- Execute the batch.
- Emit success/failure step per tool after each result is available.

Simpler version 1:

- For each call in the group, emit "working on X".
- Run the group.
- For each result in original order, emit success/failure.

This avoids complex interleaved progress events.

## Session Persistence

Current behavior saves each tool result as a `tool` message.

Keep this behavior.

When tools run in parallel:

- Save tool messages in original model tool-call order.
- Do not save based on completion order.

Reason:

- LLM tool-call protocols expect stable pairing by `tool_call_id`.
- History should remain deterministic.

## Error Handling

### Single Tool Failure In Parallel Batch

Do not reject the whole batch.

Convert the failure into a tool result string:

```json
{
  "error": true,
  "message": "Tool execution failed",
  "toolName": "..."
}
```

Then save it as the corresponding tool message.

The model can still answer with partial data.

### Unsafe Tool Failure

Sequential behavior remains unchanged.

If a mutation fails:

- Save or emit the failure result.
- Let the model decide final response.
- Do not continue to later dependent mutations unless the current code already does so safely.

## Observability

Add minimal logs:

```txt
Executing 3 read-only tools in parallel.
Executing unsafe tool sequentially: UsersController_updateRole
```

Do not log sensitive payloads.

## Testing Strategy

### Unit Tests

Add focused tests for grouping logic if the project has admin-agent service tests.

Cases:

- all safe calls -> one group
- all unsafe calls -> separate groups
- mixed calls -> grouped by consecutive safe calls
- unknown endpoint -> unsafe

### Integration / Manual Tests

Prompts:

```txt
Show me users, system status, and weather in Herzliya.
```

Expected:

- Tool calls should execute faster than sequential.
- Logs should show parallel execution.
- Final response includes all requested data.

Mutation test:

```txt
Show me users and then update user 3 role to admin.
```

Expected:

- `GET /users` may run first.
- Role update remains sequential.
- No mutation is batched with another tool by default.

## Risks

### Risk: Parallel Mutations

If mutations run in parallel, database state can become inconsistent.

Mitigation:

- Version 1 parallelizes `GET` only.
- Unknown tools are treated as unsafe.

### Risk: Hidden Dependencies Between Read Calls

Two read calls are usually independent, but not always.

Mitigation:

- Only group consecutive safe calls returned by the model.
- Do not reorder calls across unsafe boundaries.

### Risk: One Parallel Tool Failure Cancels All

`Promise.all` rejects when one promise rejects.

Mitigation:

- Wrap each tool execution in its own try/catch.
- Return structured error string for that tool.

### Risk: Step UI Looks Confusing

Parallel tools may finish in a different order.

Mitigation:

- Emit completion steps in original tool-call order for version 1.
- Keep UI deterministic.

## Suggested Implementation Order

1. Add grouping helper in `AdminAgentService`.
2. Add `isParallelSafeTool(...)`.
3. Add `executeToolCallGroup(...)`.
4. Replace sequential loops in non-stream flow.
5. Replace sequential loops in stream flow.
6. Preserve original result saving order.
7. Add logs.
8. Run backend build.
9. Test with multi-read prompt.
10. Test with mixed read/mutation prompt.

## Open Decisions

- Should read-only `POST /analytics/query` be allowlisted in version 1 or later?
- Should `GET /llm/llm-test` be parallel-safe, or excluded because it spends LLM tokens?
- Should parallel batch size be capped?
- Should tool timeout handling be added before parallelization?
- Should UI show "running 3 tools in parallel" as one grouped step?

## Agent Checklist By Module

### Agent 1 - Tool Safety Classification

Owner: `backend/src/modules/admin-agent/admin-agent.service.ts`

- [ ] Add `isParallelSafeTool(functionName)`.
- [ ] Use `swaggerToolsParser.getEndpoint(functionName)`.
- [ ] Treat unknown endpoints as unsafe.
- [ ] Treat only `GET` endpoints as safe in version 1.
- [ ] Add comments only where the safety rule is not obvious.

### Agent 2 - Tool Call Grouping

Owner: `backend/src/modules/admin-agent/admin-agent.service.ts`

- [ ] Add `groupToolCallsForExecution(toolCalls)`.
- [ ] Preserve original order.
- [ ] Group consecutive safe calls.
- [ ] Keep unsafe calls as single-call groups.
- [ ] Add focused tests if a test pattern exists.

### Agent 3 - Non-Stream Execution

Owner: `backend/src/modules/admin-agent/admin-agent.service.ts`

- [ ] Replace the sequential `for...of` tool loop in `queryDatabase`.
- [ ] Execute safe groups with `Promise.all`.
- [ ] Save tool messages in original order.
- [ ] Preserve current behavior for mutations.
- [ ] Ensure one failed safe tool does not cancel the whole group.

### Agent 4 - Stream Execution

Owner: `backend/src/modules/admin-agent/admin-agent.service.ts`

- [ ] Replace the sequential `for...of` tool loop in `queryDatabaseStream`.
- [ ] Emit working steps for each tool in the group.
- [ ] Execute safe groups with `Promise.all`.
- [ ] Emit success/failure steps in original order.
- [ ] Save tool messages in original order.
- [ ] Keep mutation tools sequential.

### Agent 5 - Tool Executor Error Wrapping

Owner: `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts`

- [ ] Decide whether errors should be wrapped in `AdminAgentService` or `AgentToolExecutorService`.
- [ ] Prefer wrapping in `AdminAgentService` for version 1 to avoid changing executor behavior globally.
- [ ] Return structured error strings for failed read-only tools.
- [ ] Avoid logging sensitive request data.

### Agent 6 - Verification

Owner: backend verification

- [ ] Run `npm.cmd run build`.
- [ ] Test prompt with three read-only requests.
- [ ] Test prompt with read plus mutation.
- [ ] Confirm logs show parallel batches.
- [ ] Confirm final answer still includes all tool results.
- [ ] Confirm mutations are not parallelized.
