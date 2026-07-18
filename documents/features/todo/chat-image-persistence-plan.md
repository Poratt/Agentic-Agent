# Chat — Image Persistence in Database

## Problem

Images sent in chat are forwarded to the LLM as Base64 data URLs but are never persisted to the database. When a user reloads a session, the image disappears — only the text prompt survives. The user loses the visual context of the conversation.

## Goal

Persist the image a user attaches to a chat message as a Base64 data URL in a new nullable column on the `chat_messages` table, so that:

1. Reloading an existing session displays the image in the user's message bubble.
2. The full chat history (text + image) is preserved.
3. The LLM continues to receive images the same way (no protocol change).

## Non-Goals

- No client-side image compression (the client already enforces a size limit — see "Client cap" below).
- No multi-image support per message (single image only, same as today).
- No independent image deletion — deleting a session cascades and removes everything.
- No file-system storage — everything stays in a Base64 column.
- No changes to the SSE streaming protocol.
- No image support in assistant messages.

## Storage Decision

### Column Size

The existing `content` column on `chat_messages` is `mediumtext` — confirmed at `chat-message.entity.ts:57`:

```typescript
// chat-message.entity.ts:57
@Column({ type: 'mediumtext' })
content!: string;
```

`MEDIUMTEXT` supports ~15.97 MB. Base64 encoding inflates a raw image by ~33%. A raw image at the client cap of 8 MB becomes ~10.67 MB after encoding (the data-URL prefix `data:image/png;base64,` is negligible at ~22 bytes). This leaves ~5.3 MB of headroom under the ~15.97 MB cap.

| Option | Max Base64 size | Fits 8 MB image? | Verdict |
|--------|----------------|--------------------|---------|
| `TEXT` | ~48 KB | No | ❌ |
| `MEDIUMTEXT` | ~12 MB | Yes (~10.67 MB for 8 MB) | ✅ |
| `LONGTEXT` | ~3 GB | Overkill | ❌ |

**Decision:** `MEDIUMTEXT`. Matches the existing `content` column type (verified above) and fits the 8 MB client-side limit after Base64 encoding.

**Client cap:** 8 MB. Currently enforced as a raw literal in `frontend/src/app/features/chat/chat/chat.ts:188`:

```typescript
// chat.ts:188
if (file.size > 10 * 1024 * 1024) {
  this.actionError.set('התמונה גדולה מדי (מקסימום 10MB). נסה קובץ קטן יותר.');
```

This is **not a named constant** — it is an inline literal. Change the literal to `8 * 1024 * 1024` and update the error message to `'מקסימום 8MB'`. Since there is no shared constant, no other checks will drift. Server-side enforcement via `@MaxLength(14_000_000)` on the DTO adds a second safety net.

### Column Name

`imageUrl` — consistent with OpenAI's `image_url` terminology used in `llm-client.service.ts`.

---

## Implementation Plan

### PR 1 — Refactor `saveMessage` (no behavior change)

> This PR is a pure refactor. Every call site is updated to the new signature, but no new fields are added. This keeps the diff small and revertable.

#### 1.1 Refactor `saveMessage` to options object

**File:** `backend/src/modules/admin-agent/services/agent-session.service.ts`

The current signature has 6 positional params with 2 trailing nullable defaults. Convert to a single options object:

```typescript
interface SaveMessageOptions {
  toolCallId?: string | null;
}

async saveMessage(
  userId: number,
  sessionId: number,
  role: 'user' | 'assistant' | 'tool',
  content: string,
  options: SaveMessageOptions = {},
): Promise<ChatMessage> {
  const message = this.chatMessageRepository.create({
    userId,
    sessionId,
    role,
    content,
    toolCallId: options.toolCallId ?? null,
  });
  return this.chatMessageRepository.save(message);
}
```

#### 1.2 Update all call sites

Before editing, find every caller. Use this exact command (copy-pasteable; filters out test files and same-file self-references):

```bash
grep -rn "\.saveMessage(" backend/src --include="*.ts" | grep -v "\.spec\.ts"
```

This catches callers in `admin-agent.service.ts` and any other services. Update every call to use the new options shape:

- Call sites that pass `toolCallId` become `{ toolCallId: 'YES_TOOL_CALLS' }`.
- Call sites that pass `null` for `toolCallId` **omit the options argument entirely** (the default `{}` applies). Do not pass `{}` — omit for cleaner call sites.

#### 1.3 Verify

- `npm run lint -w backend`
- `npm run test -w backend` — all existing tests pass
- No behavior change — diff is purely mechanical
- **Row equality check:** Before and after the refactor, run the same `saveMessage` call against a staging DB row and `git diff` the resulting SQL. The persisted row (including `null` vs `undefined` becoming explicit `null` in the `toolCallId` column) must be byte-for-byte identical. A drift here means the refactor silently changes downstream query results.

---

### PR 2 — Add `imageUrl` (feature)

#### 2.1 Backend — Entity: add `imageUrl` column

**File:** `backend/src/modules/admin-agent/entities/chat-message.entity.ts`

Add a new nullable column after `toolCallId`. No Swagger decorators on the entity (those belong on DTOs per NestJS convention):

```typescript
@Column({ type: 'mediumtext', nullable: true, default: null })
imageUrl!: string | null;
```

#### 2.2 Backend — Response DTO: add `imageUrl` (documentation only)

**File:** `backend/src/modules/admin-agent/dto/chat-message-response.dto.ts`

Add:

```typescript
// Documentation-only DTO — the controller returns the entity directly.
// This DTO exists solely for Swagger schema generation.
@ApiProperty({
  description: 'Optional Base64 data URL of an image attached to this user message.',
  nullable: true,
})
imageUrl!: string | null;
```

> **⚠️ Do not add `plainToInstance` mapping in the controller.** The entity IS the response shape. This DTO is Swagger documentation only. If a future reader adds `plainToInstance(ChatMessageResponseDto, msg)`, they are adding ceremony without validation — remove it.

#### 2.3 Backend — Request DTO: server-side validation

**File:** `backend/src/modules/admin-agent/dto/agent-request.dto.ts`

The `image` field already exists. Add class-validator guards so a malicious client cannot blow the column or inject non-image data:

```typescript
@ApiPropertyOptional({
  description: 'Optional Base64 data URL of an image to attach. Max 8 MB raw.',
  example: 'data:image/jpeg;base64,/9j/4AAQ...',
})
@IsOptional()
@IsString()
@MaxLength(14_000_000)
@Matches(/^data:image\/[a-zA-Z0-9+.-]+;base64,/)
image?: string;
```

Import `MaxLength` and `Matches` from `class-validator`.

#### 2.4 Backend — Service: add `imageUrl` to options

**File:** `backend/src/modules/admin-agent/services/agent-session.service.ts`

Extend the `SaveMessageOptions` interface from PR 1:

```typescript
interface SaveMessageOptions {
  toolCallId?: string | null;
  imageUrl?: string | null;
}
```

Add `imageUrl` to the `create()` call:

```typescript
const message = this.chatMessageRepository.create({
  userId,
  sessionId,
  role,
  content,
  toolCallId: options.toolCallId ?? null,
  imageUrl: options.imageUrl ?? null,
});
```

#### 2.5 Backend — Service: persist image on user message

**File:** `backend/src/modules/admin-agent/admin-agent.service.ts`

At the `saveMessage` call for the user message (both `queryDatabase` and `queryDatabaseStream`), pass `imageUrl`:

```typescript
await this.agentSessionService.saveMessage(
  userId,
  session.id,
  'user',
  prompt,
  { imageUrl: image },
);
```

Assistant and tool `saveMessage` calls remain unchanged (options omitted, defaults to `{}`).

#### 2.6 Backend — Controller: session messages endpoint

**File:** `backend/src/modules/admin-agent/admin-agent.controller.ts`

The controller returns the entity directly. No `plainToInstance` mapping. The response DTO (§2.2) is documentation only for Swagger:

```typescript
async getSessionMessages(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: RequestWithUser,
) {
  if (!req.user) {
    throw new UnauthorizedException();
  }
  // DTO is documentation-only; the entity IS the response.
  return this.adminAgentService.getSessionMessages(id, req.user.sub);
}
```

#### 2.7 Backend — Controller: response size cap

**Risk:** A session with 50 images can produce a ~500 MB JSON response and lock the Node.js event loop.

**API contract decision:** The current `getSessionMessages` returns `ChatMessage[]`. Changing it to `{ messages: ChatMessage[]; hasMoreImages: boolean }` is a **breaking change** for existing clients.

**Approach:** Keep the return type as `ChatMessage[]` and add a custom response header for the flag. This preserves backward compatibility:

```
HTTP/1.1 200 OK
X-Has-More-Images: true
Content-Type: application/json

[{ ... }, { ... }]
```

The frontend reads the header. Old clients that ignore the header still get a valid array.

**Cap logic:** In the service layer (`getSessionMessages`), after loading messages ordered by `createdAt ASC, id ASC` (chronological with `id` as the tiebreaker — the `ORDER BY` is pinned to keep the "first 20" deterministic across deployments even if clock skew or backdated rows exist), if the count of messages with `imageUrl IS NOT NULL` exceeds 20, nullify `imageUrl` on messages beyond the 20th. The controller sets the `X-Has-More-Images` header to `'true'` (strictly `count > 20`) or `'false'`. The boundary case (exactly 20 images) returns `X-Has-More-Images: false` — no off-by-one.

#### 2.8 Backend — Controller: lazy-load endpoint (batch)

**Endpoint:**

```
POST /admin-agent/messages/images
Body: { messageIds: number[] }
Response: { [messageId: number]: string | null }
```

Returns the `imageUrl` for each requested message ID. The frontend calls this once for all messages whose images were stripped by the cap — no N+1.

**Batch size cap:** Validate that `messageIds` is an array with at most 50 entries. Reject with 400 otherwise — this prevents a single client from re-fetching every stripped image and recreating the original 500 MB response.

```typescript
@UseGuards(JwtAuthGuard)
@Post('messages/images')
async getMessageImages(
  @Body('messageIds') messageIds: number[],
  @Req() req: RequestWithUser,
) {
  if (!req.user) {
    throw new UnauthorizedException();
  }
  if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 50) {
    throw new BadRequestException('messageIds must be a non-empty array of at most 50 IDs.');
  }
  // Verify ownership: load messages with session join, assert all belong to req.user.sub
  const messages = await this.chatMessageRepository.find({
    where: {
      id: In(messageIds),
      session: { userId: req.user.sub },
    },
  });
  if (messages.length !== messageIds.length) {
    throw new ForbiddenException('One or more messages do not belong to your sessions.');
  }
  return Object.fromEntries(messages.map((m) => [m.id, m.imageUrl]));
}
```

This prevents IDOR — a logged-in user cannot fetch images from another user's sessions.

#### 2.9 Frontend — Model

**File:** `frontend/src/app/core/models/chat-message.interface.ts`

Add an optional `imageUrl` field alongside the existing `imagePreview`:

```typescript
export interface IChatMessage {
  id?: number;
  sessionId?: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt?: Date;
  steps?: IChatStep[];
  /** In-memory data URL of the image being composed before send. Not persisted. */
  imagePreview?: string;
  /** Base64 data URL of an image persisted in the backend. Returned from the API on session load. */
  imageUrl?: string;
}
```

#### 2.10 Frontend — Chat Service

**File:** `frontend/src/app/core/services/chat.service.ts`

Update `getMessages` (or equivalent) to read the `X-Has-More-Images` response header (via `response.headers.get('x-has-more-images')` — Node lowercases header keys on read; using lowercase on both read and in the test assertion avoids platform-fragile behavior across Express, axios, and any upstream proxy that canonicalizes casing). Store the boolean flag on the chat store so the chat component can render the "Load more images" affordance. Do **not** look for `hasMoreImages` in the JSON body — the body remains a bare array.

When the user clicks "Load more images", collect the `id` values of all messages where `imageUrl` is `undefined` (stripped by the cap) and call `POST /admin-agent/messages/images` with the batch. The response is `{ [msgId]: string | null }`. Patch each message's `imageUrl` in the `messages` writable signal:

```typescript
this.messages.update((msgs) =>
  msgs.map((m) => (m.id && imageMap[m.id] !== undefined ? { ...m, imageUrl: imageMap[m.id] } : m))
);
```

`messages` must be a **writable signal** held on the chat **service** (not on the component), and the component must read it via a signal getter (e.g. `this.chatService.messages()`), **not** via `input.required` or `input()`. This is required so the lazy-load `.update()` call in the service propagates to the template even if the component is `OnPush` and the messages array is not re-passed down as an input.

**Verify during implementation** — exact function names depend on the current service structure.

#### 2.11 Frontend — Chat Message Template

**File:** `frontend/src/app/features/chat/chat-message/chat-message.html`

Update the image rendering condition to fall back from `imagePreview` (in-memory) to `imageUrl` (from DB):

```html
@if (isUser() && (message().imagePreview || message().imageUrl)) {
    <div class="message-attachment">
        <img [src]="message().imagePreview ?? message().imageUrl" alt="תמונה מצורפת" />
    </div>
}
```

`??` (nullish coalescing) is used on the `<img [src]>` binding instead of `||` so that an empty-string `imagePreview` (a future "cleared" marker) falls through to `imageUrl` rather than being treated as falsy and rendering nothing.

**Clear `imagePreview` on send — explicit signal sequence:**

In `chat.ts`, the `sendMessage()` function must follow this order:

1. Capture `selectedImagePreview()` (the `signal<string | null>` that holds the Base64 data URL string for thumbnail display) into a local variable `const capturedPreview = this.selectedImagePreview();`. Both `selectedImageBase64` and `selectedImagePreview` carry the same Base64 data URL string — there is no object URL (`URL.createObjectURL`) involved.
2. Call `clearSelectedImage()` — this sets `selectedImageBase64` to `null` and `selectedImagePreview` to `null`.
3. Create the optimistic `IChatMessage` object with `imagePreview: capturedPreview` and push it into `messages`.
4. Call `sendPromptToSession(...)` with the original `capturedPreview` value.

This order ensures `imagePreview` is only set on the single optimistic message and is never left stale. On session reload, `imagePreview` is always `undefined` (never restored from the API), so `imageUrl` from the DB is the sole source.

**No CSS change needed** — `.message-attachment` styles already exist.

#### 2.12 Frontend — client-side size cap

**File:** `frontend/src/app/features/chat/chat/chat.ts`

Change the literal at line 188 from `10 * 1024 * 1024` to `8 * 1024 * 1024` and update the error message to `'מקסימום 8MB'`.

#### 2.13 Backend — History loading

**File:** `backend/src/modules/admin-agent/services/agent-session.service.ts`

`loadHistory()` stays text-only. The LLM does not need images from prior turns. **No change.**

#### 2.14 Backend — Cascade deletion

Already handled by `onDelete: 'CASCADE'` on the `ChatMessage.session` relation. Deleting a session removes all messages including their images. **No change.**

#### 2.15 Backend — Stream endpoint

**File:** `backend/src/modules/admin-agent/admin-agent.controller.ts`

`dto.image` is already forwarded to `queryDatabaseStream`. **No change.**

---

### 3. DB Migration

The project uses `synchronize: true` with TypeORM. The new column is added automatically on next backend startup.

> **⚠️ Convention, not a recommendation:** `synchronize: true` is a known anti-pattern in production — silent data loss can occur on column type changes. This project uses it by convention for rapid development. Future schema changes should migrate to proper TypeORM migrations before production deployment. Do not copy this pattern in new projects.
>
> **Operational note:** Adding a nullable `MEDIUMTEXT` column with `default null` does not rewrite existing rows, so on a large `chat_messages` table the ALTER should be a fast metadata-only operation in MySQL 8 (typically <1s). Expect backend startup to take an extra ~5–30s on a million-row table while TypeORM synchronizes the schema — if deploy looks hung, this is why. Do not roll back the pod.

**Revert path:** To roll back PR 2 on a live DB after deploy, run:

```sql
ALTER TABLE chat_messages DROP COLUMN imageUrl;
```

The code revert removes the `imageUrl` field from the entity, the DTO, the `SaveMessageOptions` interface, and the frontend `IChatMessage` interface — four code spots total. The SQL drop is sufficient for the DB side; no other tables reference this column.

---

## Files Touched

### PR 1 (refactor)

| File | Change |
|------|--------|
| `backend/src/modules/admin-agent/services/agent-session.service.ts` | Refactor `saveMessage` to options object |
| `backend/src/modules/admin-agent/admin-agent.service.ts` | Update all call sites to new signature |

### PR 2 (feature)

| File | Change |
|------|--------|
| `backend/src/modules/admin-agent/entities/chat-message.entity.ts` | Add `imageUrl` column |
| `backend/src/modules/admin-agent/dto/chat-message-response.dto.ts` | Add `imageUrl` field (documentation only) |
| `backend/src/modules/admin-agent/dto/agent-request.dto.ts` | Add `@MaxLength` + `@Matches` validation on `image` |
| `backend/src/modules/admin-agent/services/agent-session.service.ts` | Add `imageUrl` to `SaveMessageOptions` |
| `backend/src/modules/admin-agent/admin-agent.service.ts` | Pass `{ imageUrl: image }` in user message save |
| `backend/src/modules/admin-agent/admin-agent.controller.ts` | Add `X-Has-More-Images` header; add batch lazy-load endpoint |
| `frontend/src/app/core/models/chat-message.interface.ts` | Add `imageUrl` field |
| `frontend/src/app/core/services/chat.service.ts` | Read `X-Has-More-Images` header; call batch endpoint |
| `frontend/src/app/features/chat/chat-message/chat-message.html` | Render `imageUrl` as fallback |
| `frontend/src/app/features/chat/chat/chat.ts` | Change size cap to 8 MB; clear `imagePreview` on send |

---

## Verification

1. `npm run lint -w backend` — must pass.
2. `npx ng lint` (run from `frontend/`) — must pass.
3. `npx ng build` (run from `frontend/`) — must succeed.
4. `npm run test -w backend` — must pass.
5. **Automated test — service:** Add a unit test (or extend the existing one — confirm `agent-session.service.spec.ts` already exists next to the service; if not, create new) that:
   - Calls `saveMessage(userId, sessionId, 'user', 'test', { imageUrl: 'data:image/png;base64,abc' })`.
   - Asserts the returned entity has `imageUrl` equal to `'data:image/png;base64,abc'`.
   - Calls `getSessionMessages(sessionId, userId)` and asserts `imageUrl` is present on the message.
   - Calls `saveMessage(userId, sessionId, 'assistant', 'reply')` (no options) and asserts `imageUrl` is `null`.
6. **Automated test — controller:** Add a test (or extend the existing `admin-agent.controller.spec.ts` — confirm it exists; create new if not) that:
   - Mocks a session with 21 messages having images.
   - Calls `getSessionMessages`.
   - Asserts `res.headers['x-has-more-images']` is `'true'` (lowercase key per Node convention; do not assert `'X-Has-More-Images'`).
   - Asserts the 21st message's `imageUrl` is `null` in the response body.
   - Asserts the boundary case (exactly 20 images) returns `res.headers['x-has-more-images']` as `'false'`.
   - Calls `POST /messages/images` with 50+ IDs and asserts 400 rejection.
   - Calls `POST /messages/images` with IDs from another user's session and asserts 403.
7. Manual end-to-end test:
   - Send a message with an image → confirm it is saved to DB.
   - Reload the session → confirm the image is displayed.
   - Delete the session → confirm the image is removed.
   - Confirm assistant messages have no image.
   - Send a message with a 9 MB image → confirm server-side validation rejects it.
   - Send a message with `not-an-image` as the image field → confirm regex validation rejects it.
   - Confirm `imagePreview` is cleared after send (inspect signals in dev tools).
   - Send a session with 21 images → confirm only the first 20 have images in the response and `X-Has-More-Images` is `true`.
   - Click "Load more images" → confirm the remaining images load via the batch endpoint.

---

## Known Limitations

- Single image per message (multi-image is out of scope).
- Max image size: 8 MB raw (client literal in `chat.ts:188`) + server-side `@MaxLength(14_000_000)` safety net.
- LLM does not see images from prior turns (only the current turn).
- Sessions with many images will be heavy in the database (no compression).
- No client-side image compression — Base64 in MySQL is memory-inefficient.
- Response size for image-heavy sessions is capped at 20 images; the frontend shows a "Load more images" affordance for the remainder via a batch endpoint.
