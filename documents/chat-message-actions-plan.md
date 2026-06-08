# Chat Message Actions Plan

## Goal

Add a compact action bar to every chat message so the user can manage individual messages directly from the conversation.

Initial required actions:

- Delete message.
- Send again.

Recommended additional actions:

- Copy message.
- Edit and resend.
- Continue from here.

The action UI should stay quiet and utilitarian. It should not compete with the chat content or GenUI output.

## Current State

Main frontend files:

- `frontend/src/app/features/chat/chat-message/chat-message.ts`
- `frontend/src/app/features/chat/chat-message/chat-message.html`
- `frontend/src/app/features/chat/chat-message/chat-message.css`
- `frontend/src/app/features/chat/chat/chat.ts`
- `frontend/src/app/features/chat/chat/chat.html`
- `frontend/src/app/core/services/chat.service.ts`

Current behavior:

- `ChatMessage` renders one message.
- `Chat` owns the message list, stream state, session id, and send flow.
- The message component does not currently emit user actions to the parent.
- Backend message deletion is not currently exposed as a per-message endpoint.

## Product Behavior

### Delete Message

Purpose:

- Remove an individual message from the visible conversation.

Recommended version 1 behavior:

- Persistent delete from the database.
- After the backend delete succeeds, remove the message from the visible UI.
- If the backend delete fails, keep the message visible and show a small error state or toast.

Important decision:

- Deleting one persisted chat message can make the stored conversation inconsistent, especially if an assistant answer depends on earlier tool messages.
- Product decision: UI delete must also delete the message from the database.
- Because of this, backend deletion must enforce session ownership and preserve conversation consistency.

### Send Again

Purpose:

- Run the same prompt again.

Behavior:

- For user messages: resend the exact user prompt.
- For assistant messages: resend the previous user prompt that caused this assistant response.
- If no previous user prompt exists, hide or disable the action.

Recommended label:

- `Send again`

Recommended icon:

- `ph-arrow-clockwise`

### Copy Message

Purpose:

- Copy the message content to clipboard.

Behavior:

- Copy raw message content, not rendered HTML.
- Show a short copied state on the icon/button.

Recommended label:

- `Copy`

Recommended icon:

- `ph-copy`

### Edit And Resend

Purpose:

- Put a user message back into the textarea so the user can adjust and submit it.

Behavior:

- Available for user messages.
- Parent `Chat` receives the selected content and patches the prompt field.
- Focus the textarea after patching.

Recommended label:

- `Edit`

Recommended icon:

- `ph-pencil-simple`

### Continue From Here

Purpose:

- Continue the conversation from a selected point.

Behavior:

- Available on assistant messages.
- Sends a generated prompt such as: "Continue from this answer".
- Optional for version 1. This is useful but less critical than copy/edit/delete/resend.

Recommended label:

- `Continue`

Recommended icon:

- `ph-play`

## Recommended Action Set

Version 1 should include:

| Action          | User Message | Assistant Message | Notes                                      |
| --------------- | ------------ | ----------------- | ------------------------------------------ |
| Delete          | Yes          | Yes               | Deletes from DB, then updates local UI     |
| Send again      | Yes          | Yes               | Assistant uses previous user prompt        |
| Copy            | Yes          | Yes               | Low risk, high utility                     |
| Edit and resend | Yes          | No                | Patches textarea with existing user prompt |

Optional later:

| Action             | User Message | Assistant Message | Notes                                    |
| ------------------ | ------------ | ----------------- | ---------------------------------------- |
| Continue from here | No           | Yes               | Useful but can wait                      |
| Pin message        | Yes          | Yes               | Requires persisted metadata              |
| Show raw content   | Yes          | Yes               | Useful for debugging GenUI and Markdown  |

## UX Design

### Placement

Recommended:

- Show actions as small icon buttons in a message action bar.
- Place the action bar near the top edge of the message bubble/card.
- Keep it visible on hover/focus for desktop.
- Keep it always visible or available through a compact menu on touch devices.

### Accessibility

Requirements:

- Every icon button must have `aria-label`.
- Buttons must be keyboard focusable.
- Do not rely only on hover.
- Use tooltips if the project already has a tooltip pattern. Otherwise use `aria-label` first.

### Visual Rules

Use existing design tokens only:

- `var(--space-*)`
- `var(--color-*)`
- `var(--radius-*)`
- `var(--transition-*)`

Do not introduce hardcoded colors, spacing, or font sizes.

## Frontend Architecture

### `ChatMessage` Component

Add outputs:

```ts
deleteRequested = output<IChatMessage>();
sendAgainRequested = output<IChatMessage>();
copyRequested = output<IChatMessage>();
editRequested = output<IChatMessage>();
```

Alternative:

```ts
actionRequested = output<ChatMessageActionEvent>();
```

Recommended:

Use a single typed event to keep the template simple:

```ts
export type ChatMessageAction = 'delete' | 'sendAgain' | 'copy' | 'edit';

export type ChatMessageActionEvent = {
  action: ChatMessageAction;
  message: IChatMessage;
};
```

### `Chat` Parent Component

Responsibilities:

- Decide what each action means in the full conversation context.
- Call backend persistent delete and then update the local `messages` signal.
- Find the previous user prompt for assistant resend.
- Patch the textarea for edit.
- Call `sendMessage` or a dedicated resend helper.

Do not put conversation-level logic inside `ChatMessage`.

## Backend Requirement

Version 1 must include persistent database deletion.

Add:

```txt
DELETE /admin-agent/sessions/:sessionId/messages/:messageId
```

Rules:

- The authenticated user must own the session.
- The message must belong to the requested session.
- Deleting tool messages directly should be avoided or restricted from the UI.
- Prefer deleting the selected message and all later messages in the session to preserve conversation consistency.
- If product insists on deleting only one row, document that later assistant/tool context may become inconsistent.
- Return `204 No Content` after a successful delete.
- Do not invent a response body for the delete endpoint.

## Implementation Steps

### Step 1 - Define Action Types

Create or add near `chat-message.ts`:

```ts
export type ChatMessageAction = 'delete' | 'sendAgain' | 'copy' | 'edit';
export type ChatMessageActionEvent = {
  action: ChatMessageAction;
  message: IChatMessage;
};
```

Verification:

- Types compile.
- No `any` is introduced.

### Step 2 - Add Action UI To `ChatMessage`

Update:

```txt
frontend/src/app/features/chat/chat-message/chat-message.html
frontend/src/app/features/chat/chat-message/chat-message.ts
frontend/src/app/features/chat/chat-message/chat-message.css
```

Requirements:

- Add icon buttons for delete, send again, copy, and edit.
- Hide edit on assistant messages.
- Disable send again when no prompt can be resolved by parent, or let parent no-op safely.
- Use `ph-trash`, `ph-arrow-clockwise`, `ph-copy`, and `ph-pencil-simple`.

Verification:

- Buttons render for every message.
- Keyboard focus works.
- Text/content layout does not shift badly.

### Step 3 - Add Backend Persistent Delete

Update:

```txt
backend/src/modules/admin-agent/admin-agent.controller.ts
backend/src/modules/admin-agent/admin-agent.service.ts
backend/src/modules/admin-agent/services/agent-session.service.ts
```

Add endpoint:

```txt
DELETE /admin-agent/sessions/:sessionId/messages/:messageId
```

Recommended service behavior:

- Verify the authenticated user owns the session.
- Verify the message belongs to that session.
- Delete the selected message and all later messages in that session.
- Return `void`.

Verification:

- User cannot delete messages from another user's session.
- Deleting a message removes it from database history.
- Loading the session again does not return the deleted message.
- Backend build passes.

### Step 4 - Handle Actions In `Chat`

Update:

```txt
frontend/src/app/features/chat/chat/chat.ts
frontend/src/app/features/chat/chat/chat.html
frontend/src/app/core/services/chat.service.ts
```

Behavior:

- Wire `(actionRequested)` from each `app-chat-message`.
- Delete calls the backend delete endpoint.
- After backend success, remove the selected message and any later messages from `messages`.
- If backend delete fails, keep the local message list unchanged.
- Copy writes `message.content` to clipboard.
- Edit patches `chatForm.prompt`.
- Send again resends the relevant prompt.

Verification:

- Delete removes the selected message from the DB and UI.
- Reloading the session does not restore the deleted message.
- Copy copies raw content.
- Edit focuses textarea.
- Send again starts a new assistant response.

## Risks

### Risk: Persistent Delete Breaks Context

Deleting one historical message can leave later assistant/tool messages without their original context.

Mitigation:

- Delete from the selected message onward, not only the selected row.
- Make this behavior clear in code and tests.

### Risk: Send Again Duplicates Tool Actions

Resending a prompt can trigger real tool actions again.

Mitigation:

- This is expected behavior.
- Consider confirmation only for prompts that caused destructive actions later.

### Risk: Action Bar Clutters GenUI

GenUI cards can be large and visually dense.

Mitigation:

- Keep actions small.
- Use icon buttons.
- Put actions outside the rendered GenUI body.

## Suggested Implementation Order

1. Add `ChatMessageAction` event type.
2. Add action bar UI in `chat-message`.
3. Add backend persistent message delete endpoint.
4. Add `ChatService.deleteMessage(...)`.
5. Wire action handler in `chat`.
6. Implement persistent delete, copy, edit, resend.
7. Run backend build.
8. Run frontend build.

## Open Decisions

- Should deleting a message delete only that message or the selected message and all messages after it?
- Should resend preserve the currently selected LLM model?
- Should destructive resend prompts require confirmation?
- Should actions be visible on hover only or always visible?

## Agent Checklist By Module

### Agent 1 - Chat Message UI

Owner: `frontend/src/app/features/chat/chat-message/`

- [ ] Define `ChatMessageAction` and `ChatMessageActionEvent`.
- [ ] Add an `actionRequested` output.
- [ ] Add icon buttons for delete, send again, copy, and edit.
- [ ] Hide edit for assistant messages.
- [ ] Add accessible labels.
- [ ] Style with existing CSS variables only.

### Agent 2 - Chat Parent Behavior

Owner: `frontend/src/app/features/chat/chat/`

- [ ] Listen to `actionRequested`.
- [ ] Call backend delete when delete is requested.
- [ ] Remove the selected message and later messages from local UI after backend success.
- [ ] Keep UI unchanged if backend delete fails.
- [ ] Implement copy to clipboard.
- [ ] Implement edit by patching the textarea.
- [ ] Implement send again for user messages.
- [ ] Implement send again for assistant messages using the previous user prompt.
- [ ] Preserve selected model when resending.

### Agent 3 - Backend Persistent Delete

Owner: `backend/src/modules/admin-agent/`

- [ ] Add `DELETE /admin-agent/sessions/:sessionId/messages/:messageId`.
- [ ] Verify session ownership before delete.
- [ ] Verify message belongs to the session.
- [ ] Delete selected message and later messages, unless product chooses single-row delete.
- [ ] Avoid unsafe direct deletion of tool messages from the UI.
- [ ] Add complete Swagger metadata.
- [ ] Add focused service/controller tests if test patterns exist.
- [ ] Run backend build.

### Agent 4 - Verification

Owner: cross-frontend

- [ ] Run `npx ng build`.
- [ ] Run `npm.cmd run build` in backend.
- [ ] Test delete on user and assistant messages.
- [ ] Reload session after delete and verify deleted messages are gone.
- [ ] Test copy on plain text, Markdown, and GenUI messages.
- [ ] Test edit and resend.
- [ ] Test send again after model selection.
- [ ] Check mobile/touch behavior.
