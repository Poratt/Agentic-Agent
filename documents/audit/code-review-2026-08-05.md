# סקירת קוד (Code Review) — agentic-admin

|                |                                                                                   |
| -------------- | --------------------------------------------------------------------------------- |
| **תאריך**      | 2026-08-05                                                                        |
| **סקופ**       | כל ה-backend (`backend/src`), כל ה-frontend (`frontend/src/app`)                  |
| **שיטה**       | סקירה ידנית + 4 סוכני סקירה מקבילים (general-purpose) עם אימות עצמי של ממצאי מפתח |
| **סטטוס**      | טיוטה לגיבוש — כל ממצא עם קובץ:שורה ניתן לאימות עצמי                              |
| **הערת תיקון** | לא בוצעו שינויים בקוד במהלך הסקירה                                                |

---

## סיכום ניהולי (Executive Summary)

המערכת בנויה היטב מבחינת מבנה (modules ברורים, DTOs, guards, signal stores), אך קיימים **מספר חורים קריטיים באבטחה** שחייבים טיפול לפני כל חשיפה מעבר ל-localhost:

1. **כל משתמש מחובר יכול לקרוא את מפתחות ה-API של ספקי ה-LLM ולשנות את הגדרות הספקים** (כולל `baseUrl` ו-`apiKey`) — זה מאפשר גניבת מפתחות מלאה + SSRF פנימי. ← **הכי דחוף**.
2. **מנגנון אישור הפעולות המסוכנות (Confirmation Flow) של הסוכן לא פעיל בפועל** — ה-decorator `@RequiresConfirmation()` לא מגיע ל-swagger spec, ולכן כל פעולה הרסנית שהמודל מבקש לבצע מתבצעת ללא אישור אנושי.
3. **Google Calendar: כל הנתיבים ללא אימות כלל** (ללא guards), כולל חשיפת `refresh_token` בתשובה.
4. **SSRF בכמה מוקדים**: `extendVideo` (sourceVideoUrl), `baseUrl` של ספקים, והזרקת ערכים גולמיים לנתיבי URL פנימיים בסוכן.
5. **פרונטאנד**: race condition ב-refresh שגורם להתנתקויות אקראיות, אין route guard לפי רול, ופרופיל המשתמש (`/auth/me`) מחזיר `JwtPayload` בעוד הסטור מצפה ל-`User` (מקור לבאגים שקטים).

**סה"כ: 6 Critical, 8 High, 22 Medium, ~36 Low/Info.**

---

## טבלת סיכום לפי חומרה

| חומרה         | כמות | תחומים עיקריים                                                                 |
| ------------- | ---- | ------------------------------------------------------------------------------ |
| 🔴 Critical   | 6    | מפתחות API, SSRF, אישור פעולות מת, Google Calendar, הרשאות ספקים               |
| 🟠 High       | 8    | אנאום משתמשים, הרשאות כתיבה, self-confirm של LLM, race ב-refresh, route guards |
| 🟡 Medium     | 22   | SSE/ניתוקים, MCP, throttling, AiFormat, cookies, סטורס, ניהול זכרון            |
| 🟢 Low / Info | ~36  | dead code, קונבנציות, ביצועים, נראות                                           |

---

## ממצאים קריטיים (Critical)

### C1 — מפתחות API של ספקי LLM חשופים לכל משתמש מחובר

- **מיקום**: `backend/src/modules/llm-provider/llm-provider.controller.ts:38-40` (`GET /llm-provider`), `entities/llm-provider.entity.ts:18-19` (`apiKey` plaintext), `llm-provider.service.ts:121-136` (`findProviders` מחזיר entity מלא)
- **קטגוריה**: אבטחה (חשיפת credentials) — ✅ אומת בעצמי
- **תיאור**: ה-controller מוגן רק ב-`@UseGuards(JwtAuthGuard)` (שורה 21). ה-entity חושף את `apiKey` ללא `select: false` וללא DTO שמסכה אותו. כל משתמש עם JWT תקין מקבל את מפתחות ה-API החיים (OpenRouter, NVIDIA, Agnes — שמוזרקים מה-env ב-`seeds/llm-providers.seed.ts:68-69,98-99,132-133`). המפתחות מאוחסנים ב-DB כ-plaintext.
- **תיקון מוצע**: `select: false` על העמודה + החזרת ערך מוסתר (`sk-***`) ללקוח; הגבלת הגישה ל-admin; הצפנת המפתחות באחסון (AES-GCM עם מפתח מה-env).
- **השפעה**: השתלטות מלאה על כל חשבונות ה-LLM (חיוב, מכסות, שימוש לרעה) על ידי כל משתמש רשום.

### C2 — SSRF + גניבת `OPENAI_API_KEY` דרך `baseUrl` המגיע מ-DB

- **מיקום**: `backend/src/modules/llm/services/llm-client.service.ts:168-188` (יצירת OpenAI client), `234-247` (`getProviderConnection`), `297-318` (`fetch(${baseUrl}/images/generations)`), `376-384` (`fetch(${baseUrl}/videos)`), `552-558` (`fetch(${baseUrl}/agnesapi...)`); enabler: `llm-provider.controller.ts:21,30,47`
- **קטגוריה**: אבטחה (SSRF + הדלפת סוד) — ✅ אומת בעצמי
- **תיאור**: כל קריאת LLM יוצאת ל-`baseUrl` מהשורה ב-DB. כל משתמש יכול `POST /llm-provider` / `PATCH /llm-provider/:id` עם `baseUrl` שרירותי, ואז `POST /llm/image/generate` (עם `providerOverride`) שולח את השרת ל-`http://<מארח פנימי>/...` ומחזיר את התשובה ללקוח — SSRF מלא עם קריאת תשובה (metadata 169.254.169.254, פאנלים פנימיים וכו'). אין הגנות (ללא חסימת טווחים פרטיים, ללא allowlist של scheme, redirects כברירת מחדל). בנוסף: ב-`getClient` (שורה 182) `apiKey: dbProvider.apiKey ? ... : undefined` — ו-SDK של OpenAI (אומת ב-`node_modules/openai/client.js:73`) נופל ל-`readEnv('OPENAI_API_KEY')` כשמועבר `undefined` → **ה-API key הגלובלי נשלח לשרת של התוקף**.
- **תיקון מוצע**: (1) הגבלת יצירת/עדכון ספקים ל-admin; (2) ולידציית `baseUrl` ב-DTO + רמת שירות: רק `https://` (או `http://localhost` ל-Ollama), חסימת RFC1918/link-local/loopback; (3) אי-אפשרות ל-SDK ליפול ל-env key (להעביר `''` ולזרוק אם לספק ענן אין מפתח); (4) `redirect: 'manual'` עם ולידציה מחדש לכל hop.
- **השפעה**: השרת הופך ל-proxy פתוח לרשת הפנימית; המפתח של OpenAI יכול להיות מועבר לשרת של תוקף.

### C3 — SSRF + הורדה בלתי מוגבלת ב-`extendVideo` (`sourceVideoUrl`)

- **מיקום**: `backend/src/modules/llm/services/llm-client.service.ts:454-541` (`downloadBuffer` 534-541); DTO: `dto/extend-video.dto.ts:15-18` (רק `@IsString() @IsOptional()`)
- **קטגוריה**: אבטחה / ביצועים — ✅ אומת בעצמי
- **תיאור**: `extendVideo` מקבל `sourceVideoUrl` בשליטת המשתמש/LLM, ו-`fetch` אותו ישירות ללא ולידציית URL/IP, ללא מגבלת גודל (`res.arrayBuffer()` טוען הכל לזכרון), עם redirects. הפריים האחרון מוחזר ללקוח כ-`sourceFrame: frameDataUri` (שורה 527). תוקף יכול: (א) לקרוא נקודות קצה פנימיות אם התוכן מפוענח כווידאו; (ב) לגרום ל-OOM עם URL של קובץ ענק. אין command injection (args מערך + `execFile` ללא shell).
- **תיקון מוצע**: דחיית hosts פרטיים/link-local ו-schemes שאינם http(s); מגבלת גודל (streaming עם cap, למשל 100MB); `redirect: 'manual'` עם ולידציה לכל hop; AbortController עם timeout כולל.
- **השפעה**: קריאת רשת פנימית (מוחזרת ויזואלית כ-frame), DoS בזכרון, ניצול endpoints פנימיים.

### C4 — Google Calendar — אפס אימות על כל הנתיבים

- **מיקום**: `backend/src/modules/google-calendar/google-calendar.controller.ts` — כל הנתיבים (`GET auth` :48, `GET callback` :72, `GET events` :103, `POST events` :133, `DELETE events` :181, `PATCH events` :218) **ללא `@UseGuards` כלל**; `google-calendar.service.ts` מחזיר `Credentials` (כולל `refresh_token`) בתשובה ללקוח
- **קטגוריה**: אבטחה (authz + credential leak) — ✅ אומת בעצמי
- **תיאור**: כל אחד יכול: ליזום OAuth, לקרוא/ליצור/לשנות/למחוק אירועים, ולקבל את ה-`refresh_token` של המשתמש המחובר. גם פרמטרים רגישים (`access_token`/`refresh_token`) מתקבלים מה-query/body מהלקוח. בנוסף `auth` URL ללא פרמטר `state` (CSRF ב-OAuth callback).
- **תיקון מוצע**: `@UseGuards(JwtAuthGuard)` + בעלות על ה-calendar לפי `userId`; להחזיר רק metadata, לא `refresh_token`; `state` אקראי ב-OAuth; אימות בעלות לפני כל פעולה.
- **השפעה**: חשיפה מלאה של יומן המשתמש + גניבת token, כולל דרך הסוכן (הכלים נבנים מ-Swagger spec).

### C5 — מנגנון אישור פעולות מסוכנות (Confirmation) — מת ולא פעיל

- **מיקום**: `backend/src/modules/admin-agent/services/swagger-tools.parser.ts:320` (קורא `op['x-requires-confirmation'] === true`), `decorators/requires-confirmation.decorator.ts:5` (`SetMetadata('requires_confirmation', true)`), `main.ts:30-35` (SwaggerModule רגיל ללא plugin)
- **קטגוריה**: אבטחה (בקרת אבטחה לא פונקציונלית) — ✅ אומת בעצמי (`grep -c "x-requires-confirmation" backend/swagger-spec.json` → 0)
- **תיאור**: ה-decorator כותב metadata תחת `'requires_confirmation'`, אבל ה-parser קורא את extension `x-requires-confirmation` מה-swagger-spec.json — ו-SwaggerModule רגיל לא מייצא metadata מותאם אישית ל-`x-` extensions. לפיכך `requiresConfirmationOps` ריק תמיד, `isDangerousOperation()` מחזיר `false` תמיד, והמנגנון כולו (pending actions, confirm/cancel ב-UI) הוא dead code. `UsersController_delete`, `UsersController_updateRole` ו-`LlmProviderController_cleanupTestResults` מתבצעים מיד כשהמודל קורא להם.
- **תיקון מוצע**: לקרוא את דגלי האישור מ-Reflector metadata ישירות (למשל רישום operationId→requiresConfirmation ב-bootstrap דרך `DiscoveryService`), או `@ApiExtension('x-requires-confirmation', true)`; להוסיף assertion ב-boot שכל op מסומן מופיע ב-`requiresConfirmationOps`.
- **השפעה**: משתמש/LLM (או session שנפרץ ב-prompt injection) יכול למחוק משתמשים, לשנות רולים ולמחוק היסטוריות בדיקות ללא שום אישור אנושי.

### C6 — אין הרשאת Admin על ניהול ספקי/מודלי LLM

- **מיקום**: `backend/src/modules/llm-provider/llm-provider.controller.ts:21` (`@UseGuards(JwtAuthGuard)` בלבד ברמת class)
- **קטגוריה**: אבטחה (privilege escalation) — ✅ אומת בעצמי
- **תיאור**: כל הנתיבים (`create` :30, `update` :47, `createModel` :55, `updateModel` :63, `deleteModel` :71, `deleteTestResultsForModel` :79, `cleanupTestResults` :97, `findTestResults` :112) זמינים לכל משתמש מחובר. זה ה-enabler של C1 ו-C2. `@RequiresConfirmation()` על `cleanup-test-results` הוא metadata בלבד (ראה C5).
- **תיקון מוצע**: `AdminGuard` על כל ה-controller (או פיצול לנתיבי ניהול admin-only לעומת קריאה לכל המשתמשים).
- **השפעה**: השתלטות מלאה על תצורת ה-AI + נתיב ל-C1/C2.

---

## ממצאים גבוהים (High)

### H1 — אנאום משתמשים: כל משתמש מחובר רואה את כל המשתמשים

- **מיקום**: `backend/src/modules/users/users.controller.ts:46` (`GET /users`, `JwtAuthGuard` בלבד), `:90` (`GET /users/:id`); `users.service.ts:15-26` (מחזיר `email`, `fullName`, `role`, `lastLoginAt`)
- **קטגוריה**: אבטחה — ✅ אומת בעצמי
- **תיאור**: `AdminGuard` קיים רק על `PATCH/DELETE` ו-`PATCH role`. רשימת כל המשתמשים (כולל email וזמני התחברות) זמינה לכל משתמש רשום, כולל דרך הסוכן (כלי חשף את כל ה-API).
- **תיקון**: `AdminGuard` על `GET /users` ו-`GET /users/:id` (או `sub === id` לעצמי + admin לאחרים).
- **השפעה**: אנומרציית חשבונות, מיקוד למשתמש seeded admin, פישינג.

### H2 — קטלוג Genetics/Terpene: פעולות כתיבה ו-enrich ללא AdminGuard

- **מיקום**: `backend/src/modules/genetics/genetics.controller.ts:42-43` (class-level `JwtAuthGuard`), `POST /genetics` :136, `PATCH /genetics/:name` :192, `POST /genetics/:name/enrich` :238, `POST /genetics/enrich-missing` :269, `DELETE /genetics/:name` :287; אותו דפוס ב-`terpene.controller.ts:43-44` (POST :157, PATCH :205, enrich :252/:283, DELETE :301) — ✅ אומת בעצמי (grep guards)
- **קטגוריה**: אבטחה (authz)
- **תיאור**: קטלוג מעוצב ביד — כל משתמש יכול ליצור/לעדכן/למחוק ערכים, ולהריץ enrich (קריאות LLM בתשלום). מחיקה של זן/טרפן מקטלוג משותף על ידי כל משתמש.
- **תיקון**: `AdminGuard` על פעולות הכתיבה וה-enrich.
- **השפעה**: השחתת נתונים, ניצול עלויות LLM.

### H3 — ה-LLM יכול לאשר לעצמו פעולות (self-confirmation)

- **מיקום**: `backend/src/modules/admin-agent/services/swagger-tools.parser.ts:313-389` (כל נתיבי ה-Swagger נטענים ככלים, כולל `AdminAgentController_confirmAction`); `admin-agent.controller.ts:287-394`
- **קטגוריה**: אבטחה — (סוכן D; מיקום אומת)
- **תיאור**: `POST /admin-agent/confirm-action` הוא בעצמו כלי של המודל. בדיקת הבעלות (controller.ts:323) משווה ל-`req.user.sub` — וזה אותו משתמש, כי ה-token שייך לו. אז גם אם C5 יתוקן, המודל יוכל לאשר את הפעולה ההרסנית שלו עצמו בלי משתמש אנושי.
- **תיקון**: להחריג את `confirm-action` (ו-`query-stream`) מכלי המודל (denylist); אישור דרך token חד-פעמי שמוצג רק למשתמש, לעולם לא בהקשר ה-LLM.
- **השפעה**: עקיפת כל מנגנון אישור עתידי.

### H4 — הזרקת ערכים גולמיים ל-URL פנימי בסוכן (SSRF מקומי)

- **מיקום**: `backend/src/modules/admin-agent/services/swagger-tools.parser.ts:83-97` (`resolveArguments`), `agent-tool-executor.service.ts:287-307`
- **קטגוריה**: אבטחה — (סוכן D; לוגיקת `targetUrl.replace('{' + key + '}', String(value))` אומתה בעצמי)
- **תיאור**: ערכי args שמספק ה-LLM מוזרקים לנתיב ה-URL ללא encoding וללא נורמליזציה, ואז נשלח ל-`http://localhost:PORT` עם ה-JWT של המשתמש. ערכים כמו `1/../../sessions/5` או הזרקת `?`/`#` יכולים להגיע לנקודות קצה פנימיות שלא הוכרזו ככלים.
- **תיקון**: בניית URL רק מ-path template; ולידציית ערכי פרמטרים לפי ה-schema; דחיית `../`, `?`, `#` ותווים מיוחדים; בדיקה שה-URL הסופי נשאר ב-localhost ומייצג נתיב ידוע אחד.
- **השפעה**: גישה לנקודות קצה פנימיות בלתי-מוצהרות עם JWT מוגבה.

### H5 — רקורסיה עצמית של הסוכן — `query-stream` ככלי, ללא מגבלת עומק

- **מיקום**: `backend/src/modules/admin-agent/services/swagger-tools.parser.ts:313-389` + `admin-agent.service.ts:198-383`
- **קטגוריה**: באג / ביצועים — (סוכן D)
- **תיאור**: `POST /admin-agent/query-stream` הוא כלי. המודל יכול לקרוא לו עם `prompt` שרירותי וליצור ריצת סוכן מקוננת מלאה (קריאות LLM, כלים, כתיבת DB) — ללא מגבלת עומק. הודעת prompt-injection אחת ("קרא ל-query-stream עם...") הופכת ל-cascade.
- **תיקון**: denylist ל-`streamChat`/`query-stream`; אם רוצים רקורסיה — budget מוגדר.
- **השפעה**: ניצול עלויות, גידול DB, amplifier ל-prompt injection.

### H6 — Race condition ב-refresh — התנתקויות אקראיות

- **מיקום**: `frontend/src/app/core/interceptors/auth.interceptor.ts:26-37` + `core/services/chat.service.ts:80-88` + `core/services/ideas.service.ts:32-39` (לוגיקת refresh כפולה גם ב-fetch)
- **קטגוריה**: באג / אבטחה-שכנות (זמינות) — (סוכן C; הלוגיקה אומתה בעצמי)
- **תיאור**: על כל 401 קוראים ל-`authService.refresh()` ללא deduplication. ה-backend מסובב את ה-refresh token בכל רענון (`auth.service.ts:57-71,110-114`). ב-boot, כמה httpResource stores יורים במקביל → כל אחד מקבל 401 ומרענן → רק הראשון מצליח, והשאר נכשלים → `authStore.logout()` + ניווט ל-/login. משתמש עם session תקין מתנתק באקראיות.
- **תיקון**: single-flight: `refreshPromise` משותף; על כישלון — logout פעם אחת בלבד; גם ה-streams משתמשים באותו single-flight.
- **השפעה**: התנתקויות אקראיות בכל טעינת עמוד אחרי פקיעת token; שבירת צ'אט באמצע סטרים.

### H7 — אין route guard לפי רול בפרונטאנד

- **מיקום**: `frontend/src/app/app.routes.ts:7-28` (רק `authGuard`), `core/guards/auth.guard.ts:7-24` (בודק רק `user()`/`me()`, לא רול), `core/directives/access-to.directive.ts` (מוגדר ולא בשימוש)
- **קטגוריה**: אבטחה — (סוכן C)
- **תיאור**: כל משתמש מחובר יכול לנווט ל-`/users`, `/settings`, `/media`, `/ideas`; ה-sidebar מציג "ניהול משתמשים" לכולם. ה-backend מגן על הכתיבות (AdminGuard) אבל משטח הקריאה חשוף וה-UI מציג תכונות אדמין למשתמשים רגילים.
- **תיקון**: roleGuard + `data: { roles: [UserRole.Admin] }`; לחבר את ה-sidebar ל-`accessTo` או למחוק את ה-directive.
- **השפעה**: חשיפת ספריית משתמשים; UI מטעה; כל עמוד אדמין עתידי ללא guard צד-שרת ייחשף מיד.

### H8 — seed עם פרטי כניסה קבועים וברירת מחדל חלשה

- **מיקום**: `backend/src/core/seeds/user.seed.ts:20-30` — `admin@admin.com` / סיסמה `admin`
- **קטגוריה**: אבטחה — ✅ אומת בעצמי
- **תיאור**: בכל boot, אם אין משתמש כזה, נוצר admin עם סיסמה ידועה (`admin`, 5 תווים) ומודפס ללוג. ברגע שהמערכת תהיה חשופה מעבר ל-localhost, זה דלת אחורית.
- **תיקון**: סיסמה מ-env (`ADMIN_PASSWORD`), דרישת שינוי סיסמה ב-login ראשון, אי-הדפסת credentials ללוג.
- **השפעה**: השתלטות מוחלטת אם השרת חשוף.

---

## ממצאים בינוניים (Medium)

### Backend — Auth & חוסם

- **M1** — **Cookies ללא `secure`**: `auth.service.ts:116-128` — `secure: false` גם ב-production; יש להפוך ל-`secure: NODE_ENV==='production'`. (✅ אומת)
- **M2** — **אין rate-limit על `/auth/login`** — brute force על סיסמאות ללא הגנה. (מומלץ ThrottlerGuard על נתיבי auth).
- **M3** — **`JWT_SECRET`/`JWT_REFRESH_SECRET` ללא ולידציה ב-boot**: `jwt-access.strategy.ts:17` משתמש ב-`?? ''`. אם המפתח חסר — auth נשבר לחלוטין (failure loud, לא silent). יש לזרוק ב-boot עם הודעה ברורה.
- **M4** — **`synchronize: true` ב-TypeORM** (`app.module.ts:35-48`) + ברירות מחדל קשיחות (`DB_USER=root`, `DB_PASSWORD=password`) — מסוכן מול DB אמיתי (שינוי סכמה אוטומטי, אובדן נתונים). ב-production: migrations + אימות env. (✅ אומת)
- **M5** — **חוסר עקביות באורך סיסמה**: `register.dto.ts` דורש 8+, `login.dto.ts` דורש 4+ — מוזר אבל לא קריטי.

### Backend — Admin Agent

- **M6** — **`hasPendingConfirmation` key mismatch** (`agent-tool-executor.service.ts:45-47,62-81,154-157`): `storePendingAction` שומר תחת `pending_<ts>_<rand>` וה-check מחפש `sessionId:fn:args` → תמיד false. בנוסף, הענף `:283-285` (מוחק את ה-pending ואז מבצע ללא אישור) — latent bypass אם מישהו "יתקן" את ה-key בלי להסיר את הענף. (✅ אומת בעצמי — קראתי את הקובץ)
- **M7** — **SSE ללא טיפול בניתוק לקוח** (`admin-agent.controller.ts:260-284`): עבודה נמשכת (קריאות LLM, כתיבת DB) גם כשהלקוח התנתק. צריך `req.on('close')` + AbortController.
- **M8** — **שגיאות גולמיות דולפות ל-SSE** (`admin-agent.controller.ts:273-279`): `error.message` נכתב לסטרים ומדלג על ה-HttpExceptionFilter.
- **M9** — **MCP `requiresConfirmation` לא נאכף** (`agent-tool-executor.service.ts:224-233`; `mcp-bridge.service.ts:120-122` — אין callers): כלי MCP מסומן `requiresConfirmation` מתבצע מייד.
- **M10** — **`pendingActions` = Map בזכרון בלתי מוגבל** (`agent-tool-executor.service.ts:33,62-81`): ללא cleanup תקופתי; אובדן ב-restart; split-brain ב-multi-instance.
- **M11** — **`toolCallCounter` מצב משותף בין בקשות** (`admin-agent.service.ts:33,464-510`): שני סטרימים במקביל על אותה instance משבשים את מונה הדופליקטים.
- **M12** — **פעולות הרסניות של `LlmProviderController` נגישות דרך הסוכן לכל משתמש** — השילוב של C5+C6+H1: משתמש רגיל מבקש בטבעי ← מחיקה.
- **M13** — **חשיפת PII דרך הסוכן**: כל משתמש שואל את הצ'אט "תן לי את כל המשתמשים" ומקבל emails/fullName/lastLoginAt (תוצאה של H1).

### Backend — LLM / ספקים / MCP / Ideas

- **M14** — **`createVideoTaskAndWait` מתבטל בשגיאת poll חולפת** (`llm-client.service.ts:436-446`); `getVideoResult` זורק על `failed` → ה-break בשורה 440 dead code; אחרי ה-deadline מחזיר `status:'in_progress'` כ-HTTP 200.
- **M15** — **`enabledTools` של MCP עוקף** (`mcp-bridge.service.ts:40-51`): `toolToServer.set` רץ לפני הבדיקה → כלי "מנוטרל" עדיין ניתן לקריאה.
- **M16** — **MCP `callTool` ללא timeout + `failed=true` לצמיתות** (`mcp-server-client.ts:76-98`): שיחת כלי תלויה חוסמת את הבקשה; שגיאה אחת הורגת את השרת לכל החיים.
- **M17** — **`connect` timeout לא מכסה `listTools`** (`mcp-server-client.ts:53-65`): עלול לתלות את ה-boot.
- **M18** — **`cleanup-test-results` ללא ולידציה** (`llm-provider.controller.ts:97-103`): `retentionDays` ללא `@Min/@Max` → 0/negative מוחק הכל.
- **M19** — **`/ideas` ללא אכיפת deadline** (`ideas.service.ts:23,48,222-225`): הבקשות יכולות לרוץ 10-20 דקות תוך החזקת חיבור + שריפת תקציב.
- **M20** — **temp file collision ב-`extendVideo`** (`llm-client.service.ts:490-491,528-531`): `Date.now()` בלבד בשמות קבצים.
- **M21** — **Throttler ללא `trust proxy`** (`main.ts`, `ideas-throttler.guard.ts:30-32`): מאחורי reverse proxy כל המשתמשים חולקים bucket אחד.
- **M22** — **`/web-search` ללא rate limit** (`web-search.controller.ts:33`; `app.module.ts:35` skipIf `/ideas`) + תוכן חיפוש חיצוני נכנס ל-prompts (prompt injection).

### Frontend

- **M23** — **AiFormat: HTML גולמי בלתי-escaped בדרך הטבלאות** (`ai-format.directive.ts:43-46,99-101,150-166`): טבלאות נשלפות לפני ה-escaping ומוחזרות raw. ה-sanitizer של Angular חוסם script/style/javascript: — אבל מאפשר `<img src=…>` חיצוני (tracking pixel → הדלפת IP), `target=_blank` ללא `rel="noopener"` (reverse tabnabbing), ו-`data:` URLs.
- **M24** — **`environment.prod.ts` = `http://localhost:3000`** (`environments/environment.prod.ts:3`) — build production שבור/לא מאובטח; יחד עם cookies `secure:false`.
- **M25** — **`AuthStore.user` טיפוס לא נכון**: `/auth/me` מחזיר `JwtPayload` (sub, בלי id/fullName) בעוד ה-store מוגדר `signal<User|null>` (`auth.service.ts:34-46`, `users.store.ts:101-104` עם `as any`). מקור לבאגים שקטים.
- **M26** — **Singleton stores לא מתאפסים ב-logout** (`chat.store.ts:14-26`, `ideas.store.ts:20-27`, `users.store.ts:18-23`): דליפת שיחות/רעיונות בין משתמשים על אותה מכונה.
- **M27** — **`AuthStore.logout()` network-first** (`auth.store.ts:50-61`): אם השרת למטה — המשתמש תקוע "מחובר".
- **M28** — **`getSessionMessages` דולף subscription** (`chat.service.ts:26-39`): manual Observable עם subscribe פנימי ללא teardown.
- **M29** — **`register()` משאיר `loading=true`** (`auth.store.ts:38-42`).
- **M30** — **ideas stream ממשיך לרוץ אחרי יציאה מהדף** (`ideas.store.ts:57-81`; `ideas-form.ts` ללא OnDestroy).

---

## ממצאים נמוכים / אינפורמטיביים (Low / Info)

| #                 | ✅    | ⏱️       | תיאור                                                                                                                                                                        | מיקום                                                                                          |
| ----------------- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| L1                |      | 1h       | `seedLlmProviders` ו-`seedGenetics` מוערים ב-`main.ts:39-40` — על DB חדש אין ספקים/זרעים                                                                                     | `backend/src/main.ts`                                                                          |
| L2                | ✅    | 0.5h     | `swagger-spec.json` נכתב ל-CWD ב-`fs.writeFileSync` לפני `listen` — אם הכתיבה נכשלת השרת לא עולה; התלות ב-CWD שבירה                                                          | `backend/src/main.ts:35`                                                                       |
| L3                | ✅    | 0.5h     | CORS מקודד ל-`http://localhost:4200`                                                                                                                                         | `backend/src/main.ts:25-28`                                                                    |
| L4                |      | 2h       | `retry` חסר 429/500; וידאו ללא retry בכלל                                                                                                                                    | `llm-client.service.ts:199-203,376-384,552-558`                                                |
| L5                |      | 1h       | Ollama (keyless) שבור דרך ה-SDK: או throw או שליחת OPENAI_API_KEY לספק                                                                                                       | `llm-client.service.ts:180-186`                                                                |
| L6                |      | 1h       | default model לא מאומת מול capability/active                                                                                                                                 | `llm-provider.service.ts:81-90`                                                                |
| L7                |      | 4h       | מפתחות API plaintext at rest + סיד מחירי 30 יום                                                                                                                              | `seeds/llm-providers.seed.ts`, entity                                                          |
| L8                |      | 1h       | Dead code: `ollama.types.ts`, `llm-provider.dto.ts`, `video-id-param.dto.ts`, `runIntermittentCheck` (log-only), nightly cron מושבת קשיח (`LLM_HEALTH_CHECK_ENABLED=false`)  | `llm-tasks.service.ts:9,34-38`                                                                 |
| L9                |      | 1h       | סידור שיחות לפי `updatedAt` שלא מתעדכן בהודעות חדשות                                                                                                                         | `agent-session.service.ts:26-42`; `chat-session.entity.ts:45-47`                               |
| L10               |      | 2h       | `queryDatabase` (non-stream) ללא טיפול ב-CONFIRMATION_REQUIRED                                                                                                               | `admin-agent.service.ts:111-196`                                                               |
| L11               |      | 3h       | מגבלות גודל תמונה לא עקביות: DTO 13.4MB / שירות 15MB / הודעה "10MB"; אחסון base64 ב-DB                                                                                       | `agent-request.dto.ts:46-49`, `admin-agent.service.ts:206-209`, `chat-message.entity.ts:68-69` |
| L12               |      | 1h       | שגיאות audit נבלעות (`ACTION_CONFIRMED` נכתב לפני ביצוע)                                                                                                                     | `agent-audit.service.ts:33-35`                                                                 |
| L13               |      | 1h       | `legacy-component-block` מוצג כטקסט (escape אחרי הכנסת ה-wrapper)                                                                                                            | `ai-format.directive.ts:28-37,48-52`                                                           |
| L14               | ✅    | 0.5h     | תשובת ה-refresh נזרקת — רול/אימייל מיושנים ב-UI אחרי שינוי בצד שרת                                                                                                           | `auth.interceptor.ts:27`                                                                       |
| L15               | ✅    | 0.5h     | `tooltip` יכול לקרוא `removeChild` על צומת מנותק → `NotFoundError`                                                                                                           | `tooltip.directive.ts:103-118`                                                                 |
| L16               | ✅    | 0.5h     | `BadgeColor` לא מגיב לשינוי theme (effect קורא attribute, לא signal)                                                                                                         | `badge-color.directive.ts:14-33`                                                               |
| L17               | ✅    | 0.25h    | `--color-primary-hover` בשימוש ולא מוגדר ב-`_variables.css` (hover לא עובד)                                                                                                  | `_ai-format.css:159`                                                                           |
| L18               | ✅    | 0.5h     | `deleteModel` בפרונטאנד = PATCH soft-delete בעוד backend חושף DELETE                                                                                                         | `llm-provider.service.ts:59-61`                                                                |
| L19               | ✅    | 0.5h     | `getUserById` בסטור מביא משתמש ואז מבצע reload של כל הרשימה (הבאת ה-1 נזרקת)                                                                                                 | `users.store.ts:67-77`                                                                         |
| L20               |      | 2h       | צבעים קשיחים (`#1a1a1a`, `color-mix`, `rgba`) ו-~40 `!important`                                                                                                             | `_buttons.css:243,247`, `_layout.css:195`, `_composer.css:116`                                 |
| L21               | ✅    | 0.25h    | `window.agentPrompt` לא מנוקה ב-destroy                                                                                                                                      | `chat.ts:128-131`                                                                              |
| L22               | ✅    | 0.25h    | `User` interface כולל `password?` ו-`refreshToken` — שדות שאינם מוחזרים                                                                                                      | `user.interface.ts:11-12`                                                                      |
| L23               |      | 1h       | `checkSession` מבצע me() ואז refresh() — שתי סיבובים בכל boot קר                                                                                                             | `auth.service.ts:34-46`                                                                        |
| L24               |      | 2h       | login CSRF (SameSite=lax לא חוסם login CSRF) + cookies ללא secure                                                                                                            | `auth.controller.ts:72-97`                                                                     |
| L25               |      | 1h       | `confirm-action` ללא DTO ולידציה (`confirmed` יכול להיות string truthy)                                                                                                      | `admin-agent.controller.ts:309-313`                                                            |
| L26               | ✅    | 0.5h     | `agent-stream-event.dto` enum חסר אירועי `confirmation`/`render` (חוזה OpenAPI לא מלא)                                                                                       | `dto/agent-stream-event.dto.ts:8`                                                              |
| L27               |      | 1h       | `getTools()` מבצע read+parse של הקובץ בכל קריאה (mtime-checked) — cache מומלץ                                                                                                | `swagger-tools.parser.ts:43-64`                                                                |
| L28               |      | 4h       | `onDelete: 'CASCADE'` ללא soft delete — מחיקת session מוחקת לצמיתות                                                                                                          | `chat-message.entity.ts:39`                                                                    |
| L29               |      | 3h       | עלות O(iterations × history) — טעינת כל ההיסטוריה בכל איטרציה                                                                                                                | `admin-agent.service.ts:131-193`                                                               |
| L30               |      | 1h       | `version` extraction ב-`pickLatestModel` עלול לתת תוצאה שגויה ל-keys עם תאריכים                                                                                              | `llm.controller.ts` (extractVersion)                                                           |
| L31               |      | 2h       | `env` key fallback ב-`getSystemHeadersForUser` — sign על כל קריאת כלי                                                                                                        | `agent-tool-executor.service.ts:205-222`                                                       |
| L32               | ✅    | 0.25h    | שגיאת גודל תמונה בסטרים: בדיקה 15MB עם הודעה "10MB"                                                                                                                          | `admin-agent.service.ts:206-209`                                                               |
| L33               | ✅    | 0.25h    | `[disabled]` על reactive form control ב-ideas-form (formControlName=domain) — Angular dev warning + סיכון changed-after-checked; הועבר ל-control.disable()/enable() ב-effect | ideas-form.html:12, ideas-form.ts                                                              |
| **סה"כ (L1-L33)** |      | **~35h ≈ 4.5 ימי פיתוח** |                                                                                                                                                                              |                                                                                                |

---
