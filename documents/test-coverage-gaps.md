# Test Coverage Gaps — Components & Modules Missing Tests

סריקה שבוצעה: 2026-08-13
מטרה: רשימה של קומפוננטות/מודולים בפרונט ובשרת שאין להם טסטים יחידתיים (`.spec.ts`).

מפתח עדיפויות:

- 🔴 HIGH — לוגיקה עסקית קריטית או אבטחה (auth, users, SSRF, guards)
- 🟠 MED — שירותים/קונטרולרים/קומפוננטות עם לוגיקה משמעותית
- 🟢 LOW — קוד תצוגתי/הגדרות טהורות (DTOs, entities, אנומים, models)

---

## שרת (Backend)

כמות סה"כ ספציפים: **21** (מתוכם ~9 בלבד שייכים ל-`admin-agent`).
תיקיית `backend/src/core` — **אפס ספציפים**.

### לפי מודול

| מודול              | מצב כיסוי             | קבצי לוגיקה חסרים (ללא spec)                                                                                                                                           | עדיפות |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `admin-agent`      | ✅ טוב (9)            | רוב ה-render-spec `.ts` (מכוסים דרך `render-spec.service.spec`)                                                                                                        | 🟢     |
| `analytics`        | ⚠️ שירות בלבד         | `analytics.controller.ts`, DTOs, `analytics-catalog.constant.ts`                                                                                                       | 🟠     |
| `auth`             | ❌ אפס                | `auth.controller.ts`, `auth.service.ts`, DTOs (login/register/logout)                                                                                                  | 🔴     |
| `cannlytics`       | ❌ אפס                | `cannlytics.service.ts`                                                                                                                                                | 🟠     |
| `currency`         | ❌ אפס                | `currency.controller.ts`, `currency.service.ts`, DTOs                                                                                                                  | 🟠     |
| `database-monitor` | ⚠️ שירות בלבד         | `database-monitor.controller.ts`, DTOs                                                                                                                                 | 🟠     |
| `genetics`         | ⚠️ dto בלבד           | `genetics.controller.ts`, `genetics.service.ts`, entity, enrich-prompts, create/update DTOs                                                                            | 🟠     |
| `google-calendar`  | ⚠️ controller+service | DTOs, `google-calendar-token.entity.ts`                                                                                                                                | 🟠     |
| `ideas`            | ⚠️ service+tasks      | `ideas.controller.ts`, entities, DTOs, `ideas-throttler.guard.ts`, `idea-prompts.constant.ts`, `idea.interface.ts`                                                     | 🟠     |
| `llm-provider`     | ⚠️ שירות בלבד         | `llm-provider.controller.ts`, entities, DTOs, `validate-base-url.validator.ts`                                                                                         | 🟠     |
| `llm`              | ⚠️ llm-client בלבד    | `llm.controller.ts`, `llm.service.ts`, `llm-health.service.ts`, `llm-provider-config.service.ts`, `llm-tasks.service.ts`, `llm-json-parser.ts` (util), DTOs/validators | 🟠     |
| `mcp-bridge`       | ⚠️ שירות בלבד         | `mcp-bridge.config.ts`, `mcp-server-client.ts`                                                                                                                         | 🟠     |
| `strain-hunter`    | ❌ אפס                | `strain-hunter.controller.ts`, `strain-hunter.service.ts`, entity, DTOs                                                                                                | 🟠     |
| `system`           | ❌ אפס                | `system.controller.ts`, `system.service.ts`, DTO                                                                                                                       | 🟠     |
| `terpene`          | ⚠️ controller בלבד    | `terpene.service.ts`, entity, DTOs, enrich-prompts                                                                                                                     | 🟠     |
| `users`            | ❌ אפס                | `users.controller.ts`, `users.service.ts`, `user.entity.ts`, DTOs                                                                                                      | 🔴     |
| `video-agent`      | (תיקייה ריקה)         | —                                                                                                                                                                      | —      |
| `web-search`       | ❌ אפס                | `web-search.controller.ts`, `web-search.service.ts`, DTOs                                                                                                              | 🟠     |

### `backend/src/core` — אפס ספציפים (פער בולט)

| אזור              | קבצי לוגיקה חסרים                                                | עדיפות |
| ----------------- | ---------------------------------------------------------------- | ------ |
| `core/guards`     | `jwt-auth.guard.ts`, `admin.guard.ts` (וגארדים נוספים)           | 🔴     |
| `core/utils`      | `ssrf-guard.util.ts` (קריטי — נוגע לאבטחה, הוזכר רבות ב-HANDOFF) | 🔴     |
| `core/filters`    | exception filters                                                | 🟠     |
| `core/strategies` | אסטרטגיות שונות                                                  | 🟠     |
| `core/errors`     | מחלקות שגיאה/חריגות                                              | 🟢     |

> הערה: DTOs/entities/אנומים רשומים כ-"חסרים" אך בד"כ לא נדרש להם טסט יחידתי נפרד אלא אם יש להם ולידציה פעילה (למשל validators של `llm-provider` ו-`llm`).

---

## פרונט (Frontend)

כמות סה"כ ספציפים: **20** — כולם תחת `features/chat/blocks` (19) + `core/services` (auth, user).

### קומפוננטות (features) — חסרות spec

| פיצ'ר / אזור                  | קבצים חסרים                                                                                                                         | עדיפות |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `auth/login`, `auth/register` | `login.ts`, `register.ts`                                                                                                           | 🔴     |
| `chat`                        | `chat.ts`, `chat-message.ts`, `chat-history.ts`, `render-host.component.ts`                                                         | 🟠     |
| `chat/blocks` (3 חסרות מ-20)  | `agnes-image-card.component.ts`, `agnes-video-card.component.ts`, `auth-url-card.component.ts`, `weather-summary-card.component.ts` | 🟠     |
| `dashboard`                   | `dashboard.ts`                                                                                                                      | 🟢     |
| `design-system`               | `design-system.ts`                                                                                                                  | 🟢     |
| `ideas`                       | `idea-card.ts`, `ideas-form.ts`, `ideas-history.ts`, `ideas-page.ts`, `ideas-progress.ts`                                           | 🟠     |
| `layout`                      | `header.ts`, `main-layout.ts`, `main-sidebar.ts`                                                                                    | 🟠     |
| `llm-providers-management`    | `llm-providers-management.ts`                                                                                                       | 🟠     |
| `media-studio`                | `media-studio.ts`                                                                                                                   | 🟠     |
| `settings`                    | `settings.ts`, `database-monitor-settings.ts`, `strain-hunter-settings.ts`                                                          | 🟠     |
| `strain-hunter`               | `strain-hunter.ts`, `matching-preferences-drawer.ts` (ו-`mock.ts`)                                                                  | 🟠     |
| `users`                       | `users-management.ts`                                                                                                               | 🔴     |
| `components/shared`           | `dropdown.ts`, `score-tooltip.ts`, `tooltip.ts`                                                                                     | 🟠     |

### שירותים (`core/services`) — חסרים (למעט auth, user)

| שירות                         | עדיפות |
| ----------------------------- | ------ |
| `chat.service.ts`             | 🟠     |
| `database-monitor.service.ts` | 🟠     |
| `genetics.service.ts`         | 🟠     |
| `ideas.service.ts`            | 🟠     |
| `llm-provider.service.ts`     | 🟠     |
| `media.service.ts`            | 🟠     |
| `terpene.service.ts`          | 🟠     |
| `theme.service.ts`            | 🟢     |

### Signal Stores (`core/store`) — אפס ספציפים

| store                      | עדיפות |
| -------------------------- | ------ |
| `auth.store.ts`            | 🔴     |
| `chat.store.ts`            | 🟠     |
| `genetics.store.ts`        | 🟠     |
| `ideas.store.ts`           | 🟠     |
| `llm-provider.store.ts`    | 🟠     |
| `matching-engine.store.ts` | 🟠     |
| `terpene.store.ts`         | 🟠     |
| `users.store.ts`           | 🔴     |

### Guards / Interceptors / Directives — חסרים

| קובץ                                                | עדיפות |
| --------------------------------------------------- | ------ |
| `core/guards/auth.guard.ts`                         | 🔴     |
| `core/guards/role.guard.ts`                         | 🔴     |
| `core/interceptors/auth.interceptor.ts`             | 🔴     |
| `core/interceptors/with-credentials.interceptor.ts` | 🟠     |
| `core/directives/access-to.directive.ts`            | 🟠     |
| `core/directives/auto-scroll-bottom.directive.ts`   | 🟢     |
| `core/directives/badge-color.directive.ts`          | 🟢     |
| `core/directives/tooltip.directive.ts`              | 🟠     |

---

## סיכום עדיפויות לטיפול

1. 🔴 **שרת — אבטחה**: `auth`, `users`, `backend/src/core/guards`, `ssrf-guard.util.ts`.
2. 🔴 **פרונט — אבטחה/ניווט**: `auth.login/register`, `users-management`, `auth.store`, `users.store`, `auth.guard`, `role.guard`, `auth.interceptor`.
3. 🟠 **שרת — לוגיקה עסקית**: `llm` (שירותים/util), `ideas` (controller/tasks), `strain-hunter`, `system`, `currency`, `web-search`, `terpene.service`, `genetics.service`.
4. 🟠 **פרונט — פיצ'רים מרכזיים**: `chat`, `ideas` (כל הקומפוננטות + store), `media-studio`, `settings`, `layout`, stores של genetics/llm-provider/terpene/matching-engine, services.
5. 🟢 **תצוגה/הגדרות**: `dashboard`, `design-system`, `theme.service`, directives תצוגתיים.
