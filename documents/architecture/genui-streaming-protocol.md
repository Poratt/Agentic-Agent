# GenUI Streaming Protocol Reference

## Event Types

The backend streams newline-delimited JSON lines to the frontend via `POST /admin-agent/query-stream`.

| Event Type | JSON Shape | Description |
| --- | --- | --- |
| `step` | `{ type: "step", icon: string, message: string }` | A tool execution step notification. Icon is a Phosphor icon class. Message is a Hebrew status description. |
| `token` | `{ type: "token", content: string }` | A single text chunk from the LLM streaming response. Content is a partial string to append to the assistant message. |
| `done` | Stream ends (no explicit event) | The HTTP response body ends. The frontend detects this via the ReadableStream `done` flag. |

## Producer/Consumer Flow

```
Backend                              Frontend
──────                              ────────
AdminAgentService                   ChatService.sendMessageStream()
  .queryDatabaseStream()              subscribes via fetch + ReadableStream
  │                                   │
  ├─ saveMessage(user)                │
  ├─ LLM tool calls loop              │
  │   ├─ yield {step} ──────────────► │ observer.next({step})
  │   ├─ execute tools                │   → messages.update(steps)
  │   └─ yield {step} ──────────────► │
  │                                   │
  └─ LLM stream loop                  │
      ├─ yield {token} ──────────────►│ observer.next({token})
      ├─ yield {token} ──────────────►│   → pendingTokenBuffer.push()
      ├─ ...                           │   → scheduleTokenFlush() [rAF]
      └─ yield {token} ──────────────►│
                                       │
Stream ends ─────────────────────────►│ observer.complete()
                                       │   → flushPendingTokens()
                                       │   → loading.set(false)
```

## Frontend Rendering Pipeline

```
Token arrives in Chat component
  │
  ├─ Buffered in pendingTokenBuffer (rAF-coalesced)
  │
  ├─ flushPendingTokens() joins buffer → messages.update()
  │
  ├─ ChatMessage.syncContent effect detects new content
  │   ├─ Prose mode: queued into per-character queue (18-35ms delays)
  │   └─ Component mode: flushed in large chunks (0ms delay)
  │
  └─ AiFormat.ngOnChanges
      ├─ extractComponentParts() → final render if closed fence
      ├─ extractProgressiveComponentParts() → progressive preview
      │   ├─ sanitizeProgressiveComponentHtml() → safe partial HTML
      │   └─ scheduleProgressivePreview() [rAF-throttled]
      └─ parse() → markdown rendering
```

## GenUI Component Lifecycle

```
1. Skeleton:  ```component detected, no renderable HTML yet
2. Preview:   Partial HTML arrives, sanitizeProgressiveComponentHtml() returns non-empty
3. Update:    Each rAF tick replaces previewHost.innerHTML with latest sanitized partial
4. Finalize:  Closing ``` arrives → renderComponentResponse() replaces preview with final
```

## Notes

- The protocol is newline-delimited JSON, not SSE. Each line is a complete JSON object.
- The frontend `ChatService` parses each line and emits parsed objects via the Observable.
- The `AbortController` cancels the fetch on stream stop or route change.
- Backend logs include `firstTokenMs`, `totalMs`, token count, and component count per stream.
