# Test Coverage Gaps — Components & Modules Missing Tests

סריקה שבוצעה: 2026-08-13 (עודכן סופי מאומת: 2026-08-13)
מטרה: רשימה של קומפוננטות/מודולים בפרונט ובשרת שאין להם טסטים יחידתיים (`.spec.ts`).

מפתח עדיפויות:

- 🔴 HIGH — לוגיקה עסקית קריטית או אבטחה (auth, users, SSRF, guards)
- 🟠 MED — שירותים/קונטרולרים/קומפוננטות עם לוגיקה משמעותית
- 🟢 LOW — קוד תצוגתי/הגדרות טהורות (DTOs, entities, אנומים, models)

---

## מצב סופי מאומת (ספירה בפועל)

| שטח                       | קבצי spec | בדיקות (it/test) |
| ------------------------- | --------- | ---------------- |
| Backend (backend/src)     | 43        | 376              |
| Frontend (frontend/src)   | 56        | 482              |

> הספירה נעשתה ע"י סריקת קבצי `.spec.ts` בפועל. פרונט: 482 `it/test` — תואם ל-`434/482` מהרצת הטסטים (51 מתוך 56 סוויטות עוברות).

---

## שרת (Backend)

ספציפים בפועל: **43**. חלוקה: אבטחה **8**, לוגיקה עסקית **26** (מעבדה/LLM/שירותים), `admin-agent` **9**.
תיקיית `backend/src/core` — **4 ספציפים** (jwt-auth.guard, admin.guard, jwt-refresh.guard, ssrf-guard.util).

### לפי מודול

| מודול              | מצב כיסוי             | קבצי spec (מס' בדיקות)                                                            | עדיפות |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------- | ------ |
| `admin-agent`      | ✅ טוב (9)            | controller (8), service (14), decorator (2), render-spec.service (18), weather-mcp (7), agent-session (10), tool-executor c5 (9), tool-executor h4 (9), swagger-tools.parser (11). רוב render-`*.ts` מכוסים דרך render-spec.service | 🟢     |
| `analytics`        | ⚠️ שירות בלבד         | analytics.service (7); חסר controller, DTOs, analytics-catalog.constant            | 🟠     |
| `auth`             | ✅ טוב (2)            | auth.service (13), auth.controller (12)                                             | 🔴 ✅ |
| `cannlytics`       | ❌ אפס                | cannlytics.service.ts                                                               | 🟠     |
| `currency`         | ✅ טוב (1)            | currency.service (6)                                                                | 🟠 ✅ |
| `database-monitor` | ⚠️ שירות בלבד         | database-monitor.service (7); חסר controller, DTOs                                 | 🟠     |
| `genetics`         | ✅ טוב (2)            | genetics.service (15), genetics.dto (4)                                             | 🟠 ✅ |
| `google-calendar`  | ⚠️ controller+service | controller (6), service (12); חסר DTOs, token.entity                                | 🟠     |
| `ideas`            | ✅ טוב (3)            | ideas.service (7), ideas-tasks.service (6), ideas.controller (15)                   | 🟠 ✅ |
| `llm-provider`     | ⚠️ שירות בלבד         | llm-provider.service (5); חסר controller, validate-base-url.validator              | 🟠     |
| `llm`              | ✅ טוב (6)            | llm-client (12), llm-provider-config (27), llm-health (11), llm-tasks (6), llm-json-parser (11), llm.controller (13) | 🟠 ✅ |
| `mcp-bridge`       | ⚠️ שירות בלבד         | mcp-bridge.service (9); חסר mcp-bridge.config, mcp-server-client                    | 🟠     |
| `strain-hunter`    | ✅ טוב (2)            | strain-hunter.service (13), strain-hunter.controller (7)                            | 🟠 ✅ |
| `system`           | ✅ טוב (2)            | system.service (2), system.controller (1)                                           | 🟠 ✅ |
| `terpene`          | ✅ טוב (2)            | terpene.service (15), terpene.controller (3)                                        | 🟠 ✅ |
| `users`            | ✅ טוב (2)            | users.service (11), users.controller (8)                                            | 🔴 ✅ |
| `video-agent`      | — (תיקייה ריקה)       | —                                                                                  | —      |
| `web-search`       | ✅ טוב (1)            | web-search.service (3)                                                              | 🟠 ✅ |

### `backend/src/core` — 4 ספציפים

| אזור              | קבצי spec                                                     | עדיפות |
| ----------------- | ------------------------------------------------------------- | ------ |
| `core/guards`     | jwt-auth.guard (4), admin.guard (3), jwt-refresh.guard (3) ✅  | 🔴 ✅ |
| `core/utils`      | ssrf-guard.util (10) ✅                                        | 🔴 ✅ |
| `core/filters`    | exception filters (חסרים)                                      | 🟠     |
| `core/strategies` | אסטרטגיות (חסרים)                                              | 🟠     |
| `core/errors`     | מחלקות שגיאה/חריגות (חסרים)                                    | 🟢     |

> הערה: DTOs/entities/אנומים בד"כ לא דורשים טסט יחידתי נפרד, אלא אם יש ולידציה פעילה (למשל validators של llm-provider ו-llm).

---

## פרונט (Frontend)

ספציפים בפועל: **56** (482 בדיקות).

### קומפוננטות/פיצ'רים — נותרו חסרי spec

| פיצ'ר / אזור                 | קבצים חסרים                                                          | עדיפות |
| ---------------------------- | -------------------------------------------------------------------- | ------ |
| `users`                      | `users-management.ts`                                                 | 🔴     |
| `design-system`              | `design-system.ts`                                                    | 🟢     |
| `chat/blocks` (4 מתוך 20)    | `agnes-image-card`, `agnes-video-card`, `auth-url-card`, `weather-summary-card` | 🟠 |
| `strain-hunter`              | `mock.ts` (קובץ נתונים בלבד, לא דורש spec)                            | 🟢     |

> הושלמו (מאומת בפועל): `auth/login`, `auth/register`, `chat`/`chat-message`/`chat-history`/`render-host`, `dashboard`, כל חמשת רכיבי `ideas`, `layout` (header/main-layout/main-sidebar), `llm-providers-management`, `media-studio`, `settings` (×3), `strain-hunter` + `matching-preferences-drawer`.

### שירותים (`core/services`) — נותרו חסרים

| שירות                          | עדיפות |
| ------------------------------ | ------ |
| `database-monitor.service.ts`  | 🟠     |
| `genetics.service.ts`          | 🟠     |
| `llm-provider.service.ts`      | 🟠     |
| `terpene.service.ts`           | 🟠     |
| `theme.service.ts`             | 🟢     |

> הושלמו: auth, user, chat, ideas, media.

### Signal Stores (`core/store`) — כיסוי מלא (8/8)

| store                       | עדיפות | סטטוס |
| --------------------------- | ------ | ----- |
| `auth.store.ts`             | 🔴     | ✅     |
| `users.store.ts`            | 🔴     | ✅     |
| `chat.store.ts`             | 🟠     | ✅     |
| `genetics.store.ts`         | 🟠     | ✅     |
| `ideas.store.ts`            | 🟠     | ✅     |
| `llm-provider.store.ts`     | 🟠     | ✅     |
| `matching-engine.store.ts`  | 🟠     | ✅     |
| `terpene.store.ts`          | 🟠     | ✅     |

### Guards / Interceptors / Directives

| קובץ                                              | עדיפות | סטטוס |
| ------------------------------------------------- | ------ | ----- |
| `core/guards/auth.guard.ts`                       | 🔴     | ✅     |
| `core/guards/role.guard.ts`                       | 🔴     | ✅     |
| `core/interceptors/auth.interceptor.ts`           | 🔴     | ✅     |
| `core/interceptors/with-credentials.interceptor.ts` | 🟠   | ✅     |
| `core/directives/ai-format.directive.ts`          | 🟢     | ✅     |
| `core/directives/access-to.directive.ts`          | 🟠     | ❌     |
| `core/directives/auto-scroll-bottom.directive.ts` | 🟢     | ❌     |
| `core/directives/badge-color.directive.ts`        | 🟢     | ❌     |
| `core/directives/tooltip.directive.ts`            | 🟠     | ❌     |

---

## טסטים שנוצרו (2026-08-13) — מאומת בפועל

סה"כ הסופי לפי סריקת קבצים: Backend **376 בדיקות** (43 קבצי spec) + Frontend **482 בדיקות** (56 קבצי spec).

### סבב 1 — Backend אבטחה (8 סוויטות, 64 בדיקות)

| קובץ                                    | בדיקות |
| --------------------------------------- | ------ |
| `auth/auth.service.spec.ts`             | 13     |
| `auth/auth.controller.spec.ts`          | 12     |
| `users/users.service.spec.ts`           | 11     |
| `users/users.controller.spec.ts`        | 8      |
| `core/guards/jwt-auth.guard.spec.ts`    | 4      |
| `core/guards/admin.guard.spec.ts`       | 3      |
| `core/guards/jwt-refresh.guard.spec.ts` | 3      |
| `core/utils/ssrf-guard.util.spec.ts`    | 10     |

### סבב 2 — Backend לוגיקה עסקית (26 סוויטות, 224 בדיקות) — למעט admin-agent

| קובץ                                                  | בדיקות |
| ----------------------------------------------------- | ------ |
| `llm/services/llm-provider-config.service.spec.ts`    | 27     |
| `llm/services/llm-client.service.spec.ts`             | 12     |
| `llm/services/llm-health.service.spec.ts`             | 11     |
| `llm/services/llm-tasks.service.spec.ts`              | 6      |
| `llm/utils/llm-json-parser.spec.ts`                   | 11     |
| `llm/llm.controller.spec.ts`                          | 13     |
| `ideas/ideas.service.spec.ts`                         | 7      |
| `ideas/ideas-tasks.service.spec.ts`                   | 6      |
| `ideas/ideas.controller.spec.ts`                      | 15     |
| `strain-hunter/strain-hunter.service.spec.ts`         | 13     |
| `strain-hunter/strain-hunter.controller.spec.ts`      | 7      |
| `system/system.service.spec.ts`                       | 2      |
| `system/system.controller.spec.ts`                    | 1      |
| `currency/currency.service.spec.ts`                   | 6      |
| `web-search/web-search.service.spec.ts`               | 3      |
| `terpene/terpene.service.spec.ts`                     | 15     |
| `terpene/terpene.controller.spec.ts`                  | 3      |
| `genetics/genetics.service.spec.ts`                   | 15     |
| `genetics/dto/genetics.dto.spec.ts`                   | 4      |
| `analytics/analytics.service.spec.ts`                 | 7      |
| `database-monitor/database-monitor.service.spec.ts`   | 7      |
| `google-calendar/google-calendar.controller.spec.ts`  | 6      |
| `google-calendar/google-calendar.service.spec.ts`     | 12     |
| `llm-provider/llm-provider.service.spec.ts`           | 5      |
| `mcp-bridge/mcp-bridge.service.spec.ts`               | 9      |
| `app.controller.spec.ts`                              | 1      |

### admin-agent (9 סוויטות, 88 בדיקות)

| קובץ                                                          | בדיקות |
| ------------------------------------------------------------- | ------ |
| `admin-agent/admin-agent.service.spec.ts`                     | 14     |
| `admin-agent/admin-agent.controller.spec.ts`                  | 8      |
| `admin-agent/decorators/requires-confirmation.decorator.spec.ts` | 2    |
| `admin-agent/render-spec/render-spec.service.spec.ts`         | 18     |
| `admin-agent/render-spec/weather-mcp.render-spec.spec.ts`     | 7      |
| `admin-agent/services/agent-session.service.spec.ts`          | 10     |
| `admin-agent/services/agent-tool-executor.service.c5.spec.ts` | 9      |
| `admin-agent/services/agent-tool-executor.service.h4.spec.ts` | 9      |
| `admin-agent/services/swagger-tools.parser.spec.ts`           | 11     |

### סבבים 3+4 — Frontend (56 סוויטות, 482 בדיקות)

#### ליבה (core) + auth — 21 קבצים, 156 בדיקות

| קובץ                                          | בדיקות |
| --------------------------------------------- | ------ |
| `app/app.spec.ts`                             | 2      |
| `core/guards/auth.guard.spec.ts`              | 3      |
| `core/guards/role.guard.spec.ts`              | 4      |
| `core/interceptors/auth.interceptor.spec.ts`  | 5      |
| `core/interceptors/with-credentials.interceptor.spec.ts` | 4 |
| `core/directives/ai-format.directive.spec.ts` | 2      |
| `core/services/auth.service.spec.ts`          | 10     |
| `core/services/user.service.spec.ts`          | 4      |
| `core/services/chat.service.spec.ts`          | 6      |
| `core/services/ideas.service.spec.ts`         | 9      |
| `core/services/media.service.spec.ts`         | 5      |
| `core/store/auth.store.spec.ts`               | 11     |
| `core/store/users.store.spec.ts`              | 10     |
| `core/store/chat.store.spec.ts`               | 7      |
| `core/store/genetics.store.spec.ts`           | 7      |
| `core/store/ideas.store.spec.ts`              | 17     |
| `core/store/llm-provider.store.spec.ts`       | 9      |
| `core/store/matching-engine.store.spec.ts`    | 19     |
| `core/store/terpene.store.spec.ts`            | 7      |
| `features/auth/login/login.spec.ts`           | 8      |
| `features/auth/register/register.spec.ts`     | 7      |

#### chat/blocks — 15 קבצים, 105 בדיקות

| קובץ                                              | בדיקות |
| ------------------------------------------------- | ------ |
| `chat/blocks/analytics-chart.component.spec.ts`    | 7      |
| `chat/blocks/chat-sessions-list.component.spec.ts` | 6      |
| `chat/blocks/currency-card.component.spec.ts`      | 9      |
| `chat/blocks/database-storage-monitor.component.spec.ts` | 6 |
| `chat/blocks/delete-confirm-card.component.spec.ts` | 6     |
| `chat/blocks/llm-test-results.component.spec.ts`   | 8      |
| `chat/blocks/register-form.component.spec.ts`      | 7      |
| `chat/blocks/role-change-card.component.spec.ts`   | 7      |
| `chat/blocks/session-created-card.component.spec.ts` | 6    |
| `chat/blocks/system-status-dashboard.component.spec.ts` | 9  |
| `chat/blocks/transcript-timeline.component.spec.ts` | 7     |
| `chat/blocks/user-profile-card.component.spec.ts`  | 6      |
| `chat/blocks/users-table.component.spec.ts`        | 8      |
| `chat/blocks/weather-current-card.component.spec.ts` | 8    |
| `chat/blocks/weather-forecast.component.spec.ts`   | 5      |

#### פיצ'רים (features) — 20 קבצים, 221 בדיקות

| קובץ                                              | בדיקות |
| ------------------------------------------------- | ------ |
| `chat/chat/chat.spec.ts`                          | 23     |
| `chat/chat-history/chat-history.spec.ts`          | 5      |
| `chat/chat-message/chat-message.spec.ts`          | 35     |
| `chat/render-host/render-host.component.spec.ts`  | 2      |
| `dashboard/dashboard.spec.ts`                      | 2      |
| `ideas/idea-card/idea-card.spec.ts`                | 6      |
| `ideas/ideas-form/ideas-form.spec.ts`              | 10     |
| `ideas/ideas-history/ideas-history.spec.ts`        | 9      |
| `ideas/ideas-page/ideas-page.spec.ts`              | 2      |
| `ideas/ideas-progress/ideas-progress.spec.ts`      | 2      |
| `layout/header/header.spec.ts`                     | 5      |
| `layout/main-layout/main-layout.spec.ts`           | 1      |
| `layout/main-sidebar/main-sidebar.spec.ts`         | 7      |
| `llm-providers-management/llm-providers-management.spec.ts` | 32 |
| `media-studio/media-studio.spec.ts`                | 10     |
| `settings/settings.spec.ts`                       | 1      |
| `settings/database-monitor-settings/database-monitor-settings.spec.ts` | 6 |
| `settings/strain-hunter-settings/strain-hunter-settings.spec.ts` | 7 |
| `strain-hunter/strain-hunter.spec.ts`             | 51     |
| `strain-hunter/matching-preferences-drawer/matching-preferences-drawer.spec.ts` | 5 |

> ייצוג מדויק: 56 קבצים / 482 בדיקות (מאומת בסריקה אוטומטית של `it(`/`test(`).

---

## סיכום עדיפויות לטיפול

1. ~~🔴 **שרת — אבטחה**: auth, users, core/guards, ssrf-guard.util.~~ ✅ **הושלם** (8 סוויטות, 64 בדיקות)
2. ~~🔴 **פרונט — אבטחה/ניווט**: login/register, users.store, auth.store, auth.guard, role.guard, auth.interceptor.~~ ✅ **הושלם**
3. ~~🟠 **שרת — לוגיקה עסקית**: llm, ideas, strain-hunter, system, currency, web-search, terpene, genetics, mcp-bridge, database-monitor, google-calendar, analytics, llm-provider.~~ ✅ **הושלם** (26 סוויטות, 224 בדיקות)
4. ~~🟠 **פרונט — פיצ'רים מרכזיים**: chat (+blocks), ideas, media-studio, settings, layout, llm-providers-management, stores, services.~~ ✅ **הושלם** (56 סוויטות, 482 בדיקות)

### נותר לטיפול (עדיפות נמוכה / תצוגה)

- 🟠 `users-management.ts` (פיצ'ר משתמשים), `cannlytics.service.ts`, controllers/DTOs של analytics, database-monitor, llm-provider, google-calendar, mcp-bridge config/server-client.
- 🟠 directives: `access-to`, `tooltip`; 🟢 `auto-scroll-bottom`, `badge-color`.
- 🟢 `design-system.ts`, `theme.service.ts`, `core/filters` & `core/strategies` (server), `strain-hunter/mock.ts`.