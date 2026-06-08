# Streaming Chat Experience Action Plan

## Goal

Improve the chat response stream so assistant answers feel smooth, intentional, and premium instead of appearing as abrupt token dumps.

The current `Chat` component appends every streamed token directly into the last assistant message. That makes the DOM update too often, creates visually uneven output, and leaves no clean place to coordinate typing, thinking-state transitions, cursor behavior, scroll behavior, or cleanup.

## Scope

- Keep the backend stream contract unchanged unless implementation later proves a small addition is required.
- Keep persisted chat history as final message content, not as animation state.
- Move presentation-only streaming behavior out of the container and into a dedicated message renderer.
- Preserve existing tool step support: `steps: { icon, message }[]`.
- Avoid changing unrelated chat behavior such as session creation, history loading, title refresh, or message sending.

## Current State

- `frontend/src/app/features/chat/chat/chat.ts` receives stream events and mutates `messages` immediately.
- Token events append directly to `updated[lastIndex].content`.
- Step events append to `updated[lastIndex].steps`.
- `frontend/src/app/features/chat/chat/chat.html` renders all rows inline inside the parent component.
- `AiFormat` reparses the full message and replaces `innerHTML` whenever content changes.
- `AutoScrollBottomDirective` already uses `MutationObserver` and `requestAnimationFrame`, but it schedules a scroll for every mutation.

## Target UX

- The assistant message appears with a subtle bubble entrance.
- Tool activity remains visible only when meaningful steps exist.
- When answer text begins, the thinking/tool box transitions away cleanly before typing starts.
- Text is released through a controlled typewriter buffer, not directly on every incoming stream token.
- Typing uses natural variation: stable within words, slight jitter between words, and short punctuation pauses.
- When the network stream completes, remaining buffered text flushes quickly so the user is not forced to wait.
- A blinking cursor appears only while the active assistant message is still typing.
- Auto-scroll remains smooth without excessive layout work.

## Recommended Architecture

Create a dedicated standalone message component and keep `Chat` as the container.

Container responsibilities:

- Load sessions and history.
- Send prompts.
- Receive stream events.
- Maintain the canonical message list.
- Append step events to the active assistant message.
- Append raw token text to the active assistant message as canonical content.
- Pass message data and active-stream metadata to child rows.

Message component responsibilities:

- Render one chat row.
- Decide whether the row is static history or the active streaming assistant row.
- Manage local displayed content for the active assistant row.
- Own the typewriter buffer, timers, cursor state, and thinking-to-typing transition.
- Clean up timers and DOM listeners in `ngOnDestroy`.

This keeps streaming animation local and disposable. Switching sessions, loading history, or destroying the row should automatically stop all active timers.

## Implementation Checklist

### Phase 1: Extract `ChatMessageComponent`

- [x] Create `frontend/src/app/features/chat/chat-message/chat-message.ts`.
- [x] Create `chat-message.html` and `chat-message.css`.
- [x] Make the component standalone.
- [x] Use `input()` for:
  - [x] `message: IChatMessage`.
  - [x] `streamState: ChatMessageStreamState` as the implemented stream metadata input.
  - [x] Replaced separate `isLatest`, `isLoading`, and `isStreamingAssistant` inputs with one stream-state input.
- [x] Use `computed()` values for role classes, labels, icons, and whether thinking steps should render.
- [x] Move the message row HTML out of `chat.html`.
- [x] Replace the inline row in `chat.html` with `<app-chat-message>`.
- [x] Keep the parent `@for` filtering for `msg.role !== 'tool'`, or move that condition into a computed list if cleaner.

### Phase 2: Add Local Display Content

- [x] For non-streaming rows, render `message.content` directly.
- [x] For the active streaming assistant row, render a local `displayedContent` signal.
- [x] Track the previous canonical content length.
- [x] On content input changes, enqueue only the newly added text.
- [x] Do not replay the whole message on every signal update.
- [x] On history-loaded messages, initialize `displayedContent` to the full message content immediately.

### Phase 3: Typewriter Buffer

- [x] Add a private character queue for pending streamed text.
- [x] Add a single active timer handle.
- [x] Implement a recursive `scheduleNextTick()` loop using `setTimeout`.
- [x] Emit characters in small chunks when the queue is large enough to avoid falling behind.
- [x] Keep speed consistent within a word.
- [x] Add slight word-boundary jitter:
  - [x] Base delay implemented as `18ms`.
  - [x] Jitter implemented as `0ms` to `17ms`.
- [x] Add punctuation micro-pauses for `.`, `,`, `!`, `?`, `:`, and `;`.
- [x] Keep punctuation pauses short enough to feel responsive: about `45ms` to `120ms`.
- [x] Do not add pauses inside code blocks if that is simple to detect; otherwise document as a later refinement.

### Phase 4: Flush Mode

- [x] Add an input or derived state that tells the row when the network stream is complete.
- [x] When stream completion is detected, switch the active row into flush mode.
- [x] In flush mode, bypass word jitter and punctuation pauses.
- [x] Drain buffered text quickly, either with a fast delay or larger chunks per tick.
- [x] Only clear the typing cursor after both conditions are true:
  - [x] The backend stream completed.
  - [x] The local buffer is empty.
- [x] Add a visible typing rate cap:
  - [x] Never append more than a small visual chunk per frame while the user can see typing.
  - [x] Speed up gradually when the queue grows instead of jumping from character typing to text dumps.
  - [x] Keep flush mode fast but still visibly animated unless the remaining buffer is tiny.
  - [x] Prevent the response from switching from smooth typing into abrupt bulk insertion.

### Phase 5: Thinking-to-Typing Handoff

- [x] Define row-level states:
  - [x] `idle`
  - [x] `thinking`
  - [x] `transitioning`
  - [x] `typing`
  - [x] `complete`
- [x] Keep the thinking/tool box visible while steps are still the only content.
- [x] When the first content token arrives and steps exist, move to `transitioning`.
- [x] During `transitioning`, enqueue tokens but do not render typed characters yet.
- [x] Collapse the thinking box with a CSS class such as `.thinking-process-box.collapsing-out`.
- [x] Prefer a `transitionend` listener to know when typing may begin.
- [x] Add a timeout fallback matching the transition duration in case `transitionend` does not fire.
- [x] After the transition completes, switch to `typing` and start draining the buffer.
- [x] If no thinking steps exist, start typing immediately when the first token arrives.

### Phase 6: Cursor and Bubble Polish

- [x] Add `.typing-active` to the active assistant row only while local typing is in progress.
- [x] Use a CSS pseudo-element for the blinking cursor.
- [x] Ensure the cursor does not appear on historical assistant messages.
- [x] Add a subtle one-time bubble entrance animation for newly inserted rows.
- [x] Keep animation distances small to avoid layout jumps.
- [x] Respect reduced-motion preferences with `@media (prefers-reduced-motion: reduce)`.

### Phase 7: `AiFormat` Rendering Strategy

- [x] Review `AiFormat` before adding a `MutationObserver`; it currently replaces the host `innerHTML` on every content change.
- [x] Avoid a naive observer that re-animates all parsed nodes every token.
- [x] Add fade-in behavior for newly completed rendered blocks so Markdown output does not appear as a sudden dump after parsing.
- [x] Preferred approach:
  - [x] Add a stable wrapper or marker strategy so only newly created top-level blocks receive `.node-fade-in`.
  - [x] Track previously rendered top-level block count or content signature.
  - [x] Apply fade-in only to newly completed block-level nodes.
- [x] If that is too much for the first pass, defer block fade-in and ship the typewriter/cursor first.
- [x] Keep all generated HTML sanitized or escaped at least as safely as the current parser does.
- [x] Remove inline style expansion from new work; use existing design tokens and classes where possible.

### Phase 8: Auto-Scroll Refinement

- [x] Update `AutoScrollBottomDirective` so only one animation-frame scroll can be pending at a time.
- [x] Keep the existing `MutationObserver`, but coalesce rapid mutations.
- [x] Consider scrolling only when the user is already near the bottom.
- [x] Do not forcibly pull the viewport down if the user has intentionally scrolled upward.
- [x] Add or verify `scroll-behavior: smooth` on the chat history viewport.

### Phase 9: Parent Stream State

- [x] Keep `Chat.sendMessage()` responsible for creating the user message and empty assistant message.
- [x] Add explicit active assistant stream metadata if needed:
  - [x] Active assistant index or id.
  - [x] Network stream status: `streaming`, `completed`, `errored`.
- [x] On token events, continue updating canonical content so persistence and final state stay simple.
- [x] On step events, continue appending steps to the active assistant message.
- [x] On error, stop local typing and show the error content cleanly.
- [x] On route/session change, clear active stream metadata.

### Phase 10: Verification

- [x] Ask a simple prompt with no tool usage.
  - [x] No thinking box appears.
  - [x] Text types smoothly.
  - [x] Cursor disappears when complete.
- [x] Ask a prompt that triggers tool steps.
  - [x] Thinking/tool box appears.
  - [x] First answer token triggers a smooth transition.
  - [x] Typing starts only after the transition completes.
- [x] Stream a long answer.
  - [x] The buffer does not fall behind indefinitely.
  - [x] Flush mode drains quickly after network completion.
  - [x] Scrolling remains smooth.
- [x] Load an existing session.
  - [x] Historical messages render instantly.
  - [x] No typewriter animation replays for history.
- [x] Switch sessions during an active response.
  - [x] Timers are cleaned up.
  - [x] No errors appear in the console.
- [x] Test Markdown-heavy output.
  - [x] Lists, headings, tables, inline code, and code blocks still render correctly.
- [x] Run the frontend build.

## Risk Notes

- The largest UX risk is a race between the thinking-box collapse and the first typed characters. The row component should own that handoff.
- The largest technical risk is repeatedly replacing `innerHTML` in `AiFormat`; block-level fade-in should not be added until the rendering strategy is stable.
- Typewriter animation should never delay the final answer excessively. Flush mode is required, not optional.
- Timer cleanup must be handled inside the child component to avoid leaks when navigating between sessions.

## Suggested First Implementation Slice

Start with the smallest slice that proves the architecture:

- [x] Extract `ChatMessageComponent`.
- [x] Render static messages exactly as before.
- [x] Add local typewriter rendering only for the latest loading assistant message.
- [x] Add flush mode and cursor.
- [x] Coalesce auto-scroll frames.
- [x] Verify simple and long streams.

After that works, add thinking-box transition coordination and block-level fade-in as separate follow-up slices.
