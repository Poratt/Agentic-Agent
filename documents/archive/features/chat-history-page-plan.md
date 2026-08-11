# Chat History Page Action Plan

## Goal

Move full chat history management out of the modal dialog and into a dedicated page.

The current dialog works as a quick picker, but it now handles search, deletion, and delete confirmation. That makes it behave like a management screen inside a small modal. A dedicated page is a better fit for browsing, searching, deleting, and future history actions.

## Current State

- `MainSidebar` opens `AllSessionsDialog` through PrimeNG `DialogService`.
- The sidebar shows up to five recent sessions inline.
- The dialog lists all sessions, supports search, lets the user select a session, and has inline delete confirmation.
- Session selection navigates to `/chat?sessionId=:id`.
- Deleting a session uses `ChatStore.deleteSession(sessionId)`.
- The backend API already supports listing and deleting sessions; no API change is needed.

## Target UX

- Keep the sidebar focused:
  - Main chat link: `/chat`.
  - Recent sessions remain nested under the chat link.
  - "All conversations" becomes navigation to `/chat/history`, not a dialog opener.
- Add a dedicated chat history page:
  - Route: `/chat/history`.
  - Full-width page layout inside the authenticated app shell.
  - Search input at the top.
  - Session list below, optimized for scanning.
  - Clicking a session opens `/chat?sessionId=:id`.
  - Deleting a session uses the same inline confirmation pattern already added to the dialog.
- Do not change chat streaming behavior, message loading, session creation, or backend contracts.

## Implementation Checklist

### Phase 1: Add `ChatHistory` Page
- [x] Create `frontend/src/app/features/chat/chat-history/chat-history.ts`.
- [x] Create `chat-history.html` and `chat-history.css`.
- [x] Make the component standalone.
- [x] Inject `ChatStore` and `Router` with `inject()`.
- [x] Use local signals for:
  - [x] `searchQuery`.
  - [x] `pendingDeleteSessionId`.
- [x] Add a computed `filteredSessions` list using `ChatStore.sessions()`.
- [x] Load sessions on page initialization if the store is empty.
- [x] Keep all text and layout RTL-compatible.

### Phase 2: Route and Sidebar
- [x] Add route `/chat/history` in `app.routes.ts`.
- [x] Replace `openAllSessionsDialog()` usage in `main-sidebar.html` with a router link to `/chat/history`.
- [x] Remove `DialogService`, `DynamicDialogRef` flow, and `AllSessionsDialog` imports from `MainSidebar` if they become unused.
- [x] Keep recent session links unchanged.
- [x] Preserve existing navigation to `/chat?sessionId=:id` when selecting a session.

### Phase 3: History Page UI
- [x] Use existing global button classes: `transparent-btn`, `danger-btn`, `icon-only`.
- [x] Use design tokens only; no hardcoded colors, spacing, radii, or shadows.
- [x] Build a page header with title and short subtitle.
- [x] Add search input with an icon.
- [x] Render each session row with:
  - [x] Chat icon.
  - [x] Title.
  - [x] Updated date.
  - [x] Active state when `currentSessionId()` matches the row id.
  - [x] Delete action.
- [x] Add empty states for:
  - [x] No sessions.
  - [x] No search results.
- [x] Keep delete confirmation inline inside the row:
  - [x] Show warning copy.
  - [x] Provide cancel and delete buttons.
  - [x] Clear pending delete state after cancel or successful delete request.

### Phase 4: Remove or Retire Dialog
- [x] If no code still references `AllSessionsDialog`, delete:
  - [x] `all-sessions-dialog.ts`.
  - [x] `all-sessions-dialog.html`.
  - [x] `all-sessions-dialog.css`.
- [x] If PrimeNG `DialogService` becomes unused across the app, remove it from the provider list only after confirming no other dialog depends on it.
- [x] Do not remove PrimeNG dialog styling or config unless it is clearly unused.

### Phase 5: Verification
- [x] Build frontend.
- [x] Open `/chat/history`.
- [x] Verify sessions load.
- [x] Search by title.
- [x] Open a session and confirm navigation to `/chat?sessionId=:id`.
- [x] Delete a non-active session.
- [x] Delete the active session and confirm the app returns to `/chat`.
- [x] Verify recent sessions still appear in the sidebar.
- [x] Verify no default browser `confirm()` is used for chat history deletion.

## Risk Notes

- The main behavior risk is accidental removal of quick recent-session navigation from the sidebar. Keep it unchanged.
- The main code risk is deleting the dialog component before all references are removed. Search the project before deletion.
- Avoid turning this into a broader chat refactor. This is a navigation and layout change only.

## Assumptions

- The dedicated route should be `/chat/history`.
- The backend session API remains unchanged.
- The inline delete confirmation already added to the dialog is the preferred confirmation pattern.
- The old dialog should be removed once the page replaces it fully.
