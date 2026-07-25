# Plan: Fix `Data too long for column 'content'` in `chat_messages`

**Status:** done
**Created:** 2026-07-04
**Symptom (verbatim from logs):**

```
[Nest] ... LOG [LlmClientService] Initializing OpenAI client for OpenRouter using DB credentials.
[Nest] ... LOG [LlmClientService] Generating response via openrouter (model: google/gemma-4-31b-it:free)
[Nest] ... LOG [LlmClientService] Response OK: content=0 chars, toolCalls=1
[Nest] ... LOG [AgentToolExecutorService] Executing tool "GeneticsController_findAll" -> [GET] http://localhost:3000/genetics
[Nest] ... ERROR [AdminAgentController] Error during stream controller: Data too long for column 'content' at row 1
QueryFailedError: Data too long for column 'content' at row 1
    at Query.onResult (.../typeorm/.../MysqlQueryRunner.ts:248:33)
```

## Root Cause

`ChatMessage.content` is defined as:

```ts
// backend/src/modules/admin-agent/entities/chat-message.entity.ts:52
@Column({ type: 'text' })
content!: string;
```

In MySQL, `TEXT` is limited to **65,535 bytes (~64 KB)**.

`AgentSessionService.saveMessage` is invoked for every tool result with the full JSON-stringified HTTP response body. In the failing trace, the agent called `GeneticsController_findAll`, which returns the full genetics list — the JSON payload exceeded 64 KB and the INSERT failed.

Because the same tool message is re-injected into the next LLM iteration via `loadHistory` (`agent-session.service.ts:165-190`), a single oversized tool result kills the conversation permanently until that row is deleted.

Two compounding issues:

1. The DB column is too small to hold any real tool result.
2. The full raw tool result is fed back to the model on every iteration — an unbounded-blowup pattern regardless of column size.

## Fix Strategy

Two small changes:

1. Widen the column from `TEXT` to `MEDIUMTEXT` (1.6M char headroom — more than enough for any single tool result, smaller than `LONGTEXT` to keep row-size cost bounded).
2. Cap tool-result content (and tool-call payloads) to ~50 KB before persistence, appending a structured truncation marker so the model still sees the result shape and counts without blowing context.

The truncation is applied at the **orchestrator** (`admin-agent.service.ts`), not at the executor — the executor still returns the full data so the LLM gets it on the _current_ iteration; persistence trims for the _next_ iteration.

## Files to Change

| File                                                              | Change                                                                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/modules/admin-agent/entities/chat-message.entity.ts` | `text` → `mediumtext`; refresh JSDoc example/description                                                                                                          |
| `backend/src/modules/admin-agent/admin-agent.service.ts`          | Add `truncateForStorage(content, maxBytes = 50_000)` helper; apply to both tool-result row (line 221) and assistant tool-call row (line 188) before `saveMessage` |

## Files NOT to Touch (deliberate)

- `backend/src/modules/admin-agent/services/agent-session.service.ts` — `saveMessage` signature stays the same; truncation is the caller's concern.
- `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts` — return full result so the LLM still gets it on the current iteration; persistence trims.
- `backend/src/app.module.ts` — `synchronize: true` already handles the schema change on next boot; no migration file required (none exist in this project today).
- `backend/src/modules/admin-agent/admin-agent.controller.ts` — error path is correct; it will stop firing once the column accepts the row.
- `loadHistory` in `agent-session.service.ts` — does not need to change; the model will naturally see the truncated preview on the next iteration, which is the desired behavior.

## Implementation Detail: `truncateForStorage`

**Critical: truncate on the `Buffer` (real bytes), not on the `string` (characters).**

The first draft of this helper used `content.slice(0, Math.floor(maxBytes * 0.95))`. That cuts on UTF-16 code units, but `maxBytes` is a *byte* budget and Hebrew text is 2 bytes/char in UTF-8. A genetics list response in this project is heavy on Hebrew descriptions / scent / effects, so the stored row would land at almost **2×** the budget — defeating the purpose and re-triggering `Data too long` in edge cases.

```ts
private truncateForStorage(content: string, maxBytes = 50_000): string {
  const fullBuffer = Buffer.from(content, 'utf8');
  if (fullBuffer.byteLength <= maxBytes) {
    return content;
  }

  const originalLength = content.length;
  const marker = JSON.stringify({
    _truncated: true,
    _originalLength: originalLength,
    _note: 'Tool result was truncated before persistence to stay within message-size limits. Re-call the tool with a narrower filter if the full payload is required.',
  });

  const previewBudget = maxBytes - Buffer.byteLength(marker, 'utf8');
  const preview = fullBuffer.subarray(0, previewBudget).toString('utf8');

  return `${preview}${marker}`;
}
```

Two substantive changes from the first draft:

1. **Slice the `Buffer`, not the `string`** — `fullBuffer.subarray(0, previewBudget).toString('utf8')` cuts in real bytes, so Hebrew, emoji, and other multi-byte characters cannot push the row over `maxBytes`.
2. **Compute the marker budget exactly** — `maxBytes - Buffer.byteLength(marker, 'utf8')` replaces the 5% headroom estimate. The marker is now always inside the budget by construction.

## Test (must assert in bytes, not characters)

The original bug would have passed a `result.length <= maxBytes` assertion. The only assertion that catches it is on the encoded byte length.

```ts
describe('AdminAgentService.truncateForStorage', () => {
  // Build a Hebrew-heavy payload (genetics description / scent / effects style)
  const hebrewLine =
    'תיאור זן עם הרבה עברית: יציב, מרגיע, עם ניחוחות הדרים ואדמה. ';
  const hebrewHeavyContent = hebrewLine.repeat(3000); // ~138 KB of mostly Hebrew

  it('returns the original content when it fits within maxBytes (Hebrew)', () => {
    // arrange
    const smallContent = hebrewLine.repeat(50); // ~2.3 KB
    const svc = makeService();
    const max = 50_000;

    // act
    const result = (svc as any).truncateForStorage(smallContent, max);

    // assert
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(max);
    expect(result).toBe(smallContent); // unchanged
  });

  it('truncates Hebrew content so the encoded byte length is at or under maxBytes', () => {
    // arrange
    const svc = makeService();
    const max = 50_000;

    // act
    const result = (svc as any).truncateForStorage(hebrewHeavyContent, max);

    // assert — this is the assertion the first draft would have failed
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(max);
    // marker must be present so the model can see the result was trimmed
    expect(result).toContain('"_truncated":true');
    expect(result).toContain(`"_originalLength":${hebrewHeavyContent.length}`);
  });

  it('truncates mixed Hebrew + JSON payload (realistic genetics response) to <= maxBytes', () => {
    // arrange — simulate a JSON-stringified genetics list
    const realistic = JSON.stringify(
      Array.from({ length: 200 }, (_, i) => ({
        id: i,
        name: `זן מספר ${i}`,
        description: hebrewLine.repeat(10),
        effects: ['מרגיע', 'מעורר', 'מרומם'],
        scent: 'הדרים, אדמה, אורן',
      })),
    );
    const svc = makeService();
    const max = 50_000;

    // act
    const result = (svc as any).truncateForStorage(realistic, max);

    // assert
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(max);
    expect(result).toContain('"_truncated":true');
  });
});
```

**Why `Buffer.byteLength(result, 'utf8')` and not `result.length`:** `result.length` counts UTF-16 code units, not bytes. For ASCII, `length * 1 ≈ byteLength`. For Hebrew, `length * 2 ≈ byteLength`. For a mixed payload, `length` is a strict *underestimate* of the byte size — which is exactly how a "passes the test but still explodes in MySQL" bug hides.

## Call-Site Changes

In `admin-agent.service.ts`:

**Line 188-194** — assistant tool-call row:

```ts
await this.agentSessionService.saveMessage(
  userId,
  session.id,
  "assistant",
  this.truncateForStorage(JSON.stringify(llmResponse.toolCalls)),
  "YES_TOOL_CALLS",
);
```

**Line 221** — tool-result row:

```ts
await this.agentSessionService.saveMessage(
  userId,
  session.id,
  "tool",
  this.truncateForStorage(resultData),
  call.id,
);
```

## Entity Change

`backend/src/modules/admin-agent/entities/chat-message.entity.ts:52`:

```ts
@ApiProperty({
  description:
    'Stored message body. Column is MEDIUMTEXT (~1.6M chars) so that large tool results can be persisted without truncation. ' +
    'Rows may still be trimmed by the orchestrator before write to keep LLM context bounded — see the `_truncated` marker.',
  example: 'Here is the answer...',
})
@Column({ type: 'mediumtext' })
content!: string;
```

## Verification

1. **Restart backend** — TypeORM `synchronize: true` will `ALTER TABLE chat_messages MODIFY content MEDIUMTEXT`. Confirm with:
   ```sql
   SHOW COLUMNS FROM chat_messages WHERE Field = 'content';
   ```
   Expect `Type = mediumtext`.
2. **Reproduce the original request** — any prompt that causes the agent to call `GeneticsController_findAll`.
3. **Expected logs (no error):**
   ```
   [LlmClientService] Response OK: content=0 chars, toolCalls=1
   [AgentToolExecutorService] Executing tool "GeneticsController_findAll" -> [GET] http://localhost:3000/genetics
   ```
4. **Inspect the new tool row:**
   ```sql
   SELECT LENGTH(content), LEFT(content, 200)
   FROM chat_messages
   WHERE role = 'tool'
   ORDER BY id DESC
   LIMIT 1;
   ```
   Expect `LENGTH(content) ≤ 50,000` and a JSON body ending with `"_truncated": true` marker.
5. **Confirm the conversation can continue** — the follow-up LLM iteration must succeed. This is the regression test for the "permanent kill" symptom.
6. **Backend tests:** `npm run test -w backend`.

## Risks & Trade-offs

- **Hebrew / multi-byte content** is the reason we cut on `Buffer` bytes rather than `string` characters. An assertion on `result.length` would let Hebrew payloads through as ~2× the budget. All unit tests for this helper **must** assert on `Buffer.byteLength(result, 'utf8')` — see the test block above.
- **Truncated tool results** lose information on the _next_ iteration. Acceptable because the current code already breaks the entire conversation when a single row is too large. A truncated preview is strictly better than a hard error. If full-fidelity tool payloads are later required, the right fix is a separate "raw tool payloads" table or blob-storage link — out of scope here.
- **Existing rows** in `chat_messages` with the old broken content are not backfilled. If a session was killed mid-error, the next `loadHistory` sees whatever's there. If those rows themselves exceed 64 KB, the error will reappear for those specific sessions until cleaned up. Mitigation: any future re-run of a tool call will write a fresh, trimmed row.
- **`MEDIUMTEXT` vs `LONGTEXT`** — chosen deliberately. 1.6M chars is more than enough for any single tool result, and `MEDIUMTEXT` keeps per-row cost bounded compared to `LONGTEXT`'s 4 GB ceiling.
- **User-prompt rows** are not trimmed. They are bounded by the HTTP request body limit and were not in the failing trace. Defense-in-depth trimming of user prompts is out of scope unless explicitly requested.

## Out of Scope (deferred)

- Adding a `raw_tool_payloads` table for full-fidelity tool result retention.
- Trimming user-prompt rows.
- Backfilling or cleaning pre-existing oversized rows from `chat_messages`.
- Switching off `synchronize: true` and introducing a real migration system.
