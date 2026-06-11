# Chat Stop Stream Button Plan

## Goal

Change the chat submit button behavior while an assistant response is streaming.

Current behavior:

- The submit button is disabled while `loading()` is true.
- The user cannot cancel a long-running model response.

Desired behavior:

- While idle, the button remains the current submit/send button.
- While `loading()` is true, the same button becomes a stop button.
- Clicking stop cancels the active stream request and leaves the partial assistant response visible.
- The UI exits loading state immediately after cancellation.

## Current Code Context

Primary files:

- `frontend/src/app/features/chat/chat/chat.ts`
- `frontend/src/app/features/chat/chat/chat.html`
- `frontend/src/app/features/chat/chat/chat.css`
- `frontend/src/app/core/services/chat.service.ts`

Important current behavior:

- `Chat.sendMessage()` blocks when `this.loading()` is true.
- `Chat.sendPromptToSession(...)` subscribes to `chatService.sendMessageStream(...)`, but the subscription is not stored.
- `ChatService.sendMessageStream(...)` already creates an `AbortController`.
- The Observable teardown already calls `controller.abort()`, so unsubscribing from the stream should cancel the underlying fetch.
- The submit button is currently:

```html
<button
    type="submit"
    class="chat-send-btn"
    [disabled]="chatForm.invalid || loading() || historyLoading()"
    aria-label="..."
>
    <span class="ph ph-arrow-up md"></span>
</button>
```

## UX Requirements

Idle state:

- Button type: `submit`.
- Icon: send/up arrow, current `ph-arrow-up`.
- Disabled only when `chatForm.invalid` or `historyLoading()`.
- Pressing Enter should submit as today when not loading.

Loading state:

- Button type should not submit the form.
- Icon should become a stop icon, preferably `ph-stop` or `ph-square`.
- Button should remain clickable while `loading()`.
- `aria-label` should describe stop/cancel.
- The input can remain editable unless implementation shows a reason to lock it.
- Model selector behavior can stay unchanged unless it causes inconsistent request state.

Stop behavior:

- Cancel the active stream subscription.
- Set `loading` to false.
- Set `activeStreamState` to a non-streaming terminal state.
- Keep already streamed assistant content and steps visible.
- If no assistant content has arrived yet, optionally show a short cancelled marker in the assistant message.
- Do not create duplicate history entries.
- Do not navigate away or reload sessions just because the stream was cancelled.

## Implementation Plan

### Phase 1 - Store Active Stream Subscription

In `chat.ts`:

1. Add a private field:

```ts
private activeStreamSub?: Subscription;
```

2. Before starting a new stream, unsubscribe any existing active stream defensively.
3. Store the subscription returned by `sendMessageStream(...).subscribe(...)`.
4. Clear the reference on `error`, `complete`, and manual stop.

Verification:

- Starting a normal request still streams tokens.
- Completion clears `loading`.
- Errors still render the existing error message.

### Phase 2 - Add Stop Action

In `chat.ts`:

1. Add `stopStreaming(): void`.
2. If there is no active subscription, return.
3. Unsubscribe the active stream subscription.
4. Set `activeStreamSub` to `undefined`.
5. Set `loading` to false.
6. Set `activeStreamState` to `completed` or add a new `cancelled` state if the message component needs a distinct visual.
7. Preserve partial message content.

Recommended first implementation:

- Reuse `completed` to avoid expanding `ChatMessageStreamState` unless the UI needs a special cancelled indicator.
- Add a cancelled marker only if the assistant message is still empty.

Risk:

- The Observable may surface an `AbortError` through `error` after unsubscribe. Since unsubscribe closes the observer, this should not update the UI, but verify manually.

### Phase 3 - Replace Disabled Loading Button With Stop Button

In `chat.html`:

1. Keep one button in the same location.
2. Switch behavior by `loading()`:

```html
<button
    [type]="loading() ? 'button' : 'submit'"
    class="chat-send-btn"
    [class.stop]="loading()"
    [disabled]="!loading() && (chatForm.invalid || historyLoading())"
    [attr.aria-label]="loading() ? 'Stop response' : 'Send message'"
    (click)="loading() ? stopStreaming() : null"
>
    @if (loading()) {
        <span class="ph ph-stop md"></span>
    } @else {
        <span class="ph ph-arrow-up md"></span>
    }
</button>
```

3. Ensure Enter key does not send another message while loading. `sendMessage()` already returns early when loading.

Verification:

- During streaming the button is clickable.
- During streaming the button does not submit the form again.
- When idle, clicking still submits normally.

### Phase 4 - Stop Button Styling

In `chat.css`:

1. Remove or adjust selectors that dim the whole prompt field when `.chat-send-btn:disabled`.
2. Add a `.chat-send-btn.stop` state.
3. Use design tokens only.
4. Keep the button circular and the same size to avoid layout shift.

Suggested visual:

- Stop state background: danger/error token if available, otherwise an existing semantic token.
- Stop icon color: readable contrast token.
- Hover state: stronger danger/error token or border/glow token.

Verification:

- Idle and loading button sizes match.
- Stop hover is visible.
- No prompt area opacity drop while the stop button is active.

### Phase 5 - Cleanup On Route / Destroy

In `chat.ts`:

1. Update `ngOnDestroy()` to unsubscribe `activeStreamSub`.
2. Update route change handling or `clearActiveStream()` to cancel an active stream before clearing active stream state.
3. Avoid leaving a fetch running after leaving the chat route or switching sessions.

Verification:

- Navigate to another session while streaming: old stream stops.
- Leave the chat page while streaming: request is aborted.

### Phase 6 - Tests / Verification

Automated checks:

- `npx ng test --watch=false`
- `npx ng build`

Manual checks:

1. Send a prompt with a slow model.
2. Confirm the send button becomes a stop button.
3. Click stop.
4. Confirm streaming stops immediately.
5. Confirm partial content remains visible.
6. Confirm the button returns to send mode.
7. Send another prompt and confirm the chat still works.
8. Switch sessions during streaming and confirm the old stream does not continue appending tokens.

## Edge Cases

- Stop before any token arrives:
  - Keep assistant message with a short cancelled marker or remove the empty assistant message.
  - Prefer a marker so the user sees that cancellation happened.

- Stop after tool/step messages but before final text:
  - Keep steps visible.
  - End loading state.

- Network error after manual abort:
  - Do not replace partial content with the generic server error if the user intentionally stopped the request.

- Double-click stop:
  - Should be harmless.

## Definition Of Done

- Loading state button is clickable and visually becomes stop.
- Stop cancels the active stream through Observable unsubscribe / `AbortController`.
- Partial assistant response remains visible.
- No duplicate send happens while loading.
- Stream subscription is cleaned up on complete, error, stop, route change, and destroy.
- Frontend tests and build pass.
- Existing warnings may remain, but no new build errors are introduced.
