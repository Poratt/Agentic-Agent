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

- [ ] Create `frontend/src/app/features/chat/chat-message/chat-message.ts`.
- [ ] Create `chat-message.html` and `chat-message.css`.
- [ ] Make the component standalone.
- [ ] Use `input()` for:
  - [ ] `message: IChatMessage`.
  - [ ] `isLatest: boolean`.
  - [ ] `isLoading: boolean`.
  - [ ] `isStreamingAssistant: boolean`.
- [ ] Use `computed()` values for role classes, labels, icons, and whether thinking steps should render.
- [ ] Move the message row HTML out of `chat.html`.
- [ ] Replace the inline row in `chat.html` with `<app-chat-message>`.
- [ ] Keep the parent `@for` filtering for `msg.role !== 'tool'`, or move that condition into a computed list if cleaner.

### Phase 2: Add Local Display Content

- [ ] For non-streaming rows, render `message.content` directly.
- [ ] For the active streaming assistant row, render a local `displayedContent` signal.
- [ ] Track the previous canonical content length.
- [ ] On content input changes, enqueue only the newly added text.
- [ ] Do not replay the whole message on every signal update.
- [ ] On history-loaded messages, initialize `displayedContent` to the full message content immediately.

### Phase 3: Typewriter Buffer

- [ ] Add a private character queue for pending streamed text.
- [ ] Add a single active timer handle.
- [ ] Implement a recursive `scheduleNextTick()` loop using `setTimeout`.
- [ ] Emit characters in small chunks when the queue is large enough to avoid falling behind.
- [ ] Keep speed consistent within a word.
- [ ] Add slight word-boundary jitter:
  - [ ] Base delay: around `12ms` to `18ms`.
  - [ ] Jitter: about `-5ms` to `+10ms`.
- [ ] Add punctuation micro-pauses for `.`, `,`, `!`, `?`, `:`, and `;`.
- [ ] Keep punctuation pauses short enough to feel responsive: about `45ms` to `120ms`.
- [ ] Do not add pauses inside code blocks if that is simple to detect; otherwise document as a later refinement.

### Phase 4: Flush Mode

- [ ] Add an input or derived state that tells the row when the network stream is complete.
- [ ] When stream completion is detected, switch the active row into flush mode.
- [ ] In flush mode, bypass word jitter and punctuation pauses.
- [ ] Drain buffered text quickly, either with a fast delay or larger chunks per tick.
- [ ] Only clear the typing cursor after both conditions are true:
  - [ ] The backend stream completed.
  - [ ] The local buffer is empty.

### Phase 5: Thinking-to-Typing Handoff

- [ ] Define row-level states:
  - [ ] `idle`
  - [ ] `thinking`
  - [ ] `transitioning`
  - [ ] `typing`
  - [ ] `complete`
- [ ] Keep the thinking/tool box visible while steps are still the only content.
- [ ] When the first content token arrives and steps exist, move to `transitioning`.
- [ ] During `transitioning`, enqueue tokens but do not render typed characters yet.
- [ ] Collapse the thinking box with a CSS class such as `.thinking-process-box.collapsing-out`.
- [ ] Prefer a `transitionend` listener to know when typing may begin.
- [ ] Add a timeout fallback matching the transition duration in case `transitionend` does not fire.
- [ ] After the transition completes, switch to `typing` and start draining the buffer.
- [ ] If no thinking steps exist, start typing immediately when the first token arrives.

### Phase 6: Cursor and Bubble Polish

- [ ] Add `.typing-active` to the active assistant row only while local typing is in progress.
- [ ] Use a CSS pseudo-element for the blinking cursor.
- [ ] Ensure the cursor does not appear on historical assistant messages.
- [ ] Add a subtle one-time bubble entrance animation for newly inserted rows.
- [ ] Keep animation distances small to avoid layout jumps.
- [ ] Respect reduced-motion preferences with `@media (prefers-reduced-motion: reduce)`.

### Phase 7: `AiFormat` Rendering Strategy

- [ ] Review `AiFormat` before adding a `MutationObserver`; it currently replaces the host `innerHTML` on every content change.
- [ ] Avoid a naive observer that re-animates all parsed nodes every token.
- [ ] Preferred approach:
  - [ ] Add a stable wrapper or marker strategy so only newly created top-level blocks receive `.node-fade-in`.
  - [ ] Track previously rendered top-level block count or content signature.
  - [ ] Apply fade-in only to newly completed block-level nodes.
- [ ] If that is too much for the first pass, defer block fade-in and ship the typewriter/cursor first.
- [ ] Keep all generated HTML sanitized or escaped at least as safely as the current parser does.
- [ ] Remove inline style expansion from new work; use existing design tokens and classes where possible.

### Phase 8: Auto-Scroll Refinement

- [ ] Update `AutoScrollBottomDirective` so only one animation-frame scroll can be pending at a time.
- [ ] Keep the existing `MutationObserver`, but coalesce rapid mutations.
- [ ] Consider scrolling only when the user is already near the bottom.
- [ ] Do not forcibly pull the viewport down if the user has intentionally scrolled upward.
- [ ] Add or verify `scroll-behavior: smooth` on the chat history viewport.

### Phase 9: Parent Stream State

- [ ] Keep `Chat.sendMessage()` responsible for creating the user message and empty assistant message.
- [ ] Add explicit active assistant stream metadata if needed:
  - [ ] Active assistant index or id.
  - [ ] Network stream status: `streaming`, `completed`, `errored`.
- [ ] On token events, continue updating canonical content so persistence and final state stay simple.
- [ ] On step events, continue appending steps to the active assistant message.
- [ ] On error, stop local typing and show the error content cleanly.
- [ ] On route/session change, clear active stream metadata.

### Phase 10: Verification

- [ ] Ask a simple prompt with no tool usage.
  - [ ] No thinking box appears.
  - [ ] Text types smoothly.
  - [ ] Cursor disappears when complete.
- [ ] Ask a prompt that triggers tool steps.
  - [ ] Thinking/tool box appears.
  - [ ] First answer token triggers a smooth transition.
  - [ ] Typing starts only after the transition completes.
- [ ] Stream a long answer.
  - [ ] The buffer does not fall behind indefinitely.
  - [ ] Flush mode drains quickly after network completion.
  - [ ] Scrolling remains smooth.
- [ ] Load an existing session.
  - [ ] Historical messages render instantly.
  - [ ] No typewriter animation replays for history.
- [ ] Switch sessions during an active response.
  - [ ] Timers are cleaned up.
  - [ ] No errors appear in the console.
- [ ] Test Markdown-heavy output.
  - [ ] Lists, headings, tables, inline code, and code blocks still render correctly.
- [ ] Run the frontend build.

## Risk Notes

- The largest UX risk is a race between the thinking-box collapse and the first typed characters. The row component should own that handoff.
- The largest technical risk is repeatedly replacing `innerHTML` in `AiFormat`; block-level fade-in should not be added until the rendering strategy is stable.
- Typewriter animation should never delay the final answer excessively. Flush mode is required, not optional.
- Timer cleanup must be handled inside the child component to avoid leaks when navigating between sessions.

## Suggested First Implementation Slice

Start with the smallest slice that proves the architecture:

- [ ] Extract `ChatMessageComponent`.
- [ ] Render static messages exactly as before.
- [ ] Add local typewriter rendering only for the latest loading assistant message.
- [ ] Add flush mode and cursor.
- [ ] Coalesce auto-scroll frames.
- [ ] Verify simple and long streams.

After that works, add thinking-box transition coordination and block-level fade-in as separate follow-up slices.
