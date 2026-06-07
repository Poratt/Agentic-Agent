# AgentInstruction Endpoint Recommendations

## Scope

בדקתי את כל נקודות הקצה הקיימות בשרת:

- `backend/src/app.controller.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/explorer/explorer.controller.ts`
- `backend/src/modules/admin-agent/admin-agent.controller.ts`

המטרה: לזהות איפה כדאי להוסיף `agentInstruction`, ומה הייתי שם בתוכן שלו.

## Recommendation Summary

כדאי להוסיף `agentInstruction` רק לנקודות שבהן הסוכן אמור להפוך תוצאת API לתגובה שימושית למשתמש.

לא כדאי להוסיף `GENUI_HTML(...)` לכל endpoint באופן אוטומטי. ב-Auth, Health ו-Stream יש סיכון שהסוכן ינסה לייצר UI במקום לבצע פעולה פשוטה או יבלבל חוזה סטרים.

## Already Covered

| Endpoint | Current Status | Recommendation |
|---|---|---|
| `GET /users` | already has `agentInstruction` | להשאיר |
| `GET /users/me` | already has `agentInstruction` | להשאיר, אבל לשקול טקסט מדויק יותר כי זה JWT payload ולא פרופיל DB מלא |
| `GET /users/:id` | already has `agentInstruction` | להשאיר |
| `GET /explorer/weather` | already has `agentInstruction` | להשאיר |

## Add AgentInstruction

### `GET /explorer/status`

Why: זה endpoint תצוגתי מובהק. הוא מחזיר מדדי מערכת, ולכן מתאים לכרטיס סטטוס.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a compact system status dashboard with metric cards for total users, active sessions, and Swagger status. Use clear success/warning visual states.'
),
```

### `PATCH /users/:id`

Why: אחרי עדכון משתמש, הסוכן צריך להציג למשתמש מה השתנה ולא להמשיך לבצע פעולות נוספות.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render an updated user profile card. Highlight the user id, full name, email, numeric role label, and updatedAt timestamp. Make it clear the profile fields were updated successfully.'
),
```

### `DELETE /users/:id`

Why: פעולה בלתי הפיכה. אחרי ביצוע המחיקה חשוב לתת אישור קצר וברור, לא טבלה או פרופיל.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a destructive-action confirmation card. Show that the user was permanently deleted, include the deleted flag if present, and do not imply the user can be restored.'
),
```

### `PATCH /users/:id/role`

Why: שינוי role הוא פעולה רגישה. התוצאה צריכה להדגיש role חדש ואת משמעות המספרים.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a role-change confirmation card. Show the user id, email, full name, and new role. Translate numeric roles as 1 = Admin and 2 = User, while preserving the numeric value.'
),
```

### `GET /admin-agent/sessions`

Why: endpoint תצוגתי לרשימת סשנים. הסוכן יכול להציג רשימה קומפקטית ולכוון את המשתמש לבחור סשן.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a compact chat sessions list. Show each session title, id, createdAt, and updatedAt. Sort visually by updatedAt when possible and make the session id easy to copy or reference.'
),
```

### `GET /admin-agent/sessions/:id/messages`

Why: endpoint תצוגתי להיסטוריית שיחה. הסוכן צריך להציג timeline ולא לערבב הודעות tool פנימיות.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a chat transcript timeline. Group messages by role, show user prompts and assistant replies clearly, include createdAt timestamps, and keep long message content readable with wrapping.'
),
```

### `POST /admin-agent/sessions`

Why: יצירת סשן היא פעולה קצרה, אבל התוצאה כן שימושית להצגה. עדיף אישור מינימלי.

Suggested content:

```ts
agentInstruction: GENUI_HTML(
  'Render a small new-session confirmation card. Show the new session id, title, createdAt, and updatedAt. Keep the output concise.'
),
```

### `DELETE /admin-agent/sessions/:id`

Why: פעולה מוחקת. גם אם התגובה היא `204`, ההוראה יכולה למנוע מהסוכן להמציא payload.

Suggested content:

```ts
agentInstruction:
  'After this tool succeeds, do not invent response data. Tell the user that the chat session was permanently deleted and mention the requested session id.',
```

## Optional / Low Value

### `POST /auth/register`

Recommendation: בדרך כלל לא הייתי מוסיף. זה public auth flow ולא כלי תצוגה רגיל לסוכן ניהול.

If you still want one:

```ts
agentInstruction:
  'After successful registration, summarize that the account was created. Do not mention or display the password. If user data is returned, show only public fields.',
```

### `POST /auth/login`

Recommendation: לא להוסיף בדרך כלל. הטוקנים נכתבים ל-HTTP-only cookies, והסוכן לא צריך לדבר עליהם.

If you still want one:

```ts
agentInstruction:
  'After successful login, confirm the user is authenticated. Do not display, infer, or discuss access tokens, refresh tokens, cookies, or password values.',
```

### `POST /auth/refresh`

Recommendation: לא להוסיף. זה endpoint תשתיתי לחידוש session, לא UI או פעולה שהמשתמש צריך לראות.

If you still want one:

```ts
agentInstruction:
  'After successful refresh, only state that the authenticated session was refreshed. Do not display or discuss token values.',
```

### `POST /auth/logout`

Recommendation: אפשרי, אבל לא קריטי.

Suggested content if added:

```ts
agentInstruction:
  'After successful logout, confirm that the user was logged out and the active session was invalidated. Keep the response short.',
```

### `GET /auth/me`

Recommendation: אפשר להוסיף אם הסוכן משתמש ב-auth endpoints ישירות. אחרת `GET /users/me` כבר מכסה תצוגת משתמש.

Suggested content if added:

```ts
agentInstruction: GENUI_HTML(
  'Render a compact authenticated-user card from the JWT payload. Show sub, email, role, issued-at, and expiration. Make clear this is token payload data, not a full database profile.'
),
```

### `GET /`

Recommendation: לא להוסיף. זה health check בסיסי ולא כלי עסקי.

If added anyway:

```ts
agentInstruction:
  'Use this only as a connectivity check. Return a short sentence confirming the API is reachable.',
```

## Do Not Add

### `POST /admin-agent/query-stream`

Reason: זה endpoint הסטרים של הסוכן עצמו. הוספת `agentInstruction` כאן יכולה לבלבל את חוזה הסטרים, כי התגובה היא newline-delimited stream events ולא payload רגיל להצגה.

Recommendation:

```ts
// Do not add agentInstruction here.
```

## Priority Order

1. `GET /explorer/status`
2. `PATCH /users/:id`
3. `PATCH /users/:id/role`
4. `DELETE /users/:id`
5. `GET /admin-agent/sessions`
6. `GET /admin-agent/sessions/:id/messages`
7. `POST /admin-agent/sessions`
8. `DELETE /admin-agent/sessions/:id`

## Implementation Note

אם מיישמים את זה בקוד, הייתי משאיר את רוב הוראות התצוגה דרך `GENUI_HTML(...)`, אבל משתמש ב-string רגיל עבור endpoints שאין להם body להצגה או שבהם אסור להמציא מידע, כמו `DELETE /admin-agent/sessions/:id`.

## Verification

המסמך נבנה מקריאה של כל ה-controllers וה-DTOs הרלוונטיים. לא בוצע שינוי בקוד השרת.

## Agent Checklist By Module

### Agent 1 - Explorer Module

Owner: `backend/src/modules/explorer/explorer.controller.ts`

- [x] Add `agentInstruction` to `GET /explorer/status`.
- [x] Use `GENUI_HTML(...)` with the status-dashboard instruction from this document.
- [x] Keep existing `GET /explorer/weather` instruction unchanged.
- [x] Verify Swagger still exposes `toolIcon`, `summaryHe`, and `agentInstruction` for both Explorer tools.

### Agent 2 - Users Module

Owner: `backend/src/modules/users/users.controller.ts`

- [x] Add `agentInstruction` to `PATCH /users/:id`.
- [x] Add `agentInstruction` to `DELETE /users/:id`.
- [x] Add `agentInstruction` to `PATCH /users/:id/role`.
- [x] Keep existing instructions on `GET /users`, `GET /users/me`, and `GET /users/:id`.
- [x] Consider tightening `GET /users/me` wording so it says JWT payload, not full DB profile.
- [x] Verify destructive and role-change instructions do not imply rollback or hidden fields.

### Agent 3 - Admin Agent Sessions Module

Owner: `backend/src/modules/admin-agent/admin-agent.controller.ts`

- [x] Add `agentInstruction` to `GET /admin-agent/sessions`.
- [x] Add `agentInstruction` to `GET /admin-agent/sessions/:id/messages`.
- [x] Add `agentInstruction` to `POST /admin-agent/sessions`.
- [x] Add a plain string `agentInstruction` to `DELETE /admin-agent/sessions/:id`.
- [x] Do not add `agentInstruction` to `POST /admin-agent/query-stream`.
- [x] Verify the delete-session instruction does not invent a response body for `204`.

### Agent 4 - Auth Module

Owner: `backend/src/modules/auth/auth.controller.ts`

- [x] Leave `POST /auth/register` without `agentInstruction` unless product explicitly wants auth-result narration.
- [x] Leave `POST /auth/login` without `agentInstruction` unless product explicitly wants auth-result narration.
- [x] Leave `POST /auth/refresh` without `agentInstruction`.
- [x] Optionally add short plain string instruction to `POST /auth/logout`.
- [x] Optionally add `GENUI_HTML(...)` to `GET /auth/me` only if the agent actively uses this endpoint.
- [x] Verify no auth instruction mentions access tokens, refresh tokens, cookies, or password values.

### Agent 5 - App / Health Module

Owner: `backend/src/app.controller.ts`

- [x] Leave `GET /` without `agentInstruction`.
- [x] If a product decision requires one, use only the short connectivity-check instruction from this document.
- [x] Verify the health endpoint remains clearly separate from business tools.

### Agent 6 - Final Integration

Owner: cross-module review

- [x] Run backend build/test after controller changes.
- [x] Regenerate `backend/swagger-spec.json` if the project workflow requires it for Swagger metadata changes.
- [x] Search Swagger output for every newly added `agentInstruction`.
- [x] Confirm no endpoint has duplicated or conflicting `agentInstruction`.
- [x] Confirm `POST /admin-agent/query-stream` still has no `agentInstruction`.
- [x] Confirm instructions use `GENUI_HTML(...)` only where the endpoint returns normal data suitable for display.
