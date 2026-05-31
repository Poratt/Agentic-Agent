# Thinking UX Cleanup

## Summary

Make the chat thinking process useful instead of repetitive. The UI should stay quiet for normal answers and expose operational details only when the agent actually uses tools.

## Key Changes

- Backend streaming emits `step` events only for real tool activity: tool start, tool success, and tool error.
- Static technical steps such as session init, title analysis, generic thinking, and finalizing are not sent to the frontend.
- `STEP_ICONS` only keeps icons for meaningful tool states: `tool`, `error`, and `success`.
- Frontend keeps storing streamed steps as `{ icon, message }`.
- The thinking details box appears only when an assistant message has tool steps.
- The details summary copy is tool-focused: `פעולות שבוצעו...`.
- The summary icon animation stays limited to the latest loading assistant response.
- The expand arrow keeps its open/close rotation transition.

## Test Plan

- Ask a simple question that does not require tools:
  - No thinking details box appears.
  - Response tokens stream normally.
  - No static technical steps are visible.

- Ask a request that triggers one or more tool calls:
  - The details box appears.
  - It includes only tool-related steps.
  - The expand arrow rotates smoothly on open and close.
  - The summary icon animates only while the latest response is loading.

- Run backend and frontend builds:
  - Backend build should pass.
  - Frontend build should pass.
  - The existing `chat.css` budget warning may remain.

## Assumptions

- The preferred UX is quiet by default.
- Tool activity is the only thinking detail worth showing to users.
- The existing stream event shape `{ type: 'step', icon, message }` remains valid.
