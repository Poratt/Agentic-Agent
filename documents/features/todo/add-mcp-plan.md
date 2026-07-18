# Add MCP Bridge — Generic External Tool Integration (weather-mcp first)

> **Move note:** This plan was first drafted at `documents/todo/add-mcp-plan.md`. It is moved to `documents/features/todo/` per the project rule in `documents/STATUS.md` ("Active feature plans: `documents/features/todo/`"). The companion TODO comment in `documents/HANDOFF.md` should be removed when the move lands.

> Reference MCP server: https://github.com/weather-mcp/weather-mcp (`@dangahagan/weather-mcp`, stdio, 12+ weather tools, no API key required — uses Open-Meteo / NOAA).

## Problem Statement

Today every admin-agent tool is generated from `swagger-spec.json` by `SwaggerToolsParser`. The weather tools come from a hand-built `WeatherModule` (`WeatherController` + `WeatherService`) that calls `wttr.in` directly and post-processes/synthesizes data (the 5‑day forecast is partly random — see `backend/src/modules/weather/weather.service.ts:152-153`, the `Math.random()` and `Math.sin()` based day temps). We want to swap this for a standard MCP weather server that the agent can use, ideally in a way that lets us add _any_ MCP server later without writing a controller per tool.

The user's intent (from chat): _"I thought it would be something more generic where the agent just gets all the tools in one simple definition."_ → Build a **generic MCP bridge**, not a one-off controller wrapper.

## Goal

Add a generic `McpBridgeModule` that:

1. Spawns configured MCP servers (stdio) on startup.
2. Discovers their tools automatically via `listTools()` — no per-tool code.
3. Merges those tools into the same tool array already sent to the LLM, alongside the Swagger tools.
4. Routes tool calls for MCP-owned tools directly to the MCP client (JSON-RPC over stdio), bypassing the HTTP-back-into-backend path used for Swagger tools.
5. Reuses the existing Angular weather cards by emitting the same `RenderSpecType` (`WeatherCurrent` / `WeatherForecast`) the frontend already renders.

Weather is the first server; the design must support N servers added via config only.

## Scope

### In scope

- New `McpBridgeModule` (client manager + bridge service + config).
- Merge MCP tools into `AdminAgentService` tool assembly (`queryDatabase` + `queryDatabaseStream`).
- Add an MCP dispatch branch in `AgentToolExecutorService.executeToolCall`.
- Extend the **parser's local** `LlmToolSchema` with a `source` discriminator.
- Add render-spec mappings for the MCP weather tool names (adapter from MCP output shape → existing `WeatherCurrentRenderData` / `WeatherForecastRenderData`).
- Deprecate/remove the hand-built `WeatherModule` once the MCP path is verified.
- Update `documents/architecture-diagram.md` and `documents/HANDOFF.md`.

### Out of scope

- Auth, session management, LLM provider/model selection.
- Changing the streaming protocol (`step`/`token`/`render` events).
- Non-weather MCP servers (infra supports them; only weather is configured now).
- The AiFormat directive or GenUI spec.

## Architecture / Design

### Data flow (new branch)

```
swagger-spec.json ──► SwaggerToolsParser.getTools()  ┐
                                                     ├─► merged tools[] ─► LLM
mcp server (stdio) ──► McpBridgeService.getTools()   ┘

LLM tool call:
  AgentToolExecutorService.executeToolCall(call)
     ├─ if McpBridgeService.hasTool(call.function.name)
     │     └─► McpBridgeService.callTool(name, args)  (JSON-RPC over stdio)
     └─ else: existing Swagger path (getEndpoint → HTTP back into backend)
```

The executor owns dispatch by **tool-name ownership lookup**, not by threading a `source` field through `LlmToolCall` (that object comes straight from the LLM and has no room for it). `McpBridgeService.hasTool(name)` is checked first; only on a miss does the Swagger path run. This keeps the Swagger path byte-for-byte unchanged for every existing tool.

**Why the MCP branch must precede `getEndpoint`:** the current `executeToolCall` (`backend/src/modules/admin-agent/services/agent-tool-executor.service.ts:215-220`) treats _any_ tool name not in `swaggerToolsParser.getEndpoint(...)` as `Unknown tool call` and returns immediately. If the MCP branch sits after that check, every MCP tool will be misclassified as unknown. The dispatch must run **before** the `getEndpoint` lookup — the plan accounts for this, but it is the single most load-bearing line of the executor change.

### `LlmToolSchema` extension — correct file target

There are **two** `LlmToolSchema` types in this codebase. They are structurally compatible but declared in different files:

| File                                                                  | Symbol                    | Used by                                                                            |
| --------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `backend/src/modules/llm/types/llm.types.ts:5`                        | `type LlmToolSchema`      | The `LlmService` request type — what the LLM client sees in `LlmRequest.tools`     |
| `backend/src/modules/admin-agent/services/swagger-tools.parser.ts:14` | `interface LlmToolSchema` | The parser's internal type — what `SwaggerToolsParser.getTools()` actually returns |

`AdminAgentService` only ever calls `SwaggerToolsParser.getTools()` (`admin-agent.service.ts:51, 115, 207, 254, 386`) and passes the result directly into `LlmRequest.tools` — TS widens it across files. The bridge should also return the **parser's** shape so the merged array is type-homogeneous.

> **Decision (review fix #1):** add `source` to the parser's `LlmToolSchema` in `swagger-tools.parser.ts:14`, not to `llm/types/llm.types.ts`. `llm.types.ts` is the wire type the LLM client consumes — `source` is observability only and shouldn't leak into the LLM-facing contract unless we choose to.

```ts
// backend/src/modules/admin-agent/services/swagger-tools.parser.ts
export interface LlmToolSchema {
  type: "function";
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
  /**
   * OBSERVABILITY ONLY. NOT used for routing/dispatch.
   * The executor decides ownership by tool-name lookup
   * (McpBridgeService.hasTool), never by reading this field.
   * Kept so logs/analytics can report which source served a tool.
   * The LLM never sees this field.
   */
  source?: "swagger" | "mcp";
}
```

If the bridge module lives under `admin-agent` it can import this type directly. If it lives in its own module (recommended — see below), re-export it from `llm.types.ts` or duplicate the small interface. **Duplicating the type across both files is acceptable; both files are tiny and the alternative is a circular dep on the parser.**

### New module layout

```
backend/src/modules/mcp-bridge/
  mcp-bridge.module.ts
  mcp-bridge.config.ts          # reads MCP servers from env
  mcp-bridge.service.ts         # facade: getTools / hasTool / callTool
  mcp-server-client.ts          # wraps SDK Client + StdioClientTransport
  mcp-bridge.service.spec.ts
  __fixtures__/
    weather-mcp-current.json    # pinned MCP callTool('get_current_weather', ...) output
    weather-mcp-forecast.json   # pinned MCP callTool('get_forecast', ...) output
```

The bridge module is a top-level module (`src/modules/mcp-bridge/`) — **not** a sub-module of `admin-agent`. Reasoning: (a) it owns its own lifecycle (spawn/close), (b) it has no internal coupling to admin-agent types, (c) it should be reusable in other NestJS apps. `AdminAgentModule` imports `McpBridgeModule` to access the service. NestJS resolves this through `imports`.

### Config

`mcp-bridge.config.ts` — typed list from env, e.g.:

```ts
export interface McpServerConfig {
  id: string; // 'weather'
  command: string; // usually 'node' — the binary that runs the server
  args: string[]; // resolved at runtime by mcp-bridge (see below)
  enabled?: boolean; // default true
  enabledTools?: string[]; // optional allowlist; omit = all
  requiresConfirmation?: boolean; // default false (read-only servers)
  toolIcons?: Record<string, string>; // optional tool name → phosphor class (e.g. 'get_forecast' → 'ph-calendar')
}

export interface McpBridgeConfig {
  enabled: boolean; // MCP_ENABLED
  connectTimeoutMs: number; // safety net for genuinely hung spawns (default 10_000)
  servers: McpServerConfig[]; // parsed from MCP_SERVERS JSON
}
```

**Env shape:** `MCP_ENABLED=false`, `MCP_SERVERS='[{"id":"weather","enabled":true,"enabledTools":["get_forecast","get_current_weather"]}]'`. The env intentionally does **not** carry the entry path or `args` — those are resolved at runtime from the package name (see below).

**Pinned dependency, not `@latest` (review fix #2).** `@dangahagan/weather-mcp` is installed as a **normal dependency** in `package.json` (alongside the SDK), so:

- No network fetch at boot in production — runs from `node_modules`.
- Version is locked by the lockfile; `@latest` can't silently break the app.
- The bridge never uses `npx`, never reads `node_modules/.bin/...`, and never trusts a path supplied via env. The entry script is resolved at runtime from the package name with `require.resolve('@dangahagan/weather-mcp/dist/index.js')` (or the package's actual `main`/`bin`, captured in Phase 0). The resolved absolute path is passed as the single `args[0]` to `command: 'node'`. **Never `npx -y ...@latest` in the running config** — that pulls a fresh copy on first run and can introduce a breaking change mid-flight.
- Resolving the path at runtime (instead of hardcoding `'node_modules/...'` in env) is critical for two reasons:
  1. **Cross-CWD safety.** A relative path like `node_modules/...` breaks the moment `cwd` changes — `npm run start:dev` from `backend/`, PM2 from `/var/www/app`, Docker with `WORKDIR /app` — each will resolve `node_modules` differently or not at all. `require.resolve` returns the absolute path on the filesystem regardless of who launched the process.
  2. **Cross-platform safety.** The `node_modules/.bin/<name>` shim is a `.cmd` file on Windows and a bash script on POSIX; some Node `child_process` configurations do not pick the right one automatically, and shipping through the shim adds a layer of "why does this work on my Mac but not in CI". Invoking `node <absolute-entry.js>` directly sidesteps the entire shim problem — same behavior on Windows, Linux, and macOS.
- The package's `package.json` (`main` / `bin` field) is inspected in Phase 0 to capture the actual entry path; the plan records the resolved path string in the `mcp-bridge.config.ts` comment so the reader knows what to expect.

**Safe env parsing (review fix #3).** Parsing `MCP_SERVERS` JSON is wrapped in try/catch: on malformed JSON, log a warning and fall back to an **empty server list** (app still boots, Swagger-only). Consistent with the kill-switch principle — the bridge must never crash boot.

Global kill-switch `MCP_ENABLED` (default `false`) so the bridge is opt-in and the app boots unchanged when off.

### Connection lifecycle & robustness

- Connect in `onModuleInit`. **Wrap each server connect in try/catch** — if the local package is missing or the spawn fails, log a warning and continue with Swagger-only tools. The backend must still boot.
- `onModuleDestroy` → close all clients (also triggered on `nest start --watch` reloads during dev, so no orphaned child processes).
- `listTools()` once at connect; cache the converted `LlmToolSchema[]` and a `Map<toolName, serverId>`.
- **No boot-time network dependency**: the package is pinned in `package.json` and launched from `node_modules` (see Config). The "download delay" risk from the earlier draft is eliminated by pinning.
- Keep a **connect timeout** as a safety net for a genuinely hung spawn (real failure response), not as a workaround for normal download time. 10s default is plenty for `node` to spawn a stdio child.
- If a server dies after the initial connect, `callTool` should return a clear error string (not crash the agent loop) — the bridge must not bring down other servers. The bridge should attempt one reconnect, then mark the server as failed until the next restart. Out of scope for v1: reconnect on every call.

### Spawn resolution (the only piece of `McpServerConfig` the bridge actually owns)

The env carries `{ id, enabled, enabledTools, requiresConfirmation, toolIcons }` — no path, no `command`, no `args`. At startup, the bridge resolves the launch spec for each server from the package name alone:

```ts
// backend/src/modules/mcp-bridge/mcp-bridge.config.ts
export interface McpServerLaunchSpec {
  id: string;
  command: 'node';          // fixed for v1 — the SDK launches the server as a child Node process
  args: string[];           // exactly [absoluteEntryPath]
  env?: Record<string, string>;
}

export interface McpServerPackageRef {
  id: string;                            // 'weather'
  package: string;                       // '@dangahagan/weather-mcp'
  entry: string;                         // '/dist/index.js' — relative to the package root
  // Cached at startup; Phase 0 captures the right value per package.
  static packageMap: Record<string, McpServerPackageRef> = {
    weather: {
      id: 'weather',
      package: '@dangahagan/weather-mcp',
      entry: '/dist/index.js',
    },
  };
}

export function resolveLaunchSpec(serverId: string): McpServerLaunchSpec | null {
  const ref = McpServerPackageRef.static[serverId];
  if (!ref) return null;
  const absoluteEntryPath = require.resolve(`${ref.package}${ref.entry}`);
  return { id: ref.id, command: 'node', args: [absoluteEntryPath] };
}
```

This is the **only** way the bridge spawns a server. It guarantees:

- **No `npx`, no `node_modules/.bin/<name>`, no path string in env.** `require.resolve` walks up from `backend/` to find the package root and returns the absolute filesystem path. The path is correct whether the process was launched from `npm run start:dev`, PM2, Docker, or `node dist/main.js`.
- **Same on Windows, Linux, and macOS.** `node <absolute-path>` has identical behavior on all three; the `.cmd` vs bash-script shim in `node_modules/.bin` does not come into play.
- **One source of truth per server.** The package name + entry fragment is the only place the path lives; if the package is upgraded and the entry file moves, only `McpServerPackageRef.static[serverId].entry` changes. The env does not get a chance to drift.
- **Failure mode is loud and early.** If the package is missing or the entry path is wrong, `require.resolve` throws `MODULE_NOT_FOUND` at `onModuleInit`, the bridge logs a warning, and the app boots Swagger-only. No silent spawn-with-stale-path surprises in prod.

### Tool conversion (MCP → LlmToolSchema)

MCP `Tool` = `{ name, description, inputSchema }`. Convert:

```ts
{
  type: 'function',
  source: 'mcp',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false },
  },
}
```

MCP `inputSchema` is already a JSON Schema object, ~identical to what the LLM expects — no translation needed (this was the key insight from the chat: MCP tools arrive pre-formatted).

If the server provides an `enabledTools` allowlist, the bridge filters `listTools()` output against it before caching. Disallowed tools never appear in the merged array and never resolve in `hasTool`.

### MCP `callTool` result extraction

Per the MCP protocol, `client.callTool()` does **not** return a raw string — it returns `{ content: ContentBlock[] }` where each block is `{ type: 'text' | 'image' | 'resource', ... }`. The bridge must explicitly extract and flatten this before returning the `string` the executor expects:

```ts
async callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const client = this.clientFor(name);
  let res;
  try {
    res = await client.callTool({ name, arguments: args });
  } catch (err) {
    // Surface the error as a JSON-encoded string the render-spec can handle
    // (it already has the "result has error → no render block" branch).
    return JSON.stringify({
      error: true,
      source: 'mcp',
      toolName: name,
      message: err instanceof Error ? err.message : 'MCP call failed',
    });
  }
  const text = (res.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text?: string }).text ?? '')
    .join('\n')
    .trim();
  return text.length > 0 ? text : JSON.stringify({ error: 'Empty MCP tool result' });
}
```

> **Decision (review fix #4):** wrap thrown errors in a `{error:true,...}` JSON envelope. The render-spec's `buildRenderSpec` (`render-spec.service.ts:362-366`) already short-circuits on `parsed.error` and returns `null` — the user sees a clean step-error event instead of an unhandled exception. Without this, a transient MCP failure bubbles into `executeToolCallSafely`'s catch (`admin-agent.service.ts:433-447`) and produces a generic "Tool execution failed" — informative but lossy.

> The exact `content` shape returned by `get_forecast` / `get_current_weather` is captured in **Phase 0** and the transform in Phase 3 is written against that captured fixture — not assumed.

### Executor dispatch branch

File: `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts`

**Before** the existing `const endpointMeta = this.swaggerToolsParser.getEndpoint(call.function.name);` (line 216), insert:

```ts
if (this.mcpBridgeService.hasTool(call.function.name)) {
  let args: Record<string, any> = {};
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    // keep empty
  }
  return this.mcpBridgeService.callTool(call.function.name, args);
}
```

The branch reuses the same `JSON.parse`-with-fallback already used in this file (line 223-227) — the parse is intentionally duplicated here, not factored out, to keep the diff minimal and the Swagger path byte-for-byte unchanged.

`callTool` returns a `string` (the flattened MCP `content` text or the error envelope — see "MCP callTool result extraction"), matching the existing executor contract so `render-spec` and history saving work unchanged.

### Step icon for MCP tools

`queryDatabaseStream` (`admin-agent.service.ts:254-255`) reads `endpoint?.toolIcon || STEP_ICONS.tool` to choose the step icon. For MCP tools, `endpoint` is `undefined` → falls back to `ph-gear`. The bridge can override this by reading the optional `toolIcons` map from the server config (per-tool phosphor class), but the simpler v1 is the default `ph-gear` for all MCP tools. If we want per-tool icons (e.g. `get_forecast` → `ph-calendar`), the bridge exposes `getToolIcon(name): string | undefined` and `AdminAgentService` consults it.

> **Decision (review fix #5):** ship v1 with `ph-gear` for all MCP tools; if a weather tool needs a distinct icon, add the `toolIcons` config in a follow-up. This avoids spreading MCP-specific logic into the streaming code path.

### Parallel-safety note

`isParallelSafeTool(name)` returns `endpoint?.method.toUpperCase() === 'GET'`. For MCP tools `getEndpoint` is `undefined` → returns `false` → MCP tools run **sequentially** (single). Safe default for v1. Weather tools are read-only, so sequential is fine. (Future: mark an MCP server `readOnly` and return true from `isParallelSafeTool` if desired — not needed now.)

### Confirmation / safety note

`isDangerousOperation` is currently Swagger-only (`agent-tool-executor.service.ts:47-49` calls `swaggerToolsParser.requiresConfirmation`). The bridge config has a `requiresConfirmation` flag, but **the bridge does not integrate with the pending-action flow in v1**.

> **Explicit caveat:** with the default `requiresConfirmation: false`, the bridge **bypasses the Approval Queue** entirely — MCP tool calls are executed immediately, with no `CONFIRMATION_REQUIRED` gate. This is correct for read-only weather, but is a real hazard if someone copies this pattern to a _mutating_ MCP server without integrating the approval flow. Document this loudly at the call site and in the config comment.

The future integration point (out of scope for weather):

1. Expose `McpBridgeService.requiresConfirmation(name): boolean` — the bridge returns the server's flag.
2. In `AgentToolExecutorService.isDangerousOperation`, fall through to `mcpBridgeService.requiresConfirmation(...)` when Swagger returns `false`.
3. Add a `McpBridgeService.getSemanticActionDescription(name, args)` parallel to the Swagger one, so the pending-action card shows something meaningful.

### Render-spec adapter (keep the Angular weather cards)

The frontend weather cards render by `RenderSpecType` (`WeatherCurrent` / `WeatherForecast`), not by tool name. So the MCP path can keep them working **as long as the bridge result is adapted into the existing `WeatherCurrentRenderData` / `WeatherForecastRenderData` shapes**.

> **Decision (review fix #6 — render-spec contract):** the existing `TOOL_RENDER_MAPPINGS` transforms (e.g. `render-spec.service.ts:54`) read from `data.result ?? data` to handle both `ServiceResultContainer<T>` and raw objects. The MCP `callTool` returns a **bare** JSON object — there is no `ServiceResultContainer` wrapper. The MCP transform must therefore read `data` directly, never `data.result`. The cleanest way to express this is a per-mapping `unwrapResult?: boolean` flag (default `true` for existing Swagger mappings, `false` for MCP mappings). **Alternative rejected:** wrap the MCP result in `{success:true, result:...}` before returning from `callTool` — that would force every future MCP server to match the backend's `ServiceResultContainer` shape, which defeats the "generic bridge" goal.

File: `backend/src/modules/admin-agent/render-spec/render-spec.service.ts`

1. Add an optional `unwrapResult: boolean` to `ToolRenderMapping` (default `true`).
2. Phase 0: install the package, run a sample `callTool('get_forecast', {latitude, longitude})` or `get_current_weather` to capture the exact JSON shape. Commit the result to `backend/src/modules/admin-agent/render-spec/__fixtures__/weather-mcp-current.json` and `weather-mcp-forecast.json`.
3. Add two new `TOOL_RENDER_MAPPINGS` entries keyed by the MCP tool names (e.g. `get_forecast`, `get_current_weather` — confirm exact names from `listTools()`), with `unwrapResult: false`, whose `transform` maps the MCP JSON → `WeatherCurrentRenderData` / `WeatherForecastRenderData`, emitting `RenderSpecType.WeatherCurrent` / `WeatherForecast`.
4. After Phase 4 removes the `WeatherController_*` operationIds, remove the now-dead `WeatherController_getWeather` / `WeatherController_getForecast` mappings.
5. Keep `weather.render-spec.ts` (the zod schemas) — still used by the new mappings.
6. Add a new test file `weather-mcp.render-spec.spec.ts` that loads the pinned fixtures, feeds them through the new mappings, and asserts the resulting `RenderSpecType` + data shape. This is the **most brittle code** in the plan (depends on an external package's output shape), so it gets a pinned fixture, not a live call.

Fallback if the MCP output shape is awkward: keep `WeatherModule` as a thin controller that calls `McpBridgeService.callTool` internally (preserves the old operationIds/render-specs). Prefer the adapter approach; use the thin-controller fallback only if shape mapping proves brittle.

## Implementation Steps

### Phase 0 — Inspect the package (before coding)

1. `npm install @modelcontextprotocol/sdk --save` **and** `npm install @dangahagan/weather-mcp --save` (backend). The weather server is a pinned dependency — not `@latest`. Inspect the installed package's `package.json` to find its `bin` field / entry script and confirm the runtime-resolved path.
2. Run `listTools()` once locally (via a scratch TS script that spawns the SDK `Client` + `StdioClientTransport` and calls `listTools()`) to capture **exact tool names** (e.g. `get_forecast`, `get_current_weather`) and their `inputSchema`. Commit this output to `backend/src/modules/mcp-bridge/__fixtures__/weather-mcp-tools.json`.
3. Run one sample `callTool` per tool and capture the **real `content` block shape** — the JSON the text block wraps. Commit the two results to `backend/src/modules/admin-agent/render-spec/__fixtures__/weather-mcp-{current,forecast}.json`.
4. Record the real tool names + `content` shapes in this doc (replace the `get_forecast` / `get_current_weather` placeholders above) before starting Phase 1.

### Phase 1 — Bridge infra

5. Create `mcp-bridge.config.ts` (config typing + env read, `MCP_ENABLED` kill-switch, `connectTimeoutMs`, `McpServerPackageRef` static map, `resolveLaunchSpec()` per "Spawn resolution").
6. Create `mcp-server-client.ts` (SDK `Client` + `StdioClientTransport`, spawn with `command: 'node'` + the absolute entry path from `resolveLaunchSpec`, connect with try/catch + timeout, `listTools`, `callTool`, close, single-reconnect-on-failure). The client never receives a relative path; `require.resolve` happens before the spawn.
7. Create `mcp-bridge.service.ts` (`onModuleInit` connect all / `onModuleDestroy` close all; `getTools()`, `hasTool(name)`, `callTool(name, args)` → flattened `content` text string per "MCP callTool result extraction"; `requiresConfirmation(name)` returns the server flag).
8. Create `mcp-bridge.module.ts`; register in `AppModule` imports.
9. `mcp-bridge.service.spec.ts`: mock the SDK client; assert `getTools()` returns tagged `LlmToolSchema[]`, `hasTool`/`callTool` route correctly, connect failure is swallowed, malformed `MCP_SERVERS` JSON falls back to an empty list, the error envelope is returned on `callTool` rejection, and `resolveLaunchSpec` throws on a missing package (so the boot-time path is covered even when the SDK client is mocked).

### Phase 2 — Wire into the agent

10. Extend the **parser's** `LlmToolSchema` in `swagger-tools.parser.ts:14` with `source?: 'swagger' | 'mcp'`. Initialize it on every tool the parser emits (set `source: 'swagger'`).
11. In `AdminAgentService.queryDatabase` (`:115`) and `queryDatabaseStream` (`:207`):
    ```ts
    const tools = this.mcpEnabled
      ? [...this.swaggerToolsParser.getTools(), ...this.mcpBridgeService.getTools()]
      : this.swaggerToolsParser.getTools();
    ```
    Inject `McpBridgeService` and `ConfigService` (for `MCP_ENABLED` lookup) into `AdminAgentService`.
12. Add the MCP dispatch branch at the **top** of `AgentToolExecutorService.executeToolCall` (before the `getEndpoint` lookup, see "Why the MCP branch must precede `getEndpoint`"); inject `McpBridgeService` there too. Add a unit test in a new `agent-tool-executor.service.spec.ts` that mocks the bridge and asserts MCP tool calls bypass the Swagger path.
13. `admin-agent.service.spec.ts` (loop-breaker tests) still references `WeatherController_getWeather` and `WeatherController_getForecast` as test data — leave them alone. They are testing the duplicate-call breaker, not weather functionality; renaming them adds churn for no benefit. Document this in the PR description so reviewers don't flag it.

### Phase 3 — Render specs

14. Add `unwrapResult?: boolean` to `ToolRenderMapping` (default `true`).
15. Update `RenderSpecService.buildRenderSpec` to set `const unwrap = mapping.unwrapResult !== false;` and read `data.result ?? data` only when `unwrap` is true.
16. Add the two new `TOOL_RENDER_MAPPINGS` entries for MCP tool names, with `unwrapResult: false`, transforms mapping the captured fixture shape to the existing `WeatherCurrentRenderData` / `WeatherForecastRenderData`.
17. Create `weather-mcp.render-spec.spec.ts` with two cases — one per fixture — asserting the transform produces the right `RenderSpecType` and the Zod schema passes.

### Phase 4 — Remove hand-built weather (verification-gated)

18. Confirm chat weather queries render correctly via MCP end-to-end: "what's the weather in Tel Aviv?" → step event → `WeatherCurrent` render from MCP data (not `wttr.in`); "5-day forecast" → `WeatherForecast` render from MCP data.
19. Delete `WeatherModule` (controller, service, DTOs, `weather.module.ts`), remove from `AppModule` imports (`app.module.ts:11, 46`).
20. Regenerate `swagger-spec.json` from the controllers (the weather operationIds vanish automatically). Spot-check that `WeatherController_getWeather` / `WeatherController_getForecast` are no longer in `swagger-spec.json`.
21. Remove the two dead `WeatherController_getWeather` / `WeatherController_getForecast` render mappings from `render-spec.service.ts`. Keep `weather.render-spec.ts` (the zod schemas) — still used by the MCP mappings.
22. Angular weather components (`weather-current-card`, `weather-forecast`) stay — they render via `RenderSpecType`, which the adapter still emits. Confirm no other code emits those two old specs (grep `WeatherController_get` across the repo — only `render-spec.service.spec.ts` will remain, and that test will be updated by Phase 4 to cover the MCP mappings instead).

### Phase 5 — Docs

23. Update `documents/architecture-diagram.md`: add `McpBridgeModule` + external `McpServer` node; show the MCP dispatch branch in the tool-execution flow.
24. Update `documents/HANDOFF.md` with the session summary, exact next step, files touched, and decisions made.
25. Update `documents/STATUS.md` to mark the plan done and surface any follow-ups (e.g. `requiresConfirmation` integration, `toolIcons` for MCP).

## Files

### Create

- `backend/src/modules/mcp-bridge/mcp-bridge.module.ts`
- `backend/src/modules/mcp-bridge/mcp-bridge.config.ts`
- `backend/src/modules/mcp-bridge/mcp-bridge.service.ts`
- `backend/src/modules/mcp-bridge/mcp-server-client.ts`
- `backend/src/modules/mcp-bridge/mcp-bridge.service.spec.ts`
- `backend/src/modules/mcp-bridge/__fixtures__/weather-mcp-tools.json` (Phase 0)
- `backend/src/modules/admin-agent/render-spec/__fixtures__/weather-mcp-current.json` (Phase 0)
- `backend/src/modules/admin-agent/render-spec/__fixtures__/weather-mcp-forecast.json` (Phase 0)
- `backend/src/modules/admin-agent/render-spec/weather-mcp.render-spec.spec.ts` (Phase 3)
- `backend/src/modules/admin-agent/services/agent-tool-executor.service.spec.ts` (Phase 2, optional but recommended)

### Modify

- `backend/src/modules/admin-agent/services/swagger-tools.parser.ts` — add `source` to the local `LlmToolSchema`; tag every emitted tool with `source: 'swagger'`.
- `backend/src/modules/admin-agent/admin-agent.service.ts` — merge MCP tools (2 sites in `queryDatabase` and `queryDatabaseStream`); inject `McpBridgeService` + `ConfigService`.
- `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts` — MCP dispatch branch at the top of `executeToolCall`; inject `McpBridgeService`.
- `backend/src/modules/admin-agent/render-spec/render-spec.service.ts` — add `unwrapResult` to `ToolRenderMapping`; add two MCP weather mappings; remove old `WeatherController_*` mappings (after Phase 4).
- `backend/src/modules/admin-agent/render-spec/render-spec.service.spec.ts` — swap the `WeatherController_getWeather` cases to the new MCP tool name once Phase 4 lands.
- `backend/src/app.module.ts` — register `McpBridgeModule`; remove `WeatherModule` (Phase 4).
- `backend/package.json` — `@modelcontextprotocol/sdk` and `@dangahagan/weather-mcp` as **dependencies** (not devDependencies — they ship in prod).
- `documents/architecture-diagram.md` — bridge + dispatch branch.
- `documents/HANDOFF.md` — session summary.
- `documents/STATUS.md` — mark plan done.

### Delete (after verification)

- `backend/src/modules/weather/weather.controller.ts`
- `backend/src/modules/weather/weather.service.ts`
- `backend/src/modules/weather/weather.module.ts`
- `backend/src/modules/weather/dto/weather-current.dto.ts`
- `backend/src/modules/weather/dto/weather-forecast.dto.ts`
- `backend/src/modules/weather/dto/weather-forecast-day.dto.ts`
- `backend/src/modules/weather/dto/weather-query.dto.ts`

> **Why this is safe to delete wholesale:** grep across `backend/src` shows `WeatherService` is only used by `WeatherController`, and `WeatherController` is only mounted by `WeatherModule`. There are no cross-module imports. (`WeatherModule` exports `WeatherService`, but nothing imports it.) The architecture diagram already shows `WeatherModule → WeatherApi` as the only external dependency, so the diagram is also correct after removal.

## Edge cases / risks

- **Local package missing**: if `node_modules/@dangahagan/weather-mcp` is missing or corrupted (e.g. a build that did not run `npm install`, or a partial checkout), `require.resolve('@dangahagan/weather-mcp/dist/index.js')` throws `MODULE_NOT_FOUND` and the spawn fails immediately. The try/catch in `onModuleInit` logs a warning and continues with Swagger-only tools — the app still boots. This is a build/configuration fault, not a network fault: the right response is "fix the install", not "retry the network".
- **Startup delay**: not an issue with the pinned local dependency; `node <entry>` is sub-second. The 10s connect timeout is a safety net for a genuinely hung child process, not a workaround for download time.
- **Cross-CWD path breakage**: a relative path like `node_modules/...` in env would break the moment `cwd` changes (PM2, Docker, `npm run start:dev` from a different shell, etc.). `require.resolve` returns an absolute path that does not depend on `cwd`, which is why the config intentionally does not carry the path.
- **Cross-platform shim differences**: the `node_modules/.bin/<name>` shim is `.cmd` on Windows and a bash script on POSIX; some `child_process` configurations do not pick the right one automatically. `node <absolute-entry.js>` is the same on every OS and avoids the entire shim problem. This is one of the reasons we do not launch through `.bin/...`.
- **Tool-name collision**: unlikely (MCP uses `get_forecast` etc., Swagger uses `WeatherController_*`). `hasTool` short-circuits before Swagger, so no ambiguity. If a future collision appears, namespace MCP names (e.g. `mcp:weather/get_forecast`) — not needed for weather.
- **Stray `source` field**: harmless to the LLM (it only reads `type`/`function`); still, keep it off the `function` object.
- **MCP output shape drift**: the adapter `transform` isolates this; if weather-mcp changes output, only the transform + fixture change.
- **Sequential execution**: MCP tools won't parallelize in v1 (safe default). Sequential matches the read-only nature of weather.
- **No argument validation against `inputSchema`**: the Swagger path relies on DTO + class-validator to validate params before the endpoint runs. The MCP path does a raw `JSON.parse` straight into `callTool` — it does **not** validate against the JSON Schema the server publishes. Risk is low for weather (lat/long are numbers), but as a generic pattern for future MCP servers this is a known gap. Document it; consider a lightweight schema validation (e.g. `zod` — already a dependency via render-spec) in a later phase if a mutating server is added.
- **Process leakage**: `nest start --watch` restarts the Nest process, but the spawned MCP child is a separate process. `onModuleDestroy` must run cleanly on **every** restart, not only on prod SIGTERM, to avoid orphan MCP processes. Phase 1 must verify this on a manual restart.
- **Two `LlmToolSchema` types**: noted above. The bridge returns the parser's local shape; consumers (`AdminAgentService`) accept both because TS structural typing widens the union. If a future consumer narrows the type, this will need consolidation.

## Verification

- **Unit — bridge**: `mcp-bridge.service.spec.ts` — mock the SDK client; assert `getTools()` returns tagged `LlmToolSchema[]`, `hasTool`/`callTool` route correctly, connect failure is swallowed, and malformed `MCP_SERVERS` JSON falls back to an empty list.
- **Unit — render-spec adapter**: `weather-mcp.render-spec.spec.ts` with the **pinned MCP `content` fixtures** from Phase 0 — assert the transform maps the external shape → `WeatherCurrentRenderData` / `WeatherForecastRenderData` and that `RenderSpecType` is emitted correctly.
- **Unit — executor dispatch** (recommended, optional): `agent-tool-executor.service.spec.ts` — mock the bridge to return true from `hasTool`, assert `executeToolCall` returns the bridge's string without ever calling `getEndpoint`.
- **Integration (manual)**: with `MCP_ENABLED=true`, ask the chat _"what's the weather in Tel Aviv?"_ → expect a `step` event for the MCP tool, then a `WeatherCurrent` render block from MCP data (not `wttr.in`).
- **Integration (manual) — process hygiene**: with `MCP_ENABLED=true`, run `npm run start:dev -w backend`, observe one MCP child process, then `Ctrl-C` and confirm no orphan child processes (`Get-Process` on Windows / `pgrep -f weather-mcp` on POSIX).
- **Regression**: `npm run test -w backend` and `npx ng test --watch=false` still green.
- **Kill-switch**: `MCP_ENABLED=false` → app boots and behaves exactly as before (Swagger-only).
- **Build**: `npx ng build` + backend lint/test.

## Rollout / rollback

- Ship with `MCP_ENABLED=false`. Enable per environment after Phase 0 inspection confirms tool names/shapes.
- Rollback = set `MCP_ENABLED=false`; `WeatherModule` removal is the only destructive step and is gated behind Phase 4 verification. To restore WeatherModule after a bad Phase 4 deployment, `git revert` the Phase 4 commits and `MCP_ENABLED=false` is enough to bring the system back to the pre-plan state.
