# C5 — Confirmation Flow מת: אבחון מלא + תוכנית ביצוע

> סטטוס: **אבחון הושלם (read-only, 2026-08-05). ביצוע טרם התחיל.**
> מסמך זה הוא נקודת ההמשך המדויקת לסשן הבא — אין צורך לאבד הקשר.

---

## 1. התמונה הגדולה

המערכת כוללת מנגנון "אישור פעולות מסוכנות" (dangerous-action confirmation): כשה-LLM מבקש
למחוק משתמש / לשנות רול / לנקות תוצאות בדיקה — הפעולה אמורה להיכנס למצב `pending` ולחכות
לאישור אנושי דרך ה-UI, במקום להתבצע מיד.

**המנגנון בפועל מת לגמרי:** `@RequiresConfirmation()` כותב metadata למקום אחד, ה-parser קורא
ממקום אחר, והפער אף פעם לא גושר. כל הפעולות המסוכנות מתבצעות מיד ללא אישור.

---

## 2. השרשרת המלאה — איפה היא נשברת

```
@RequiresConfirmation() → SetMetadata('requires_confirmation', true)
        ↓
main.ts:30-33  SwaggerModule.createDocument(app, config)   ← בלי plugin, בלי options
        ↓
swagger-spec.json → grep 'x-requires-confirmation' = 0 מופעים   ← ★ השבר כאן ★
        ↓
swagger-tools.parser.ts:329  op['x-requires-confirmation'] === true → תמיד false
        ↓
requiresConfirmationOps = ∅ (Set ריק)
        ↓
agent-tool-executor.service.ts:51-52  isDangerousOperation() → תמיד false
        ↓
שורה 277: השער `if (dangerous && !hasPendingConfirmation(...))` אף פעם לא נכנס
        ↓
UsersController_delete / updateRole / cleanupTestResults → מתבצעים מיד, בלי אישור
```

### שורש הבעיה (mismatch בין שני מנגנונים)

| | מה | איפה |
|---|---|---|
| ה-decorator כותב | `SetMetadata('requires_confirmation', true)` → **Reflector metadata** | `decorators/requires-confirmation.decorator.ts:5` |
| ה-parser קורא | `op['x-requires-confirmation'] === true` → **swagger-spec.json** | `services/swagger-tools.parser.ts:329` |

**רמז לכוונה מקורית:** `Reflector` מוזרק ל-`SwaggerToolsParser` (קונסטרקטור שורה 41) אבל
**אף פעם לא נעשה בו שימוש** (`grep this.reflector` → רק הבנאי). מישהו התחיל לחבר את ה-Reflector
ולא סיים. הערה: ה-parser קורא את ה-spec מקובץ (`./swagger-spec.json`) ומרענן לפי mtime — הוא
אינו פועל מול ה-instances בזמן ריצה.

### נתיב נוסף שקיים ונפרד (לא מושפע מהבאג)
ה-MCP bridge משתמש ב-`requiresConfirmation` **מקובץ config** (`mcp-bridge.config.ts`) — לא דרך
swagger. המנגנון הזה עובד, אבל רלוונטי רק לכלי MCP, לא לכלי swagger.

---

## 3. רשימת ה-endpoints המלאה שמסומנים `@RequiresConfirmation()` (3)

| operationId | endpoint | מיקום בקוד |
|---|---|---|
| `UsersController_delete` | DELETE /users/:id | `users.controller.ts:142-144` |
| `UsersController_updateRole` | PATCH /users/:id/role | `users.controller.ts:164-167` |
| `LlmProviderController_cleanupTestResults` | POST /llm-provider/cleanup-test-results | `llm-provider.controller.ts:100` |

אומת ב-swagger-spec.json: כל השלושה קיימים בלי `x-requires-confirmation` (`None`).

**זהירות להמשך:** חיפוש `grep "@RequiresConfirmation()"` הוא השיטה הנכונה למצוא את כל השימושים.
בזמן האבחון נמצאו בדיוק 3. אם בביצוע מתווסף endpoint חדש — להגדיל את ה-assert (סעיף 5).

---

## 4. H3 — Self-confirmation (קשור ישירות, חייב להיסגר יחד)

- `AdminAgentController_confirmAction` (POST /admin-agent/confirm-action) **מופיע ב-swagger-spec** →
  נטען ע"י `getTools()` בלי שום filter → **ה-LLM עצמו מקבל את הכלי "אשר פעולה"**.
- בדיקת הבעלות ב-`admin-agent.controller.ts:323` משווה `ownership.userId !== req.user.sub` —
  וזה **אותו משתמש**, כי ה-token שייך לו. המודל הפועל בשם המשתמש יכול לאשר את הפעולה
  ההרסנית שלו עצמו.
- **מסקנה: תיקון C5 לבדו לא סוגר את H3.** חייבים גם לחסום את `confirmAction` מה-LLM.

---

## 5. גישות תיקון שנבדקו

### גישה A — `@ApiExtension` (מינימלי)
ב-decorator: בנוסף ל-`SetMetadata`, לקרוא גם ל-`ApiExtension('x-requires-confirmation', true)`.
`@nestjs/swagger` מייצא extension כזה אוטומטית ל-spec כ-`x-requires-confirmation`.

- ✅ יתרון: שינוי בקובץ אחד; parser/executor לא נוגעים; 0 שינוי התנהגותי.
- ⚠️ חיסרון: מסתמך על נוהל serialization של swagger — **בדיוק ההנחה השגויה שגרמה לבאג המקורי**.
  אומת: `ApiExtension` קיים ופונקציונלי (`typeof === 'function'`) ב-`@nestjs/swagger@11.4.4`,
  אבל זה לא מבטיח שההתנהגות תישאר בין גרסאות.

### גישה B — DiscoveryService registry
ב-bootstrap: `getControllers()` + `getMetadataByDecorator()`, לבנות `Map<operationId, true>`
ולהזריק ל-parser (או לכתוב ישירות ל-`requiresConfirmationOps`).

- ✅ יתרון: מקור אמת יחיד = ה-metadata עצמו; לא תלוי ב-serialization של swagger.
- ⚠️ חיסרון: צריך לחשב operationId בעצמנו (תלוי בנומנקלטורת Nest: `ControllerName_method`);
  שינוי גדול יותר; `DiscoveryService` זמין אבל לא מחובר כרגע.

### גישה C — Hybrid מלא
A + B: גם מייצאים ל-spec (לשקיפות) וגם בונים registry ב-boot + assertion.

- ✅ יתרון: העמיד ביותר.
- ⚠️ חיסרון: הכי הרבה קוד; סביר ש-over-engineering לשלב הזה.

---

## 6. ההמלצה הסופית — Hybrid מינימלי (גישה A + boot assertion)

**לא A טהורה** — כי החיסרון של A ("מסתמך על serialization") הוא בדיוק מה שגרם לבאג.
ההמלצה: ליישם A, **ובנוסף** assertion קטן ב-boot שמונע כישלון שקט בעתיד:

### תוכנית ביצוע (לסשן הבא, בסדר הזה)

1. **תיקון decorator (A):**
   `backend/src/modules/admin-agent/decorators/requires-confirmation.decorator.ts`
   — לקרוא גם ל-`ApiExtension('x-requires-confirmation', true)` בנוסף ל-`SetMetadata(...)`.

2. **Boot assertion (הגנת regression):**
   במקום כלשהו ב-`onModuleInit`/bootstrap (למשל ב-`SwaggerToolsParser.onModuleInit` או
   ב-`AdminAgentService.onModuleInit` הקיים): לספור ב-swagger-spec את ה-operations
   עם `x-requires-confirmation === true`, ולהשוות למספר הצפוי (3). אם לא תואם —
   **לזרוק שגיאה ב-boot**, לא להיכשל בשקט.
   - זה המנגנון שהיה מונע את הבאג מלכתחילה אילו היה קיים.
   - מגן נגד: endpoint מסוכן חדש בלי decorator, או שינוי התנהגות בגרסת swagger.

3. **חסימת `confirmAction` מה-LLM (סגירת H3):**
   ב-`backend/src/modules/admin-agent/admin-agent.service.ts` `getTools()` — לסנן את
   `AdminAgentController_confirmAction` מרשימת הכלים (exclude list). ה-UI האנושי ממשיך
   לקרוא ל-`/admin-agent/confirm-action` ישירות.

4. **בדיקות:**
   - DELETE /users/:id דרך ה-LLM בלי אישור → אמור להחזיר `CONFIRMATION_REQUIRED` +
     actionId, וליצור pending action (לא למחוק).
   - אישור מפורש דרך ה-UI (`/admin-agent/confirm-action` עם actionId + confirmed:true)
     → הפעולה מתבצעת.
   - אישור דרך ה-LLM → חסום (H3).
   - Boot assertion: להריץ את האפליקציה, לוודא שלא נזרקת שגיאה כשהמספר תואם (3).

---

## 7. עובדות מאומתות (אבחון)

- `grep -c "x-requires-confirmation" backend/swagger-spec.json` → **0**
- שלושת ה-operationIds קיימים ב-spec עם `x-requires-confirmation: None`
- `Reflector` מוזרק ל-parser (שורה 41) ולא בשימוש
- `ApiExtension` זמין: `typeof require('@nestjs/swagger').ApiExtension === 'function'` (v11.4.4)
- `DiscoveryService` זמין ב-`@nestjs/core/discovery` (boot לוג `DiscoveryModule dependencies initialized`)
- ה-frontend מוכן: `pendingConfirmation` signal + `confirmAction()` קיים ב-`chat.ts:569`
- ה-MCP bridge משתמש ב-config משלו (`mcp-bridge.config.ts`) — לא מושפע
- `AdminAgentController_confirmAction` ב-spec → נטען ככלי ל-LLM (H3 פתוח)

---

## 8. קבצים רלוונטיים

| קובץ | תפקיד |
|---|---|
| `backend/src/modules/admin-agent/decorators/requires-confirmation.decorator.ts` | הדקורטור (לתיקון) |
| `backend/src/main.ts:30-33` | בניית swagger spec |
| `backend/src/modules/admin-agent/services/swagger-tools.parser.ts` | קורא spec כ-tools (Reflector לא בשימוש) |
| `backend/src/modules/admin-agent/services/agent-tool-executor.service.ts:277` | שער ה-confirmation |
| `backend/src/modules/admin-agent/admin-agent.service.ts:44-52` | `getTools()` — לחסום confirmAction כאן |
| `backend/src/modules/admin-agent/admin-agent.controller.ts:289-394` | `confirm-action` endpoint + ownership (H3) |
| `backend/src/modules/users/users.controller.ts:142-167` | 2 מתוך 3 ה-endpoints המסומנים |
| `backend/src/modules/llm-provider/llm-provider.controller.ts:100` | ה-endpoint השלישי |
