# Chat — Image Upload & Drag & Drop

## Problem

The chat today is text-only. Users want to send images alongside their prompt and have the LLM reason about them. The chat input also has no drag-and-drop affordance — only the model-selector dropdown and a Send button.

User-visible issue:

- No way to ask the agent about a screenshot, a product photo, or any visual.
- Any image must be described in text or hosted elsewhere, then linked.

## Goal

Let the user attach a single image to a chat message in two ways:

1. A small icon button inside the prompt actions row that opens the file picker.
2. Drag and drop an image file directly onto the chat area.

When sent, the image is forwarded to the LLM as part of a multimodal user turn. The image is NOT persisted to the database in v1 (no schema migration). The in-memory chat bubble shows a thumbnail of the image so the user gets immediate visual feedback; on reload, only the text portion of the user turn is replayed from history.

## Non-Goals

- No persistence of uploaded images in MySQL.
- No multiple images per message (single image only in v1).
- No image resizing / compression on the client (rely on the OpenAI provider to handle size limits; a single chat image is well under 20 MB).
- No new GenUI, no schema migration, no new env vars.
- No image rendering in the assistant message (the LLM may emit images later, but that is out of scope).
- No change to streaming protocol or the existing `LlmMessage` history shape.

## Existing Context

- `backend/src/modules/admin-agent/admin-agent.service.ts` exposes `queryDatabaseStream(prompt, userId, sessionId?, provider?, model?)`. The controller in `admin-agent.controller.ts` forwards the DTO to it.
- `backend/src/modules/admin-agent/dto/agent-request.dto.ts` is the DTO. Only `prompt` is required; everything else is optional. `Validators` from `class-validator` are used throughout.
- `backend/src/modules/llm/services/llm-client.service.ts` builds the OpenAI `messages` array. The current user message is built as `{ role: 'user', content: prompt }` (a plain string) at lines 39 and 83. The `openai` package is `^6.39.0`, which supports `OpenAI.Chat.Completions.ChatCompletionContentPart[]` for multimodal user content.
- `LlmRequest` (in `backend/src/modules/llm/types/llm.types.ts`) is the only place that needs a new optional `image?: string` field. The only downstream consumers of `LlmService` are inside `admin-agent.service.ts` (three call sites — `queryDatabase`, `queryDatabaseStream` planning phase, `queryDatabaseStream` token phase). The direct `LlmClientService` callers (`llm-health.service`, `genetics.service`, `terpene.service`) are not chat and will keep working unchanged because `image` is optional.
- `IChatMessage` (in `frontend/src/app/core/models/chat-message.interface.ts`) has `content: string` only. It is heavily used as a string (`.trim()`, `+` concatenation, `clipboard.writeText`, reactive form `patchValue`, edit-and-resend, "send again", copy). Widening its type would break 8+ call sites. **Do not change `content`. Add an optional `imagePreview?: string` field for the in-memory thumbnail only.**
- `ChatService.sendMessageStream(prompt, sessionId?, modelSelection?)` (in `frontend/src/app/core/services/chat.service.ts`) posts `{ prompt, sessionId, ...modelSelection }` as JSON to `/admin-agent/query-stream`. The only consumer is `chat.ts:211`.
- The chat form in `frontend/src/app/features/chat/chat/chat/chat.ts` defines `prompt: ['', [Validators.required, Validators.minLength(1)]]`. The send button is disabled on `chatForm.invalid`. With this PR, an image-only message must be sendable, so the `Validators.required` constraint on `prompt` must be relaxed.
- No drag/drop or file-upload code exists anywhere in the frontend.

## Design Decisions

1. **Storage model:** The image is sent over the wire to the LLM, never persisted. The DB row for the user message stores only the text portion of the prompt (or empty string for an image-only send). This avoids a schema migration and avoids bloat in MySQL.
2. **In-memory thumbnail:** A new optional `imagePreview?: string` field on `IChatMessage` holds the data URL. The user-message bubble renders it as a small `<img>` thumbnail. It is set only on the optimistic in-memory message; on reload from history, it is undefined and the bubble shows the text only.
3. **Image-only sends:** Allowed. The form's `Validators.required` on `prompt` is removed. Send is enabled when `prompt` has text OR an image is attached.
4. **Single image only:** Selecting a new image replaces the previous selection. No multi-image array.
5. **Drag-and-drop scope:** Drop is allowed anywhere on `.chat-root-container`. The overlay covers the whole root while a file is being dragged.
6. **No backend change to `LlmMessage`:** History messages stay text-only. The LLM never sees prior-turn images (same as the OpenAI Assistants API default).

## Implementation Plan

### 1. Backend

#### 1.1 DTO: add optional `image` field

File: `backend/src/modules/admin-agent/dto/agent-request.dto.ts`

- Add `@ApiPropertyOptional` + `@IsOptional()` + `@IsString()` for `image?: string`. Description for an LLM agent should explain: "Optional Base64 data URL of an image to attach to this turn. Format: `data:image/<mime>;base64,<payload>`. If present, the user message is sent to the LLM as a multimodal content array containing this image plus the prompt text. If absent, the user message is sent as plain text." Example: `data:image/jpeg;base64,/9j/4AAQ...`.

#### 1.2 Wire `image` through the agent service

File: `backend/src/modules/admin-agent/admin-agent.service.ts`

- `queryDatabase(prompt, userId, requestedSessionId?, provider?, model?, image?)` — add trailing optional `image?: string`.
- `queryDatabaseStream(prompt, userId, requestedSessionId?, provider?, model?, image?)` — same.
- Both methods pass `image` into the `LlmRequest` object: `{ prompt, systemContext, messageHistory, tools, providerOverride, modelOverride, image }`.
- `saveMessage` continues to receive only the text `prompt` (per Design Decision 1). Do not persist the image.
- The session-title heuristic (`updateSessionTitleIfDefault`) already uses the prompt text, which is fine — an image-only send will set the title from the empty prompt (or skip). Look at this and decide: if prompt is empty, skip the title update. This avoids setting a session title to "".

#### 1.3 Thread `image` into `LlmRequest` type

File: `backend/src/modules/llm/types/llm.types.ts`

- Add `image?: string;` to the `LlmRequest` interface with a JSDoc comment.

#### 1.4 Build the multimodal user message in `LlmClientService`

File: `backend/src/modules/llm/services/llm-client.service.ts`

- Add a small private helper:
  ```
  private buildUserMessage(prompt: string, image?: string): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string
  ```

  - If `image` is undefined/empty, return `prompt` (string).
  - Otherwise, return `[{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }]` cast to `OpenAI.Chat.Completions.ChatCompletionContentPart[]`.
- Both `generateResponse` and `generateStream` use this helper at the user-message construction site (currently lines 39 and 83). Replace the literal `{ role: 'user', content: prompt }` with `{ role: 'user', content: buildUserMessage(prompt, image) }`.

#### 1.5 Controller — pass `image` through

File: `backend/src/modules/admin-agent/admin-agent.controller.ts`

- `streamChat` reads `dto.image` and passes it to `queryDatabaseStream` (as a new trailing arg).

### 2. Frontend

#### 2.1 Service — accept and forward `image`

File: `frontend/src/app/core/services/chat.service.ts`

- Extend `sendMessageStream` signature to add a 4th optional arg: `image?: string`.
- Add `image` to the JSON body: `body: JSON.stringify({ prompt, sessionId, image, ...modelSelection })`.

#### 2.2 `IChatMessage` — add optional in-memory preview

File: `frontend/src/app/core/models/chat-message.interface.ts`

- Add optional `imagePreview?: string;` to `IChatMessage`. JSDoc: "Optional in-memory data URL of the image attached to this user turn. Not persisted to the backend; exists only while the message is in the active session view."

#### 2.3 Chat component — state + drag/drop + upload

File: `frontend/src/app/features/chat/chat/chat/chat.ts`

- Import `ViewChild` is already imported; add `ElementRef` is already imported. Add `HostListener` from `@angular/core`.
- Add three signals:
  - `isDragging = signal(false)` — drives the overlay visibility.
  - `selectedImageBase64 = signal<string | null>(null)` — the data URL to send.
  - `selectedImagePreview = signal<string | null>(null)` — same value, kept separate name to match the spec and make call sites read naturally (in practice both signals hold the same string; alternatively keep just one. Per the spec, keep both as separate signals).
- Add `@ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;`.
- Add a `canSend` computed: returns `true` when `(promptValue() || selectedImageBase64())` and not loading and not historyLoading. (Replace the `chatForm.invalid` check in the template with `canSend()`.)
- Form change: drop `Validators.required` and `Validators.minLength(1)` from `prompt` (set to `[]`). Keep the control, just remove the validators. This way an empty string is a valid form value when an image is attached.
- Methods:
  - `openFilePicker(): void` — `this.fileInput?.nativeElement.click();`
  - `onFileSelected(event: Event): void` — read the first `File` from `event.target`, validate `type.startsWith('image/')`, call `processFile(file)`, then reset the input's value so the same file can be reselected.
  - `onDragOver(event: DragEvent): void` — `event.preventDefault();` and set `isDragging.set(true)`. If `event.dataTransfer`, set `event.dataTransfer.dropEffect = 'copy'`.
  - `onDragLeave(event: DragEvent): void` — set `isDragging.set(false)`. (For the inner-element-leave case, the overlay being a sibling rather than a child avoids the spurious leave event when moving over child nodes.)
  - `onDrop(event: DragEvent): void` — `event.preventDefault();` set `isDragging.set(false)`. Get the first file from `event.dataTransfer?.files`. If it is an image, call `processFile(file)`.
  - `processFile(file: File): void` — uses `FileReader.readAsDataURL`; on load, sets `selectedImageBase64` and `selectedImagePreview` to `reader.result as string`. If the file is >10 MB, surface an `actionError.set(...)` instead.
  - `clearSelectedImage(): void` — sets both signals to `null` and resets the file input.
- `sendMessage()`: change the early-exit conditions — instead of `chatForm.invalid` and `!promptValue`, use a new check: if no prompt text AND no selected image, return. The function still trims the prompt, then captures `selectedImageBase64()` into a local before resetting signals. On a successful send, clear `selectedImageBase64` and `selectedImagePreview` (and reset the file input).
- In `sendPromptToSession`, pass `image` to `chatService.sendMessageStream(...)` and also set `imagePreview` on the optimistic `userMsg`.
- The action-error string for image-too-large: `'התמונה גדולה מדי (מקסימום 10MB). נסה קובץ קטן יותר.'`. This is Hebrew to match the rest of the chat.

#### 2.4 Chat template — overlay, upload button, preview thumbnail

File: `frontend/src/app/features/chat/chat/chat/chat.html`

- On `.chat-root-container` add the drag/drop event bindings: `(dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)"`.
- Inside `.chat-root-container` add a sibling drop overlay that only renders when `isDragging()`:
  ```
  @if (isDragging()) {
    <div class="chat-drop-overlay" aria-hidden="true">
      <span class="ph ph-cloud-arrow-up xl"></span>
      <p>שחרר את התמונה כאן</p>
    </div>
  }
  ```
- Inside `.chat-prompt-actions`, before the model `<p-select>`, add the upload button + hidden file input:
  ```
  <input #fileInput type="file" accept="image/*" class="chat-file-input" (change)="onFileSelected($event)" />
  <button type="button" class="transparent-btn icon-only sm chat-upload-btn" aria-label="Attach image" (click)="openFilePicker()">
    <i class="ph ph-image"></i>
  </button>
  ```
- Just above the `<textarea>` in `.chat-prompt-field`, render the preview thumbnail when `selectedImagePreview()` is set:
  ```
  @if (selectedImagePreview(); as preview) {
    <div class="chat-image-preview">
      <img [src]="preview" alt="תצוגה מקדימה של תמונה מצורפת" />
      <button type="button" class="transparent-btn icon-only xs chat-image-preview-close" aria-label="Remove image" (click)="clearSelectedImage()">
        <i class="ph ph-x"></i>
      </button>
    </div>
  }
  ```
- Change the send-button `[disabled]` from `!loading() && (chatForm.invalid || historyLoading())` to `!loading() && (!canSend() || historyLoading())`.

#### 2.5 Chat CSS — overlay + preview thumbnail

File: `frontend/src/app/features/chat/chat/chat/chat.css`

- All rules nested under `:host` (per project rule). Follow the `.chat-root-container` nesting pattern.
- `.chat-drop-overlay`:
  - `position: absolute; inset: 0;` covering the root container.
  - `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3);`
  - `background: color-mix(in srgb, var(--glass-bg) 80%, transparent);` (theme-aware; works in dark and light).
  - `border: 2px dashed var(--color-primary); border-radius: var(--radius-lg);`
  - `backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur));`
  - `color: var(--color-primary); font-size: var(--font-size-md); font-weight: var(--font-weight-medium);`
  - `z-index: 5;` and `pointer-events: none;` so the drop event still hits the root container.
  - The `span.ph` icon: `font-size: var(--font-size-huge); color: var(--color-primary); filter: drop-shadow(0 0 12px var(--color-primary-glow));`
  - For the root container to support absolute positioning of the overlay, add `position: relative;` to `.chat-root-container` (currently it's just `display: flex; flex-direction: column; height: 100%; overflow: hidden;`).
- `.chat-file-input`: `display: none;` (one-liner; the project rule says "use the existing global classes first" — there is no global class for hidden inputs, so a small component rule is fine).
- `.chat-upload-btn`:
  - `color: var(--color-text-secondary);`
  - `&:hover { color: var(--color-primary); }`
- `.chat-image-preview`:
  - `position: relative; display: inline-flex; align-self: flex-start;`
  - `border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface);`
  - `padding: var(--space-1);` (so the close button can sit on top of the image edge).
  - `max-width: 180px;`
  - `img { max-width: 100%; max-height: 140px; display: block; border-radius: var(--radius-sm); }`
  - `.chat-image-preview-close`:
    - `position: absolute; top: var(--space-1); inset-inline-end: var(--space-1);`
    - `background: var(--glass-bg); color: var(--color-text-primary);`
    - `border: 1px solid var(--color-border); border-radius: 50%;`
    - With a smooth opacity transition for show/hide (initial opacity 0, opacity 1 when parent hover).
- Add `transition: opacity var(--transition-fast);` on the preview wrapper so adding/removing the thumbnail animates softly.

#### 2.6 Chat-message component — render the in-memory preview

File: `frontend/src/app/features/chat/chat-message/chat-message.html`

- For user messages, add the thumbnail above the message body when `message().imagePreview` is set:
  ```
  @if (isUser() && message().imagePreview) {
    <div class="message-attachment">
      <img [src]="message().imagePreview" alt="תמונה מצורפת" />
    </div>
  }
  ```

File: `frontend/src/app/features/chat/chat-message/chat-message.css`

- Under `.chat-message-row` (which is the existing wrapper) add:
  - `.message-attachment { margin-bottom: var(--space-2); max-width: 240px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--color-border); }`
  - `.message-attachment img { display: block; max-width: 100%; max-height: 200px; }`

#### 2.7 Backend test for the multimodal path

File: a new spec under `backend/src/modules/llm/services/llm-client.service.spec.ts` (if the project has specs) OR a small unit test that verifies `buildUserMessage(prompt, undefined)` returns the string and `buildUserMessage(prompt, base64)` returns the parts array. If a spec file does not already exist in that directory, do not create one in this PR — keep the change to a small, verifiable set. Verification will rely on the manual end-to-end test (see Verification below).

## Files Touched

Backend:

- `backend/src/modules/admin-agent/dto/agent-request.dto.ts` — add `image` field.
- `backend/src/modules/admin-agent/admin-agent.controller.ts` — pass `dto.image` into `queryDatabaseStream`.
- `backend/src/modules/admin-agent/admin-agent.service.ts` — accept `image`; pass to `LlmRequest`; skip title update when prompt is empty.
- `backend/src/modules/llm/types/llm.types.ts` — add `image?` to `LlmRequest`.
- `backend/src/modules/llm/services/llm-client.service.ts` — `buildUserMessage` helper + use in both methods.

Frontend:

- `frontend/src/app/core/services/chat.service.ts` — accept `image`, send in body.
- `frontend/src/app/core/models/chat-message.interface.ts` — add `imagePreview?`.
- `frontend/src/app/features/chat/chat/chat/chat.html` — overlay, file input, upload button, preview, template disable change.
- `frontend/src/app/features/chat/chat/chat/chat.ts` — signals, drag/drop handlers, FileReader helper, sendMessage flow changes, ViewChild for the file input.
- `frontend/src/app/features/chat/chat/chat/chat.css` — overlay, upload button, preview thumbnail styles; `position: relative` on `.chat-root-container`.
- `frontend/src/app/features/chat/chat-message/chat-message.html` — render `imagePreview` thumbnail for user messages.
- `frontend/src/app/features/chat/chat-message/chat-message.css` — small `.message-attachment` style.

## Reuse — No New Abstractions

- Reuse the existing `transparent-btn` + `icon-only` + `sm` button system (already in `_buttons.css`) for the upload button and close button.
- Reuse `var(--glass-bg)`, `var(--glass-border)`, `var(--color-primary)`, `var(--color-primary-glow)`, `var(--radius-md/lg)`, `var(--space-1..6)`, `--transition-*` from `_variables.css`.
- Reuse the existing `OpenAI.Chat.Completions.ChatCompletionContentPart[]` import pattern (already imported in `llm-client.service.ts:41`).
- No new global CSS partial, no new tokens, no new abstraction in the chat service.

## Verification

1. `npm run lint -w backend` and `npx ng lint` (frontend) — both must pass.
2. `npx ng build` — must succeed with no new warnings.
3. `npm run test -w backend` — must pass (existing tests only; no new tests added in v1 per Non-Goals).
4. End-to-end manual test in dev mode (`npm run start:dev -w backend` + `npx ng serve`):
   - Open the chat. Type a message. Confirm Send is enabled.
   - Click the upload button. Select an image. Confirm a thumbnail appears above the textarea and the close button removes it.
   - Type a message, attach an image, click Send. Confirm the LLM (in dev) sees both.
   - Reload the session. Confirm the user bubble shows only the text, no thumbnail.
   - Drag a PNG from the file system onto the chat area. Confirm the overlay appears and the image is attached on drop.
   - Drag a non-image file (e.g., a PDF) onto the chat area. Confirm it is rejected silently (or via `actionError`).
   - Send an image-only message (no text). Confirm Send is enabled and the message goes through.
   - Send a message with an image >10 MB. Confirm `actionError` shows the Hebrew error.

## Known Limitations

- The image is not persisted; reloading the session loses the visual reference.
- Only one image per message. Multi-image arrays would require a backend schema change and were out of scope.
- No client-side image compression. A 10 MB limit is enforced client-side; very large images may still fail at the OpenAI provider.
- The `sendAgain` action on a user message that had an image will re-send only the text (because the original image preview is in memory only). The spec doesn't require re-uploading; this matches what real chat UIs do.
- The "edit" action on a user message will not restore the image — same reason.
- The `LlmMessage` history shape is unchanged. The LLM cannot see images from previous turns (this matches the OpenAI Assistants default and is not a regression).

ההנחיות הבאות מיועדות לסוכן הקוד ומפרטות בצורה ברורה את המהלך להוספת יכולות העלאת תמונה (דרך כפתור וכן Drag & Drop) בצ'אט.

בצע את השינויים בכל הקבצים הבאים במלואם. אין להשתמש ב-Placeholders או בהערות חלקיות. הקוד נכתב במלואו על פי חוקי העיצוב, ללא קיצורים או דילוגים.

---

### Backend Implementation

#### File 1: `backend/src/modules/admin-agent/dto/agent-request.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import type { LlmProvider } from "../../llm/types/llm.types";

const LLM_PROVIDER_OPTIONS: LlmProvider[] = ["openrouter", "nvidia", "ollama"];

export class AgentRequestDto {
  @ApiProperty({
    description: "The user prompt that will be sent to the AI agent.",
    example: "Write a short summary of the following text...",
  })
  @IsString()
  @IsOptional()
  prompt!: string;

  @ApiPropertyOptional({
    description: "The specific chat session ID associated with this message thread.",
    example: 42,
  })
  @IsNumber()
  @IsOptional()
  sessionId?: number;

  @ApiPropertyOptional({
    description: "Optional LLM provider override for this request only.",
    enum: LLM_PROVIDER_OPTIONS,
    example: "openrouter",
  })
  @IsOptional()
  @IsIn(LLM_PROVIDER_OPTIONS)
  provider?: LlmProvider;

  @ApiPropertyOptional({
    description: "Optional LLM model override for this request only.",
    example: "google/gemma-4-31b-it:free",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;

  @ApiPropertyOptional({
    description:
      "Optional Base64 data URL of an image to attach to this turn. Format: data:image/<mime>;base64,<payload>. If present, the user message is sent to the LLM as a multimodal content array containing this image plus the prompt text. If absent, the user message is sent as plain text.",
    example: "data:image/jpeg;base64,/9j/4AAQ...",
  })
  @IsOptional()
  @IsString()
  image?: string;
}
```

---

#### File 2: `backend/src/modules/admin-agent/admin-agent.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Response } from "express";
import { AdminAgentService } from "./admin-agent.service";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RequestWithUser } from "../../core/interfaces/request-with-user.interface";
import { AgentRequestDto } from "./dto/agent-request.dto";
import { SessionResponseDto } from "./dto/session-response.dto";
import { ChatMessageResponseDto } from "./dto/chat-message-response.dto";
import { AgentStreamEventDto } from "./dto/agent-stream-event.dto";
import { GetSessionsQueryDto } from "./dto/get-sessions-query.dto";
import { CustomApiOperationOptions } from "../../core/types/custom-api-operation-options.type";
import { GenUiSpec } from "./constants/gen-ui-spec.constant";

@ApiTags("Admin Agent")
@ApiBearerAuth()
@ApiExtraModels(SessionResponseDto, ChatMessageResponseDto, AgentStreamEventDto)
@Controller("admin-agent")
export class AdminAgentController {
  private readonly logger = new Logger(AdminAgentController.name);

  constructor(private readonly adminAgentService: AdminAgentService) {}

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  @ApiOperation({
    summary: "Get chat sessions for the authenticated user",
    summaryHe: "שולף את סבבי הצ'אט של המשתמש המחובר",
    toolIcon: "ph-chat-centered-text",
    genUiSpec: GenUiSpec.CHAT_SESSIONS_LIST,
    description:
      "Returns recent chat sessions owned by the authenticated user. Sessions from other users are never returned.",
  } as CustomApiOperationOptions)
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Optional maximum number of recent sessions to return.",
  })
  @ApiResponse({
    status: 200,
    description: "Sessions retrieved successfully.",
    type: [SessionResponseDto],
  })
  async getSessions(@Req() req: RequestWithUser, @Query() query: GetSessionsQueryDto) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.getSessions(req.user.sub, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions/:id/messages")
  @ApiOperation({
    summary: "Get session message history",
    summaryHe: "שולף את היסטוריית ההודעות של סבב הצ'אט",
    toolIcon: "ph-chats",
    genUiSpec: GenUiSpec.CHAT_TRANSCRIPT_TIMELINE,
    description:
      "Returns user and assistant messages for a session owned by the authenticated user. " +
      "Internal tool messages are filtered out for normal history display.",
  } as CustomApiOperationOptions)
  @ApiParam({ name: "id", type: Number, description: "Numeric chat session id." })
  @ApiResponse({
    status: 200,
    description: "Historical messages loaded successfully.",
    type: [ChatMessageResponseDto],
  })
  async getSessionMessages(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.getSessionMessages(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("sessions")
  @ApiOperation({
    summary: "Create a new chat session",
    summaryHe: "מייצר סבב שיחת צ'אט חדש",
    toolIcon: "ph-plus-circle",
    genUiSpec: GenUiSpec.CHAT_SESSION_CREATED,
    description: "Creates a new empty chat session owned by the authenticated user.",
  } as CustomApiOperationOptions)
  @ApiResponse({
    status: 201,
    description: "Chat session created successfully.",
    type: SessionResponseDto,
  })
  async createSession(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.adminAgentService.createSession(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete chat session",
    summaryHe: "מוחק לצמיתות את סבב הצ'אט",
    toolIcon: "ph-trash",
    genUiSpec:
      "After this tool succeeds, do not invent response data. Tell the user that the chat session was permanently deleted and mention the requested session id.",
    description:
      "Permanently deletes a session owned by the authenticated user. " +
      "ChatMessage rows are cascade-deleted through the ChatMessage.session relation.",
  } as CustomApiOperationOptions)
  @ApiParam({
    name: "id",
    type: Number,
    description: "Numeric chat session id to delete.",
  })
  @ApiResponse({ status: 204, description: "Chat session deleted successfully." })
  async deleteSession(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.adminAgentService.deleteSession(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:sessionId/messages/:messageId")
  @HttpCode(204)
  @ApiOperation({
    summary: "Delete a chat message and later history",
    summaryHe: "מוחק הודעת צ'אט ואת כל ההודעות שאחריה",
    toolIcon: "ph-trash",
    genUiSpec:
      "After this tool succeeds, do not invent response data. Tell the user that the selected chat message and later session history were permanently deleted.",
    description:
      "Permanently deletes one message owned by the authenticated user and every later message in the same session. " +
      "This preserves conversation consistency by preventing later assistant or tool messages from remaining without their original context.",
  } as CustomApiOperationOptions)
  @ApiParam({
    name: "sessionId",
    type: Number,
    description: "Numeric chat session id that owns the message.",
  })
  @ApiParam({
    name: "messageId",
    type: Number,
    description: "Numeric chat message id to delete from.",
  })
  @ApiResponse({
    status: 204,
    description: "Chat message and later session history deleted successfully.",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @ApiForbiddenResponse({
    description: "The session or message does not belong to the authenticated user.",
  })
  async deleteSessionMessage(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Param("messageId", ParseIntPipe) messageId: number,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.adminAgentService.deleteSessionMessage(sessionId, messageId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("query-stream")
  @ApiConsumes("application/json", "multipart/form-data")
  @ApiOperation({
    summary: "Query Admin Agent as a streamed response",
    summaryHe: "שולח שאילתה לסוכן הניהול ומחזיר תגובת סטרימינג",
    toolIcon: "ph-robot",
    description:
      "Streams newline-delimited JSON objects over a text/event-stream response. " +
      'Each line is an AgentStreamEventDto. Token events use { "type": "token", "content": "..." }. ' +
      'Step events use { "type": "step", "icon": "...", "message": "..." }. ' +
      "The stream is complete when the HTTP response ends.",
  } as CustomApiOperationOptions)
  @ApiBody({
    type: AgentRequestDto,
    description:
      "Agent prompt payload with optional chat session, image, and per-request LLM model override.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Stream opened. Response body contains newline-delimited AgentStreamEventDto JSON objects.",
    type: AgentStreamEventDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  async streamChat(
    @Body() dto: AgentRequestDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log("--- Incoming Stream Request ---");

    if (!req.user) {
      throw new UnauthorizedException("User not authenticated");
    }

    const userId = req.user.sub;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const stream = this.adminAgentService.queryDatabaseStream(
        dto.prompt,
        userId,
        dto.sessionId,
        dto.provider,
        dto.model,
        dto.image,
      );

      for await (const token of stream) {
        res.write(token);
      }
    } catch (error: any) {
      this.logger.error(`Error during stream controller: ${error.message}`, error.stack);

      if (!res.closed) {
        res.write("\n\n[שגיאת מערכת: תקשורת הסטרים נותקה במפתיע. נא לנסות שוב.]\n\n");
      }
    } finally {
      if (!res.closed) {
        res.end();
      }
    }
  }
}
```

---

#### File 3: `backend/src/modules/admin-agent/admin-agent.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { AgentSessionService } from "./services/agent-session.service";
import { AgentToolExecutorService } from "./services/agent-tool-executor.service";
import { ChatSession } from "./entities/chat-session.entity";
import { ChatMessage } from "./entities/chat-message.entity";
import { SYSTEM_CONTEXT } from "./constants/system-context.constant";
import { SwaggerToolsParser } from "./services/swagger-tools.parser";
import type { LlmProvider, LlmToolCall } from "../llm/types/llm.types";

const MAX_ITERATIONS = 10;
const PARALLEL_UNSAFE_TOOL_NAMES = new Set([
  "LlmController_testLlm",
  "LlmController_testAll",
]);
const STEP_ICONS = {
  tool: "ph-gear",
  error: "ph-warning-circle",
  success: "ph-check-circle",
} as const;

type ToolCallResult = {
  call: LlmToolCall;
  resultData: string;
};

@Injectable()
export class AdminAgentService implements OnModuleInit {
  private readonly logger = new Logger(AdminAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly swaggerToolsParser: SwaggerToolsParser,
    private readonly agentSessionService: AgentSessionService,
    private readonly agentToolExecutorService: AgentToolExecutorService,
  ) {}

  onModuleInit(): void {
    this.logger.log("AdminAgentService initialized. Orchestrator ready.");
    setTimeout(() => {
      this.printParsedSwaggerTools();
    }, 1000);
  }

  private printParsedSwaggerTools(): void {
    try {
      const tools = this.swaggerToolsParser.getTools();
      this.logger.log(
        `--- START SWAGGER-TOOLS-PARSER OUTPUT: LOADED ${tools.length} TOOLS ---`,
      );

      const fnWidth = Math.max(
        ...tools.map((fn) => {
          return fn.function?.name.length || 0;
        }),
      );

      tools.forEach((tool) => {
        const functionName = tool.function?.name;
        if (functionName) {
          const endpoint = this.swaggerToolsParser.getEndpoint(functionName);
          const uiSpecTag = endpoint?.genUiSpec ? "HTML|" : "|".padStart(5);
          const methodStr = endpoint?.method.toUpperCase();
          this.logger.log(
            `Tool Name: "${functionName.padEnd(fnWidth)}" |${uiSpecTag} ${endpoint?.path}, ${methodStr}`,
          );
        }
      });

      this.logger.log("--- END OF PARSED SWAGGER TOOLS OUTPUT ---");
    } catch (error: any) {
      this.logger.error(
        `Failed to execute swagger tools parser logging: ${error.message}`,
      );
    }
  }

  async getSessions(userId: number, limit?: number): Promise<ChatSession[]> {
    return this.agentSessionService.getSessions(userId, limit);
  }

  async getSessionMessages(sessionId: number, userId: number): Promise<ChatMessage[]> {
    return this.agentSessionService.getSessionMessages(sessionId, userId);
  }

  async createSession(userId: number): Promise<ChatSession> {
    return this.agentSessionService.createSession(userId);
  }

  async deleteSession(sessionId: number, userId: number): Promise<void> {
    return this.agentSessionService.deleteSession(sessionId, userId);
  }

  async deleteSessionMessage(
    sessionId: number,
    messageId: number,
    userId: number,
  ): Promise<void> {
    return this.agentSessionService.deleteSessionMessage(sessionId, messageId, userId);
  }

  async queryDatabase(
    prompt: string,
    userId: number,
    requestedSessionId?: number,
    provider?: LlmProvider,
    model?: string,
    image?: string,
  ): Promise<string> {
    const session = await this.agentSessionService.getOrCreateSession(
      userId,
      requestedSessionId,
    );
    await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    await this.agentSessionService.saveMessage(userId, session.id, "user", prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
        providerOverride: provider,
        modelOverride: model,
        image,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          "assistant",
          JSON.stringify(llmResponse.toolCalls),
          "YES_TOOL_CALLS",
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          const results = await this.executeToolCallGroup(group, userId);

          for (const { call, resultData } of results) {
            await this.agentSessionService.saveMessage(
              userId,
              session.id,
              "tool",
              resultData,
              call.id,
            );
          }
        }
      } else {
        const assistantContent = llmResponse.content || "";
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          "assistant",
          assistantContent,
        );
        return assistantContent;
      }
    }

    return "תקשורת הסוכן הופסקה עקב הגעה למספר האיטרציות המרבי.";
  }

  async *queryDatabaseStream(
    prompt: string,
    userId: number,
    requestedSessionId?: number,
    provider?: LlmProvider,
    model?: string,
    image?: string,
  ): AsyncIterable<string> {
    const session = await this.agentSessionService.getOrCreateSession(
      userId,
      requestedSessionId,
    );

    if (prompt && prompt.trim().length > 0) {
      await this.agentSessionService.updateSessionTitleIfDefault(session, prompt);
    }
    await this.agentSessionService.saveMessage(userId, session.id, "user", prompt);

    const tools = this.swaggerToolsParser.getTools();
    const dynamicSystemContext = this.getDynamicSystemContext(userId, provider, model);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration = iteration + 1) {
      const history = await this.agentSessionService.loadHistory(session.id, userId);

      const llmResponse = await this.llmService.generateResponse({
        prompt,
        systemContext: dynamicSystemContext,
        messageHistory: history,
        tools,
        providerOverride: provider,
        modelOverride: model,
        image,
      });

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        await this.agentSessionService.saveMessage(
          userId,
          session.id,
          "assistant",
          JSON.stringify(llmResponse.toolCalls),
          "YES_TOOL_CALLS",
        );

        const groups = this.groupToolCallsForExecution(llmResponse.toolCalls);

        for (const group of groups) {
          for (const call of group) {
            const args = this.parseToolArguments(call);
            const description =
              this.agentToolExecutorService.getSemanticActionDescription(
                call.function.name,
                args,
              );
            const endpoint = this.swaggerToolsParser.getEndpoint(call.function.name);
            const toolIcon = endpoint?.toolIcon || STEP_ICONS.tool;

            yield JSON.stringify({
              type: "step",
              icon: toolIcon,
              message: `${description}...`,
            }) + "\n";
          }

          const results = await this.executeToolCallGroup(group, userId);

          for (const { call, resultData } of results) {
            if (resultData.includes("error")) {
              yield JSON.stringify({
                type: "step",
                icon: STEP_ICONS.error,
                message: "ביצוע השלב נכשל עקב מגבלות אבטחה או שגיאת שרת.",
              }) + "\n";
            } else {
              yield JSON.stringify({
                type: "step",
                icon: STEP_ICONS.success,
                message: "השלב בוצע בהצלחה!",
              }) + "\n";
            }

            await this.agentSessionService.saveMessage(
              userId,
              session.id,
              "tool",
              resultData,
              call.id,
            );
          }
        }
      } else {
        let accumulatedResponse = "";
        try {
          const stream = this.llmService.generateStream({
            prompt,
            systemContext: dynamicSystemContext,
            messageHistory: history,
            tools,
            providerOverride: provider,
            modelOverride: model,
            image,
          });

          for await (const chunk of stream) {
            accumulatedResponse += chunk;
            yield JSON.stringify({ type: "token", content: chunk }) + "\n";
          }
        } catch (error) {
          this.logger.error("Failed to stream response from LLM Service", error);
          throw error;
        }

        if (accumulatedResponse.length > 0) {
          await this.agentSessionService.saveMessage(
            userId,
            session.id,
            "assistant",
            accumulatedResponse,
          );
        }
        return;
      }
    }

    yield JSON.stringify({
      type: "token",
      content: "תקשורת הסוכן הופסקה עקב הגעה למספר האיטרציות המרבי.",
    }) + "\n";
  }

  private getDynamicSystemContext(
    userId: number,
    provider?: LlmProvider,
    model?: string,
  ): string {
    const runtimeSelection = this.llmService.getRuntimeSelection(provider, model);

    return SYSTEM_CONTEXT.replace(/{{CURRENT_USER_ID}}/g, String(userId))
      .replace(
        /{{CURRENT_TIME}}/g,
        new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
      )
      .replace(/{{CURRENT_LLM_PROVIDER}}/g, runtimeSelection.provider)
      .replace(/{{CURRENT_LLM_MODEL}}/g, runtimeSelection.model);
  }

  private isParallelSafeTool(functionName: string): boolean {
    if (PARALLEL_UNSAFE_TOOL_NAMES.has(functionName)) {
      return false;
    }

    const endpoint = this.swaggerToolsParser.getEndpoint(functionName);

    return endpoint?.method.toUpperCase() === "GET";
  }

  private groupToolCallsForExecution(toolCalls: LlmToolCall[]): LlmToolCall[][] {
    const groups: LlmToolCall[][] = [];
    let currentSafeGroup: LlmToolCall[] = [];

    for (const call of toolCalls) {
      if (this.isParallelSafeTool(call.function.name)) {
        currentSafeGroup.push(call);
        continue;
      }

      if (currentSafeGroup.length > 0) {
        groups.push(currentSafeGroup);
        currentSafeGroup = [];
      }

      groups.push([call]);
    }

    if (currentSafeGroup.length > 0) {
      groups.push(currentSafeGroup);
    }

    return groups;
  }

  private async executeToolCallGroup(
    calls: LlmToolCall[],
    userId: number,
  ): Promise<ToolCallResult[]> {
    if (calls.length === 1) {
      return [await this.executeToolCallSafely(calls[0], userId)];
    }

    this.logger.log(`Executing ${calls.length} read-only tools in parallel.`);

    return Promise.all(
      calls.map((call) => {
        return this.executeToolCallSafely(call, userId);
      }),
    );
  }

  private async executeToolCallSafely(
    call: LlmToolCall,
    userId: number,
  ): Promise<ToolCallResult> {
    try {
      const resultData = await this.agentToolExecutorService.executeToolCall(
        call,
        userId,
      );

      return { call, resultData };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown tool execution error";

      this.logger.error(`Tool execution failed in ${call.function.name}: ${message}`);

      return {
        call,
        resultData: JSON.stringify({
          error: true,
          message: "Tool execution failed",
          toolName: call.function.name,
          details: message,
        }),
      };
    }
  }

  private parseToolArguments(call: LlmToolCall): Record<string, unknown> {
    try {
      return JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
```

---

#### File 4: `backend/src/modules/llm/types/llm.types.ts`

```typescript
export type LlmProvider = "openrouter" | "nvidia" | "ollama" | "ollama-cloud";

export type LlmToolSchema = {
  type: "function";
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmResponse = {
  content: string | null;
  toolCalls?: LlmToolCall[];
};

export type LlmMessage =
  | {
      role: "user";
      content: string | OpenAI.Chat.Completions.ChatCompletionContentPart[];
    }
  | { role: "assistant"; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface LlmRequest {
  prompt: string;
  systemContext?: string;
  tools?: LlmToolSchema[];
  messageHistory?: LlmMessage[];
  providerOverride?: LlmProvider;
  modelOverride?: string;
  /** Optional Base64 data URL image attached to the user turn */
  image?: string;
}

export type LlmRuntimeSelection = {
  provider: LlmProvider;
  model: string;
};

export type LlmModelCheckTarget = {
  provider: LlmProvider;
  name: string;
  active: boolean;
  sizeGb?: number;
  family?: string;
};

export type LlmModelTestResult = {
  name: string;
  provider: LlmProvider;
  available: boolean;
};

export type LlmProviderConfig = {
  id: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};
```

---

#### File 5: `backend/src/modules/llm/services/llm-client.service.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { LlmRequest, LlmResponse, LlmToolCall } from "../types/llm.types";
import { LlmProviderConfigService } from "./llm-provider-config.service";
import { LlmProviderService } from "../../llm-provider/llm-provider.service";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    private readonly providerConfig: LlmProviderConfigService,
    private readonly dbProviderService: LlmProviderService,
  ) {}

  async generateResponse(llmRequest: LlmRequest): Promise<LlmResponse> {
    const {
      prompt,
      systemContext,
      messageHistory,
      providerOverride,
      modelOverride,
      tools,
      image,
    } = llmRequest;

    const client = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error("Missing active model configuration");
    }

    this.logger.log(`Generating response via ${activeProvider} (model: ${activeModel})`);

    const completion = await this.withRetry(async () => {
      const result = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: "system", content: systemContext || "You are a helpful assistant." },
          ...(messageHistory?.length ? messageHistory : []),
          { role: "user", content: this.buildUserMessage(prompt, image) as any },
        ],
        tools:
          tools && tools.length > 0
            ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[])
            : undefined,
        temperature: 0.2,
      });

      const firstChoice = result?.choices?.[0];
      if (!firstChoice?.message) {
        throw new Error("Returned no choices from AI model");
      }

      return result;
    }, "generateResponse");

    const message = completion.choices[0].message;
    const content = typeof message?.content === "string" ? message.content : null;
    const toolCalls = (message.tool_calls || []) as LlmToolCall[];

    this.logger.log(
      `Response OK: content=${content?.length ?? 0} chars, toolCalls=${toolCalls.length}`,
    );
    return { content, toolCalls };
  }

  async *generateStream(llmRequest: LlmRequest): AsyncIterable<string> {
    const {
      prompt,
      systemContext,
      messageHistory,
      providerOverride,
      modelOverride,
      tools,
      image,
    } = llmRequest;

    const client = await this.getClient(providerOverride);
    const activeProvider = providerOverride || this.providerConfig.getActiveProvider();
    const activeModel = modelOverride || this.providerConfig.getActiveModel();

    if (!activeModel) {
      throw new Error("Missing active model configuration");
    }

    this.logger.log(`Streaming response via ${activeProvider} (model: ${activeModel})`);

    try {
      const stream = await this.withRetry(() => {
        return client.chat.completions.create({
          model: activeModel,
          stream: true,
          messages: [
            { role: "system", content: systemContext || "You are a helpful assistant." },
            ...(messageHistory?.length ? messageHistory : []),
            { role: "user", content: this.buildUserMessage(prompt, image) as any },
          ],
          tools:
            tools && tools.length > 0
              ? (tools as OpenAI.Chat.Completions.ChatCompletionTool[])
              : undefined,
          temperature: 0.7,
        });
      }, "generateStream");

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          yield token;
        }
      }
    } catch (error: unknown) {
      this.logger.error(`Stream Error (after retries): ${this.getErrorMessage(error)}`);
      yield `[AI connection error: ${this.getErrorMessage(error)}]`;
    }
  }

  private buildUserMessage(
    prompt: string,
    image?: string,
  ): OpenAI.Chat.Completions.ChatCompletionContentPart[] | string {
    if (!image) {
      return prompt;
    }

    return [
      { type: "text", text: prompt || "" },
      {
        type: "image_url",
        image_url: {
          url: image,
        },
      },
    ] as OpenAI.Chat.Completions.ChatCompletionContentPart[];
  }

  private async getClient(providerOverride?: string): Promise<OpenAI> {
    const providerKey = providerOverride || this.providerConfig.getActiveProvider();

    const dbProvider = await this.dbProviderService.findProviderByKey(providerKey);

    if (!dbProvider) {
      throw new Error(
        `LLM Provider with key '${providerKey}' was not found in the database.`,
      );
    }

    this.logger.log(
      `Initializing OpenAI client for ${dbProvider.label} using DB credentials.`,
    );

    return new OpenAI({
      baseURL: dbProvider.baseUrl,
      apiKey: dbProvider.apiKey ? dbProvider.apiKey.trim() : undefined,
      defaultHeaders: this.providerConfig.getDefaultHeaders(dbProvider.key as any),
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt = attempt + 1) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const errorLike = error as { status?: number; message?: string };
        const isRetryable =
          errorLike.status === 429 ||
          errorLike.status === 503 ||
          errorLike.status === 502 ||
          errorLike.message?.includes("no choices") ||
          errorLike.message?.includes("rate limit") ||
          errorLike.message?.includes("overloaded");

        if (!isRetryable || attempt === MAX_RETRIES) {
          break;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[${label}] attempt ${attempt}/${MAX_RETRIES} failed - retrying in ${delay}ms. Error: ${this.getErrorMessage(error)}`,
        );
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }

    throw lastError;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown error";
  }
}
```

---

### Frontend Implementation

#### File 6: `frontend/src/app/core/services/chat.service.ts`

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { IChatSession } from "../models/chat-session.interface";
import {
  IChatMessage,
  ChatModelSelection,
  ChatStreamEvent,
} from "../models/chat-message.interface";

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin-agent`;

  listSessions(limit?: number): Observable<IChatSession[]> {
    const url = limit ? `${this.base}/sessions?limit=${limit}` : `${this.base}/sessions`;
    return this.http.get<IChatSession[]>(url);
  }

  getSessionMessages(sessionId: number): Observable<IChatMessage[]> {
    return this.http.get<IChatMessage[]>(`${this.base}/sessions/${sessionId}/messages`);
  }

  createSession(): Observable<IChatSession> {
    return this.http.post<IChatSession>(`${this.base}/sessions`, {});
  }

  deleteSession(sessionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${sessionId}`);
  }

  deleteMessage(sessionId: number, messageId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/sessions/${sessionId}/messages/${messageId}`,
    );
  }

  sendMessageStream(
    prompt: string,
    sessionId?: number,
    modelSelection?: ChatModelSelection,
    image?: string,
  ): Observable<ChatStreamEvent> {
    return new Observable((observer) => {
      const controller = new AbortController();
      let buffer = "";

      fetch(`${this.base}/query-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, sessionId, image, ...modelSelection }),
        credentials: "include",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            observer.error(
              new Error(`Failed to initialize stream: ${response.statusText}`),
            );
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");

          if (!reader) {
            observer.error(new Error("Response body reader is not available"));
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");

              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  try {
                    const parsed = JSON.parse(trimmed);
                    observer.next(parsed);
                  } catch (err) {
                    console.warn(
                      "Failed to parse line-JSON streaming chunk:",
                      trimmed,
                      err,
                    );
                  }
                }
              }
            }

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                observer.next(parsed);
              } catch (err) {
                console.warn(
                  "Failed to parse trailing-JSON streaming chunk:",
                  buffer,
                  err,
                );
              }
            }

            observer.complete();
          } catch (err) {
            observer.error(err);
          }
        })
        .catch((err) => {
          observer.error(err);
        });

      return () => {
        controller.abort();
      };
    });
  }
}
```

---

#### File 7: `frontend/src/app/core/models/chat-message.interface.ts`

```typescript
export interface IChatStep {
  icon: string;
  message: string;
}

export interface IChatMessage {
  id?: number;
  sessionId?: number;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt?: Date;
  steps?: IChatStep[];
  /** Optional in-memory data URL of the image attached to this user turn. */
  imagePreview?: string;
}

export type ChatStreamEvent =
  | ({ type: "step" } & IChatStep)
  | { type: "token"; content?: string };

export interface ChatModelSelection {
  provider: string;
  model: string;
}
```

---

#### File 8: `frontend/src/app/features/chat/chat-message/chat-message.html`

```html
<div
  class="chat-message-row"
  [ngClass]="{
        'user-message': isUser(),
        'assistant-message': isAssistant(),
        'typing-active': showCursor(),
        'bubble-enter': isActiveStream(),
    }"
>
  @if (isThinkingVisible()) {
  <details class="thinking-process-box">
    <summary class="thinking-summary">
      <span
        class="ph ph-binoculars summary-icon"
        [class.thinking]="rowState() === 'thinking'"
      ></span>
      <span class="summary-label">עובד על זה...</span>
      <span class="ph ph-caret-down expand-icon"></span>
    </summary>
    <ul class="steps-list" [autoScrollBottom]="true">
      @for (step of displaySteps(); track $index) {
      <li class="step-item">
        <span class="xs ph {{ step.icon }}"></span>
        <span class="step-text">{{ step.message }}</span>
        @if (step.statusIcon) {
        <span class="ph {{ step.statusIcon }} step-status-icon"></span>
        }
      </li>
      }
    </ul>
  </details>
  } @if (showPreparingLoader()) {
  <div class="response-loader" aria-label="טוען תגובה">
    <span></span>
    <span></span>
    <span></span>
  </div>
  } @if (isUser() && message().imagePreview) {
  <div class="message-attachment">
    <img [src]="message().imagePreview!" alt="תמונה מצורפת" />
  </div>
  }

  <div class="message-body" [aiFormat]="contentForDisplay()"></div>

  <div class="message-actions" aria-label="Message actions">
    <button
      type="button"
      class="message-action-btn"
      [disabled]="!canDelete()"
      aria-label="Delete message"
      (click)="requestAction('delete')"
    >
      <span class="ph ph-trash"></span>
    </button>
    <button
      type="button"
      class="message-action-btn"
      [disabled]="!canSendAgain()"
      aria-label="Send again"
      (click)="requestAction('sendAgain')"
    >
      <span class="ph ph-arrow-clockwise"></span>
    </button>
    <button
      type="button"
      class="message-action-btn"
      aria-label="Copy message"
      (click)="requestAction('copy')"
    >
      <span class="ph" [class.ph-copy]="!copied()" [class.ph-check]="copied()"></span>
    </button>
    @if (isUser()) {
    <button
      type="button"
      class="message-action-btn"
      [disabled]="!canEdit()"
      aria-label="Edit message"
      (click)="requestAction('edit')"
    >
      <span class="ph ph-pencil-simple"></span>
    </button>
    }
  </div>
</div>
```

---

#### File 9: `frontend/src/app/features/chat/chat-message/chat-message.css`

```css
:host {
  display: contents;
}

.chat-message-row {
  display: flex;
  flex-direction: column;
  position: relative;
  max-width: 95%;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  line-height: 1.6;

  &.bubble-enter {
    animation: slideUp var(--transition-slow) ease-out both;
  }

  &.user-message {
    align-self: flex-start;
    width: fit-content;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    text-align: right;
    border-radius: var(--radius-md) var(--radius-md) 0 var(--radius-md);
  }

  &.assistant-message {
    align-self: center;
    width: 90%;
    min-width: 0;
    text-align: right;
  }

  &.typing-active {
    .message-body {
      &::after {
        content: "";
        display: inline-block;
        width: 2px;
        height: 1.05em;
        margin-inline-start: var(--space-1);
        background: var(--color-primary);
        border-radius: var(--radius-sm);
        vertical-align: -0.15em;
        animation: cursorBlink 1s step-end infinite;
      }
    }
  }

  .message-actions {
    display: flex;
    align-items: center;
    align-self: flex-end;
    gap: var(--space-1);
    margin-block-start: var(--space-2);
    opacity: 0;
    transition: opacity var(--transition-fast);

    .message-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--space-6);
      height: var(--space-6);
      padding: 0;
      color: var(--color-text-secondary);
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition:
        var(--transition-colors),
        opacity var(--transition-fast);

      &:hover:not(:disabled),
      &:focus-visible:not(:disabled) {
        color: var(--color-primary);
        background: var(--primary-30);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }

  &:hover,
  &:focus-within {
    .message-actions {
      opacity: 1;
    }
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);

    .role-icon {
      font-size: var(--font-size-xxl);
    }
  }

  .message-body {
    font-size: var(--font-size-sm);
    font-weight: 300;
    color: var(--color-text-secondary);

    ::ng-deep .ai-bold {
      font-weight: 600;
    }
  }

  .message-attachment {
    margin-bottom: var(--space-2);
    max-width: 240px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-border);

    img {
      display: block;
      max-width: 100%;
      max-height: 200px;
    }
  }

  .response-loader {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    width: fit-content;
    padding: var(--space-2) 0;

    span {
      width: var(--space-2);
      height: var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--color-primary);
      animation: responseLoaderPulse 900ms ease-in-out infinite;

      &:nth-child(2) {
        animation-delay: 150ms;
      }

      &:nth-child(3) {
        animation-delay: 300ms;
      }
    }
  }

  .thinking-process-box {
    margin: var(--space-2) 0 var(--space-4) 0;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    overflow: hidden;
    font-size: var(--font-size-sm);
    max-height: calc(var(--space-16) * 4);
    max-width: max-content;
    opacity: 1;
    transition:
      background var(--transition-standard),
      border-color var(--transition-standard),
      max-height var(--transition-slow),
      max-width var(--transition-slow),
      opacity var(--transition-slow),
      margin var(--transition-slow);
    text-align: right;

    &[open] {
      background: rgba(0, 212, 255, 0.02);
      border-color: var(--color-primary-glow);

      .expand-icon {
        transform: rotate(180deg);
      }
    }

    .thinking-summary {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      font-weight: var(--font-weight-medium);
      color: var(--color-primary);
      cursor: pointer;
      outline: none;
      user-select: none;
      list-style: none;

      .summary-icon {
        font-size: var(--font-size-md);

        &.thinking {
          animation: pulse 2s infinite;
        }
      }

      .summary-label {
        display: inline;
      }

      .expand-icon {
        margin-inline-start: auto;
        font-size: var(--font-size-sm);
        transform: rotate(0);
        transition: transform var(--transition-fast);
      }
    }

    .steps-list {
      list-style: none;
      padding: var(--space-3) var(--space-4) var(--space-3) var(--space-4);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-height: calc(var(--space-16) * 3);
      overflow-y: auto;
      border-top: 1px dashed var(--color-border);
      font-size: 11px;

      .step-status-icon {
        margin-inline-start: auto;
      }

      .step-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--color-text-secondary);
        opacity: 1;
        animation: slideUp var(--transition-slow) ease-out forwards;

        .ph {
          color: var(--color-primary);
        }

        &:nth-child(2) {
          animation-delay: 150ms;
        }

        &:nth-child(3) {
          animation-delay: 300ms;
        }

        &:nth-child(4) {
          animation-delay: 450ms;
        }

        &:nth-child(5) {
          animation-delay: 600ms;
        }

        &:nth-child(6) {
          animation-delay: 750ms;
        }

        &:nth-child(7) {
          animation-delay: 900ms;
        }

        &:nth-child(8) {
          animation-delay: 1050ms;
        }

        &:nth-child(9) {
          animation-delay: 1200ms;
        }

        &:nth-child(n + 10) {
          animation-delay: 1350ms;
        }
      }
    }
  }
}

@keyframes cursorBlink {
  50% {
    opacity: 0;
  }
}

@keyframes responseLoaderPulse {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(calc(var(--space-1) * -1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-message-row {
    &.bubble-enter {
      animation: none;
    }

    &.typing-active {
      .message-body {
        &::after {
          animation: none;
        }
      }
    }

    .thinking-process-box {
      .steps-list {
        .step-item {
          animation: none;
          opacity: 1;
        }
      }
    }

    .response-loader {
      span {
        animation: none;
      }
    }
  }
}

@media (hover: none) {
  .chat-message-row {
    .message-actions {
      opacity: 1;
    }
  }
}
```

---

#### File 10: `frontend/src/app/features/chat/chat/chat/chat.html`

```html
<div
  class="page-content chat-root-container"
  (dragover)="onDragOver($event)"
  (dragleave)="onDragLeave($event)"
  (drop)="onDrop($event)"
>
  @if (isDragging()) {
  <div class="chat-drop-overlay" aria-hidden="true">
    <span class="ph ph-cloud-arrow-up xl"></span>
    <p>שחרר את התמונה כאן</p>
  </div>
  } @if (historyLoading()) {
  <div class="chat-history-loader">
    <span class="custom-loader"></span>
    <p>טוען את היסטוריית השיחה...</p>
  </div>
  } @else {
  <div
    class="chat-history"
    [autoScrollBottom]="true"
    [autoScrollBottomTrigger]="messages().length"
  >
    @for (msg of messages(); track $index) { @if (msg.role !== 'tool') {
    <app-chat-message
      [message]="msg"
      [streamState]="getStreamState($index, msg)"
      [actionsDisabled]="loading() || deletingMessageId() === msg.id"
      (actionRequested)="handleMessageAction($event)"
    />
    } } @if (messages().length === 0) {
    <div class="empty-chat-state">
      <span class="ph ph-chat-circle-text xl"></span>
      <h3 class="">
        שלום {{ currentUserProfile()?.fullName || authStore.user()?.email }}!
      </h3>
      <p>כתוב הודעה למטה כדי להתחיל להתייעץ עם סוכן ה-AI שלך.</p>
    </div>
    }
  </div>
  }

  <div class="chat-input-area">
    @if (actionError()) {
    <div class="chat-action-error" role="alert">{{ actionError() }}</div>
    }
    <form [formGroup]="chatForm" (ngSubmit)="sendMessage()">
      <div class="chat-prompt-field">
        @if (selectedImagePreview(); as preview) {
        <div class="chat-image-preview">
          <img [src]="preview" alt="תצוגה מקדימה של תמונה מצורפת" />
          <button
            type="button"
            class="transparent-btn icon-only xs chat-image-preview-close"
            aria-label="Remove image"
            (click)="clearSelectedImage()"
          >
            <i class="ph ph-x"></i>
          </button>
        </div>
        }

        <textarea
          #promptTextarea
          formControlName="prompt"
          placeholder="הקלד את הודעתך כאן..."
          rows="3"
          autocomplete="off"
          (keydown)="onPromptKeydown($event)"
        ></textarea>
        <div class="chat-prompt-actions">
          <div class="chat-attach-group">
            <input
              #fileInput
              type="file"
              accept="image/*"
              class="chat-file-input"
              (change)="onFileSelected($event)"
            />
            <button
              type="button"
              class="transparent-btn icon-only sm chat-upload-btn"
              aria-label="Attach image"
              (click)="openFilePicker()"
            >
              <i class="ph ph-image"></i>
            </button>
          </div>

          <p-select
            [options]="models()"
            formControlName="model"
            [group]="true"
            optionGroupLabel="label"
            optionLabel="label"
            optionValue="id"
            placeholder="בחר מודל"
            class="custom-select"
          >
            <ng-template let-group #group>
              <span>{{ group.label }}</span>
            </ng-template>

            <ng-template let-model #item>
              <div class="select-option">{{ model.label }}</div>
            </ng-template>
          </p-select>

          <button
            [type]="loading() ? 'button' : 'submit'"
            class="chat-send-btn"
            [class.stop]="loading()"
            [disabled]="!loading() && (!canSend() || historyLoading())"
            [attr.aria-label]="loading() ? 'Stop response' : 'Send message'"
            (click)="loading() ? stopStreaming() : null"
          >
            @if (loading()) {
            <span class="ph ph-stop md"></span>
            } @else {
            <span class="ph ph-arrow-up md"></span>
            }
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
```

---

#### File 11: `frontend/src/app/features/chat/chat/chat/chat.css`

```css
:host {
  display: block;
  height: 100%;
  width: 100%;
}

.chat-root-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
  position: relative;

  .chat-drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
    border: 2px dashed var(--color-primary);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(var(--glass-blur, 8px));
    -webkit-backdrop-filter: blur(var(--glass-blur, 8px));
    color: var(--color-primary);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    z-index: 5;
    pointer-events: none;

    span.ph {
      font-size: var(--font-size-huge);
      color: var(--color-primary);
      filter: drop-shadow(0 0 12px var(--color-primary-glow));
    }
  }

  .chat-history-loader {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    color: var(--color-text-secondary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);

    .custom-loader {
      width: 48px;
      height: 48px;
      border: 3px solid var(--color-border);
      border-radius: 50%;
      border-top-color: var(--color-primary);
      animation: spin 1s linear infinite;
    }
  }

  .chat-history {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    scroll-behavior: smooth;
    direction: rtl;
    width: 100%;
    padding: 32px;

    .empty-chat-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--color-text-secondary);
      gap: var(--space-3);

      span {
        color: var(--color-primary);
      }
    }
  }

  .chat-input-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-4) var(--space-4);
    width: 100%;
    max-width: 800px;
    margin: 0 auto;

    .chat-action-error {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      color: var(--color-danger);
      background: var(--color-danger-bg);
      border: 1px solid var(--color-danger-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      text-align: right;
    }

    form {
      display: flex;
      width: 100%;
    }

    .chat-prompt-field {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
      background: var(--color-input-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        opacity var(--transition-fast);

      &:focus-within {
        background: var(--color-input-bg);
        border-color: var(--color-primary);
        box-shadow: 0 0 0 var(--space-1) var(--color-primary-glow);
      }

      &:hover:not(:focus-within),
      &:hover:not(:disabled) {
        background: var(--color-input-bg);
        border-color: var(--primary-300);
      }

      .chat-image-preview {
        position: relative;
        display: inline-flex;
        align-self: flex-start;
        border-radius: var(--radius-md);
        overflow: hidden;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        padding: var(--space-1);
        max-width: 180px;
        transition: opacity var(--transition-fast);

        img {
          max-width: 100%;
          max-height: 140px;
          display: block;
          border-radius: var(--radius-sm);
        }

        .chat-image-preview-close {
          position: absolute;
          top: var(--space-1);
          inset-inline-end: var(--space-1);
          background: var(--glass-bg);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 50%;
        }
      }

      textarea {
        width: 100%;
        min-height: var(--space-16);
        max-height: calc(var(--space-16) * 3);
        padding: 0;
        resize: none;
        line-height: 1.6;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        scrollbar-width: thin;

        &:focus {
          box-shadow: none;
        }

        &::placeholder {
          color: var(--color-text-secondary);
        }
      }

      .chat-prompt-actions {
        display: flex;
        justify-content: space-between;

        .chat-attach-group {
          display: flex;
          align-items: center;

          .chat-file-input {
            display: none;
          }

          .chat-upload-btn {
            color: var(--color-text-secondary);

            &:hover {
              color: var(--color-primary);
            }
          }
        }
      }

      .chat-send-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: calc(var(--space-8) + var(--space-1));
        height: calc(var(--space-8) + var(--space-1));
        padding: 0;
        margin: 0;
        color: var(--color-bg);
        background: var(--color-text-secondary);
        border: 0;
        border-radius: 50%;
        cursor: pointer;
        transition:
          background-color var(--transition-fast),
          color var(--transition-fast),
          opacity var(--transition-fast);

        &:hover:not(:disabled) {
          background: var(--color-text-primary);
        }

        &.stop {
          color: var(--color-white);
          background: var(--color-danger);

          &:hover {
            background: var(--red-600);
          }
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      }
    }
  }
}
```

---

#### File 12: `frontend/src/app/features/chat/chat/chat/chat.ts`

```typescript
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { ChatStore } from "../../../core/store/chat.store";
import { AuthStore } from "../../../core/store/auth.store";
import {
  ChatModelSelection,
  IChatMessage,
} from "../../../core/models/chat-message.interface";
import { AutoScrollBottomDirective } from "../../../core/directives/auto-scroll-bottom.directive";
import {
  ChatMessage,
  ChatMessageActionEvent,
  ChatMessageStreamState,
} from "../chat-message/chat-message";
import { UsersStore } from "../../../core/store/users.store";
import { Select } from "primeng/select";
import { LlmProviderStore } from "../../../core/store/llm-provider.store";
import { ChatService } from "../../../core/services/chat.service";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AutoScrollBottomDirective,
    ChatMessage,
    Select,
  ],
  templateUrl: "./chat.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: "./chat.css",
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild("promptTextarea", { static: true })
  private promptTextarea?: ElementRef<HTMLTextAreaElement>;

  @ViewChild("fileInput")
  private fileInput?: ElementRef<HTMLInputElement>;

  private chatService = inject(ChatService);

  protected chatStore = inject(ChatStore);
  protected userStore = inject(UsersStore);
  protected authStore = inject(AuthStore);
  protected llmProviderStore = inject(LlmProviderStore);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor() {
    effect(() => {
      const groups = this.models();
      const currentSelection = this.chatForm.get("model")?.value;

      if (groups.length > 0 && !currentSelection) {
        let modelToSelect = null;
        for (const group of groups) {
          const gemmaModel = group.items?.find((m) => {
            return m.key === "google/gemma-4-31b-it:free";
          });
          if (gemmaModel) {
            modelToSelect = gemmaModel;
            break;
          }
        }

        if (!modelToSelect) {
          modelToSelect = groups[0]?.items?.[0];
        }

        if (modelToSelect) {
          this.chatForm.patchValue({ model: modelToSelect.id });
        }
      }
    });
  }

  messages = signal<IChatMessage[]>([]);
  loading = signal<boolean>(false);
  historyLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);
  deletingMessageId = signal<number | null>(null);
  activeAssistantIndex = signal<number | null>(null);
  activeStreamState = signal<ChatMessageStreamState>("idle");

  isDragging = signal<boolean>(false);
  selectedImageBase64 = signal<string | null>(null);
  selectedImagePreview = signal<string | null>(null);

  currentUserProfile = this.userStore.currentUserProfile;

  models = this.llmProviderStore.groupedProviders;

  chatForm: FormGroup = this.fb.group({
    prompt: ["", []],
    model: ["", []],
  });

  canSend = computed(() => {
    const promptValue = this.chatForm.value.prompt?.trim() || "";
    const hasImage = !!this.selectedImageBase64();
    return (
      (promptValue.length > 0 || hasImage) && !this.loading() && !this.historyLoading()
    );
  });

  private routeSub?: Subscription;
  private activeStreamSub?: Subscription;

  ngOnInit() {
    this.promptTextarea?.nativeElement.focus();
    (window as any).agentPrompt = (prompt: string) => {
      this.chatForm.patchValue({ prompt });
      this.sendMessage();
    };
    this.userStore.loadCurrentUser();

    this.llmProviderStore.loadProviders();

    this.routeSub = this.route.queryParams.subscribe((params) => {
      const sessionId = params["sessionId"] ? Number(params["sessionId"]) : null;

      this.cancelActiveStream();

      if (!sessionId) {
        this.chatStore.clearCurrentSession();
        this.messages.set([]);
        this.historyLoading.set(false);
        return;
      }

      this.chatStore.currentSessionId.set(sessionId);
      this.loadConversationHistory(sessionId);
    });
  }

  ngOnDestroy() {
    this.cancelActiveStream();

    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (!file.type.startsWith("image/")) {
      this.actionError.set("הקובץ שנבחר אינו תמונה.");
      return;
    }

    this.processFile(file);
    input.value = "";
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  onDragLeave(event: DragEvent): void {
    const target = event.relatedTarget as HTMLElement;
    if (!target || !this.fileInput?.nativeElement.contains(target)) {
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    const file = event.dataTransfer.files[0];
    if (!file.type.startsWith("image/")) {
      this.actionError.set("הקובץ ששוחרר אינו תמונה.");
      return;
    }

    this.processFile(file);
  }

  processFile(file: File): void {
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.actionError.set("התמונה גדולה מדי (מקסימום 10MB). נסה קובץ קטן יותר.");
      return;
    }

    this.actionError.set(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.selectedImageBase64.set(dataUrl);
      this.selectedImagePreview.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  clearSelectedImage(): void {
    this.selectedImageBase64.set(null);
    this.selectedImagePreview.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }

  private loadConversationHistory(sessionId: number) {
    this.historyLoading.set(true);
    this.messages.set([]);

    this.chatService.getSessionMessages(sessionId).subscribe({
      next: (history) => {
        this.messages.set(history ?? []);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
        this.messages.set([
          {
            role: "assistant",
            content: "[שגיאה בטעינת היסטוריית השיחה. נא לנסות שוב]",
          },
        ]);
      },
    });
  }

  sendMessage() {
    if (this.loading()) {
      return;
    }

    const promptValue = this.chatForm.value.prompt?.trim() || "";
    const imageValue = this.selectedImageBase64();

    if (promptValue.length === 0 && !imageValue) {
      return;
    }

    const selectedModelId = Number(this.chatForm.value.model);
    const modelSelection = this.getModelSelection(selectedModelId);

    this.chatForm.patchValue({ prompt: "" });
    this.clearSelectedImage();

    const currentId = this.chatStore.currentSessionId();
    if (currentId) {
      this.sendPromptToSession(promptValue, currentId, modelSelection, imageValue);
      return;
    }

    this.chatStore.createSessionForMessage(false).subscribe({
      next: (session) => {
        this.sendPromptToSession(promptValue, session.id, modelSelection, imageValue);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private sendPromptToSession(
    promptValue: string,
    sessionId: number,
    modelSelection?: ChatModelSelection,
    image?: string | null,
  ) {
    this.cancelActiveStream();
    this.actionError.set(null);

    const userMsg: IChatMessage = {
      role: "user",
      content: promptValue,
      imagePreview: image || undefined,
    };

    const assistantMsg: IChatMessage = {
      role: "assistant",
      content: "",
      steps: [],
    };

    this.messages.update((prev) => {
      return [...prev, userMsg, assistantMsg];
    });
    this.loading.set(true);
    const assistantIndex = this.messages().length - 1;
    this.activeAssistantIndex.set(assistantIndex);
    this.activeStreamState.set("streaming");

    const isFirstMessage = this.messages().length <= 2;

    this.activeStreamSub = this.chatService
      .sendMessageStream(promptValue, sessionId, modelSelection, image || undefined)
      .subscribe({
        next: (event) => {
          if (event.type === "step" && event.message && event.icon) {
            this.messages.update((prev) => {
              const updated = [...prev];
              const current = updated[assistantIndex];
              if (!current) {
                return prev;
              }

              const currentSteps = current.steps || [];

              updated[assistantIndex] = {
                ...current,
                steps: [...currentSteps, { icon: event.icon, message: event.message }],
              };

              return updated;
            });
            return;
          }

          if (event.type === "token" && event.content) {
            this.messages.update((prev) => {
              const updated = [...prev];
              const current = updated[assistantIndex];
              if (!current) {
                return prev;
              }

              updated[assistantIndex] = {
                ...current,
                content: current.content + event.content!,
              };

              return updated;
            });
          }
        },
        error: () => {
          this.activeStreamSub = undefined;
          this.loading.set(false);
          this.activeStreamState.set("errored");
          this.messages.update((prev) => {
            const updated = [...prev];
            const current = updated[assistantIndex];
            if (!current) {
              return prev;
            }

            updated[assistantIndex] = {
              ...current,
              content: "[שגיאה בקבלת תשובה מהשרת. נא לנסות שוב]",
            };

            return updated;
          });
        },
        complete: () => {
          this.activeStreamSub = undefined;
          this.loading.set(false);
          this.activeStreamState.set("completed");

          const currentSession = this.chatStore.sessions().find((s) => {
            return s.id === sessionId;
          });

          if (isFirstMessage || currentSession?.title === "שיחה חדשה...") {
            this.chatStore.loadSessions();
          }

          this.router.navigate(["/chat"], {
            queryParams: { sessionId },
            replaceUrl: true,
          });
        },
      });
  }

  onPromptKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.sendMessage();
  }

  getStreamState(index: number, message: IChatMessage): ChatMessageStreamState {
    if (message.role !== "assistant" || this.activeAssistantIndex() !== index) {
      return "idle";
    }

    return this.activeStreamState();
  }

  handleMessageAction(event: ChatMessageActionEvent): void {
    this.actionError.set(null);

    if (event.action === "delete") {
      this.deleteMessageFromSession(event.message);
      return;
    }

    if (event.action === "sendAgain") {
      this.sendAgain(event.message);
      return;
    }

    if (event.action === "copy") {
      this.copyMessage(event.message);
      return;
    }

    if (event.action === "edit") {
      this.editMessage(event.message);
    }
  }

  private cancelActiveStream(): void {
    if (this.activeStreamSub) {
      this.activeStreamSub.unsubscribe();
      this.activeStreamSub = undefined;
    }

    this.clearActiveStream();
  }

  private clearActiveStream(): void {
    this.loading.set(false);
    this.activeAssistantIndex.set(null);
    this.activeStreamState.set("idle");
  }

  private editMessage(message: IChatMessage): void {
    if (message.role !== "user") {
      return;
    }

    this.chatForm.patchValue({ prompt: message.content });
    this.promptTextarea?.nativeElement.focus();
  }

  private findPreviousUserPrompt(message: IChatMessage): string {
    const messageIndex = this.messages().findIndex((item) => {
      if (message.id && item.id) {
        return item.id === message.id;
      }

      return item === message;
    });

    if (messageIndex < 0) {
      return "";
    }

    const previousUserMessage = this.messages()
      .slice(0, messageIndex)
      .reverse()
      .find((item) => {
        return item.role === "user";
      });

    return previousUserMessage?.content ?? "";
  }

  private getModelSelection(selectedModelId?: number): ChatModelSelection | undefined {
    if (!selectedModelId) {
      return undefined;
    }

    for (const provider of this.llmProviderStore.providers()) {
      const model = provider.models?.find((m) => {
        return m.id === selectedModelId;
      });

      if (model) {
        return {
          provider: provider.key,
          model: model.key,
        };
      }
    }

    return undefined;
  }

  stopStreaming(): void {
    if (!this.activeStreamSub) {
      this.clearActiveStream();
      return;
    }

    this.activeStreamSub.unsubscribe();
    this.activeStreamSub = undefined;
    this.loading.set(false);
    this.activeStreamState.set("completed");

    const assistantIndex = this.activeAssistantIndex();
    if (assistantIndex === null) {
      return;
    }

    this.messages.update((prev) => {
      const current = prev[assistantIndex];
      if (!current || current.content.trim()) {
        return prev;
      }

      const updated = [...prev];
      updated[assistantIndex] = {
        ...current,
        content: "התגובה בוטלה.",
      };
      return updated;
    });
  }

  private deleteMessageFromSession(message: IChatMessage): void {
    const sessionId = message.sessionId ?? this.chatStore.currentSessionId();

    if (!sessionId || !message.id) {
      this.actionError.set("אי אפשר למחוק הודעה שעדין לא נשמרה.");
      return;
    }

    this.deletingMessageId.set(message.id);
    this.chatService.deleteMessage(sessionId, message.id).subscribe({
      next: () => {
        this.messages.update((prev) => {
          const deleteFromIndex = prev.findIndex((item) => {
            return item.id === message.id;
          });
          if (deleteFromIndex < 0) {
            return prev;
          }
          return prev.slice(0, deleteFromIndex);
        });
        this.deletingMessageId.set(null);
        this.chatStore.loadSessions();
      },
      error: () => {
        this.deletingMessageId.set(null);
        this.actionError.set("מחיקת ההודעה נכשלה. נסה שוב.");
      },
    });
  }

  private copyMessage(message: IChatMessage): void {
    if (!navigator.clipboard) {
      this.actionError.set("הדפדפן לא מאפשר העתקה כרגע.");
      return;
    }

    void navigator.clipboard.writeText(message.content).catch(() => {
      this.actionError.set("העתקת ההודעה נכשלה.");
    });
  }

  private sendAgain(message: IChatMessage): void {
    if (this.loading()) {
      return;
    }

    const prompt =
      message.role === "user" ? message.content : this.findPreviousUserPrompt(message);

    if (!prompt.trim()) {
      this.actionError.set("לא נמצאה הודעת משתמש קודמת.");
      return;
    }

    this.chatForm.patchValue({ prompt });
    this.sendMessage();
  }
}
```
