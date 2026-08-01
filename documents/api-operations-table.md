# API Operations Table — summaryHe & toolIcon

| Method | Endpoint                                                 | Tag              | summaryHe                                                                                          | toolIcon                    |
| ------ | -------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| POST   | `/auth/register`                                         | auth             | רושם חשבון משתמש חדש במערכת                                                                        | `ph-user-plus`              |
| POST   | `/auth/login`                                            | auth             | מבצע התחברות באמצעות אימייל וסיסמה                                                                 | `ph-sign-in`                |
| POST   | `/auth/refresh`                                          | auth             | מרענן את טוקן הגישה באמצעות טוקן רענון                                                             | `ph-arrows-clockwise`       |
| POST   | `/auth/logout`                                           | auth             | מבצע התנתקות ומבטל את סשן המשתמש                                                                   | `ph-sign-out`               |
| GET    | `/auth/me`                                               | auth             | שולף את פרטי המשתמש המחובר מתוך הטוקן                                                              | `ph-user-circle`            |
| GET    | `/users`                                                 | users            | שולף את רשימת כל המשתמשים במערכת                                                                   | `ph-users`                  |
| GET    | `/users/me`                                              | users            | שולף את פרטי המשתמש המחובר מתוך הטוקן                                                              | `ph-user-circle`            |
| GET    | `/users/{id}`                                            | users            | שולף משתמש לפי מזהה (מזהה: ${id})                                                                  | `ph-user`                   |
| PATCH  | `/users/{id}`                                            | users            | מעדכן את שדות הפרופיל של המשתמש (מזהה: ${id})                                                      | `ph-pencil-simple`          |
| DELETE | `/users/{id}`                                            | users            | מוחק לצמיתות את המשתמש (מזהה: ${id})                                                               | `ph-trash`                  |
| PATCH  | `/users/{id}/role`                                       | users            | משנה את תפקיד המשתמש (מזהה: ${id})                                                                 | `ph-shield`                 |
| GET    | `/admin-agent/sessions`                                  | Admin Agent      | שולף את סשני הצ'אט של המשתמש המחובר                                                                | `ph-chat-centered-text`     |
| POST   | `/admin-agent/sessions`                                  | Admin Agent      | מייצר סשן שיחת צ'אט חדש                                                                            | `ph-plus-circle`            |
| GET    | `/admin-agent/sessions/{id}/messages`                    | Admin Agent      | שולף את היסטוריית ההודעות של סשן הצ'אט (מזהה: ${id})                                               | `ph-chats`                  |
| POST   | `/admin-agent/messages/images`                           | Admin Agent      | שולף תמונות עבור הודעות בפאנץ'                                                                     | `ph-image`                  |
| DELETE | `/admin-agent/sessions/{id}`                             | Admin Agent      | מוחק לצמיתות את סשן הצ'אט (מזהה: ${id})                                                            | `ph-trash`                  |
| DELETE | `/admin-agent/sessions/{sessionId}/messages/{messageId}` | Admin Agent      | מוחק הודעת צאט ואת כל ההודעות שאחריה                                                               | `ph-trash`                  |
| POST   | `/admin-agent/query-stream`                              | Admin Agent      | שולח שאילתה לסוכן הניהול ומחזיר תגובת סטרים                                                        | `ph-robot`                  |
| POST   | `/admin-agent/confirm-action`                            | Admin Agent      | מאשר או מבטל פעולה מסוכנת שממתינה                                                                  | `ph-shield-check`           |
| POST   | `/llm/models/{id}/test`                                  | llm              | —                                                                                                  | —                           |
| DELETE | `/llm/test-results/{id}`                                 | llm              | —                                                                                                  | —                           |
| POST   | `/llm/set-default-model`                                 | llm              | —                                                                                                  | —                           |
| GET    | `/llm/default-model`                                     | llm              | —                                                                                                  | —                           |
| POST   | `/llm/image/generate`                                    | llm              | —                                                                                                  | —                           |
| POST   | `/llm/video/generate`                                    | llm              | —                                                                                                  | —                           |
| GET    | `/llm/video/{videoId}`                                   | llm              | —                                                                                                  | —                           |
| POST   | `/llm/video/extend`                                      | llm              | —                                                                                                  | —                           |
| POST   | `/llm-provider`                                          | LLM Provider     | —                                                                                                  | —                           |
| GET    | `/llm-provider`                                          | LLM Provider     | —                                                                                                  | —                           |
| PATCH  | `/llm-provider/{id}`                                     | LLM Provider     | —                                                                                                  | —                           |
| POST   | `/llm-provider/{id}/models`                              | LLM Provider     | —                                                                                                  | —                           |
| GET    | `/llm-provider/{id}/models`                              | LLM Provider     | —                                                                                                  | —                           |
| PATCH  | `/llm-provider/models/{id}`                              | LLM Provider     | —                                                                                                  | —                           |
| DELETE | `/llm-provider/models/{id}`                              | LLM Provider     | —                                                                                                  | —                           |
| DELETE | `/llm-provider/models/{modelId}/test-results`            | LLM Provider     | —                                                                                                  | —                           |
| POST   | `/llm-provider/cleanup-test-results`                     | LLM Provider     | —                                                                                                  | —                           |
| GET    | `/llm-provider/test-results`                             | LLM Provider     | —                                                                                                  | —                           |
| POST   | `/analytics/query`                                       | analytics        | מריץ שאילתת אנליטיקה בטוחה ומחזיר נתונים לגרף                                                      | `ph-chart-line`             |
| GET    | `/currency/current`                                      | currency         | בודק שערי מטבע עדכניים לפי מטבע בסיס                                                               | `ph-currency-circle-dollar` |
| GET    | `/currency/convert`                                      | currency         | ממיר סכום בין שני מטבעות לפי שער עדכני                                                             | `ph-currency-circle-dollar` |
| GET    | `/system/status`                                         | system           | שולף את מצב המערכת הכללי ומדדי הפעילות                                                             | `ph-gauge`                  |
| GET    | `/strain-hunter/fetch`                                   | strain-hunter    | בודק זנים..                                                                                        | `ph-compass`                |
| GET    | `/strain-hunter/preferences`                             | strain-hunter    | שולף את העדפות ההתאמה של המשתמש המחובר                                                             | `ph-sliders`                |
| PUT    | `/strain-hunter/preferences`                             | strain-hunter    | שומר או מעדכן את העדפות ההתאמה של המשתמש המחובר                                                    | `ph-floppy-disk`            |
| GET    | `/genetics`                                              | genetics         | שליפת כל הזנים בקטלוג                                                                              | `ph-tree-evergreen`         |
| POST   | `/genetics`                                              | genetics         | יצירת זן חדש בקטלוג                                                                                | `ph-tree-evergreen`         |
| GET    | `/genetics/{name}`                                       | genetics         | שליפת זן בודד לפי שם                                                                               | `ph-tree-evergreen`         |
| PATCH  | `/genetics/{name}`                                       | genetics         | עדכון זן קיים לפי שם                                                                               | `ph-tree-evergreen`         |
| DELETE | `/genetics/{name}`                                       | genetics         | —                                                                                                  | —                           |
| POST   | `/genetics/{name}/enrich`                                | genetics         | העשרת זן בודד באמצעות LLM                                                                          | `ph-tree-evergreen`         |
| POST   | `/genetics/enrich-missing`                               | genetics         | —                                                                                                  | —                           |
| GET    | `/web-search/search`                                     | web-search       | מחפש מידע עדכני באינטרנט — שימושי לאימות עובדות, מציאת מקורות, או בדיקת מידע שלא נמצא במאגר המקומי | `ph-magnifying-glass`       |
| GET    | `/terpenes`                                              | terpenes         | שליפת כל הטרפנים בקטלוג                                                                            | `ph-flower-lotus`           |
| POST   | `/terpenes`                                              | terpenes         | יצירת טרפן חדש                                                                                     | `ph-flower-lotus`           |
| GET    | `/terpenes/{name}`                                       | terpenes         | שליפת טרפן בודד לפי שם                                                                             | `ph-flower-lotus`           |
| PATCH  | `/terpenes/{name}`                                       | terpenes         | עדכון טרפן לפי שם                                                                                  | `ph-flower-lotus`           |
| DELETE | `/terpenes/{name}`                                       | terpenes         | —                                                                                                  | —                           |
| POST   | `/terpenes/{name}/enrich`                                | terpenes         | העשרת טרפן בודד באמצעות LLM                                                                        | `ph-flower-lotus`           |
| POST   | `/terpenes/enrich-missing`                               | terpenes         | —                                                                                                  | —                           |
| POST   | `/ideas/generate`                                        | ideas            | —                                                                                                  | —                           |
| GET    | `/ideas/generate/stream`                                 | ideas            | מייצר רעיונות עסקיים עם פרוגרס בזמן אמת (SSE)                                                      | `ph-lightbulb`              |
| GET    | `/database-monitor/storage`                              | database-monitor | שולף נתוני שימוש בזיכרון במסד הנתונים לפי טבלה                                                     | `ph-database`               |

## Summary

- **Total endpoints:** 57
- **With summaryHe & toolIcon:** 38
- **Without (missing):** 19 (mostly llm and LLM Provider modules)

זהו שינוי כיוון מצוין ומאוד מתבקש. הניסוחים הקודמים היו מיושנים, נוקשים וביורוקרטיים (ניסוחי "מבצע התחברות" או "שולף את...").

באפליקציות SaaS מודרניות ואינטראקטיביות (כמו Slack, Notion, monday), השפה צריכה להיות **דינמית, אקטיבית, חווייתית ובגובה העיניים**. בנוסף, חצינו פה קו חשוב וסגרנו את כל 19 הפערים שהיו חסרים (במיוחד במודולים של ה-LLM וה-LLM Provider).

---

### 📋 טבלת הניסוחים המחודשת והמלאה (57 נקודות קצה)

להלן הטבלה המעודכנת הכוללת את הניסוחים המרעננים, המודרניים והאחידים לכלל פעולות המערכת:

| שיטה (Method) | נתיב (Endpoint)                                          | תגית (Tag)       | ניסוח ישן                                            | ניסוח חדש ומרענן (`summaryHe`)                             | אייקון (`toolIcon`)         |
| :------------ | :------------------------------------------------------- | :--------------- | :--------------------------------------------------- | :--------------------------------------------------------- | :-------------------------- |
| **POST**      | `/auth/register`                                         | auth             | רושם חשבון משתמש חדש במערכת                          | יוצרים חשבון חדש ומצטרפים למשפחת המערכת                    | `ph-user-plus`              |
| **POST**      | `/auth/login`                                            | auth             | מבצע התחברות באמצעות אימייל וסיסמה                   | נכנסים לחשבון האישי בבטחה                                  | `ph-sign-in`                |
| **POST**      | `/auth/refresh`                                          | auth             | מרענן את טוקן הגישה באמצעות טוקן רענון               | מחדשים את טוקן הגישה ברקע כדי להישאר מחוברים               | `ph-arrows-clockwise`       |
| **POST**      | `/auth/logout`                                           | auth             | מבצע התנתקות ומבטל את סשן המשתמש                     | מתנתקים מהמערכת ומסיימים את סשן העבודה בבטחה               | `ph-sign-out`               |
| **GET**       | `/auth/me`                                               | auth             | שולף את פרטי המשתמש המחובר מתוך הטוקן                | מציגים את פרטי הפרופיל המהירים של המשתמש הנוכחי            | `ph-user-circle`            |
| **GET**       | `/users`                                                 | users            | שולף את רשימת כל המשתמשים במערכת                     | מציגים את רשימת המשתמשים הפעילים במערכת                    | `ph-users`                  |
| **GET**       | `/users/me`                                              | users            | שולף את פרטי המשתמש המחובר מתוך הטוקן                | מציגים את פרטי הפרופיל המהירים של המשתמש הנוכחי            | `ph-user-circle`            |
| **GET**       | `/users/{id}`                                            | users            | שולף משתמש לפי מזהה (מזהה: ${id})                    | מציגים פרטים מלאים על משתמש לפי מזהה ייחודי                | `ph-user`                   |
| **PATCH**     | `/users/{id}`                                            | users            | מעדכן את שדות הפרופיל של המשתמש (מזהה: ${id})        | מעדכנים את פרטי הפרופיל האישיים של המשתמש                  | `ph-pencil-simple`          |
| **DELETE**    | `/users/{id}`                                            | users            | מוחק לצמיתות את המשתמש (מזהה: ${id})                 | מוחקים משתמש לצמיתות מהמערכת                               | `ph-trash`                  |
| **PATCH**     | `/users/{id}/role`                                       | users            | משנה את תפקיד המשתמש (מזהה: ${id})                   | מעדכנים את תפקיד והרשאות המשתמש במערכת                     | `ph-shield`                 |
| **GET**       | `/admin-agent/sessions`                                  | Admin Agent      | שולף את סשני הצ'אט של המשתמש המחובר                  | מציגים את כל שיחות הצ'אט השמורות שלך עם ה-AI               | `ph-chat-centered-text`     |
| **POST**      | `/admin-agent/sessions`                                  | Admin Agent      | מייצר סשן שיחת צ'אט חדש                              | פותחים שיחת צ'אט חדשה ורעננה עם סוכן ה-AI                  | `ph-plus-circle`            |
| **GET**       | `/admin-agent/sessions/{id}/messages`                    | Admin Agent      | שולף את היסטוריית ההודעות של סשן הצ'אט (מזהה: ${id}) | מציגים את היסטוריית ההודעות המלאה של שיחת הצ'אט            | `ph-chats`                  |
| **POST**      | `/admin-agent/messages/images`                           | Admin Agent      | שולף תמונות עבור הודעות בפאנץ'                       | שולפים ומציגים את קבצי המדיה והתמונות של ההודעה            | `ph-image`                  |
| **DELETE**    | `/admin-agent/sessions/{id}`                             | Admin Agent      | מוחק לצמיתות את סשן הצ'אט (מזהה: ${id})              | מוחקים לצמיתות שיחת צ'אט מההיסטוריה השמורה                 | `ph-trash`                  |
| **DELETE**    | `/admin-agent/sessions/{sessionId}/messages/{messageId}` | Admin Agent      | מוחק הודעת צאט ואת כל ההודעות שאחריה                 | מוחקים הודעת צאט ואת כל היסטוריית השיחה שנכתבה אחריה       | `ph-trash`                  |
| **POST**      | `/admin-agent/query-stream`                              | Admin Agent      | שולח שאילתה לסוכן הניהול ומחזיר תגובת סטרים          | מתכתבים עם סוכן הניהול ומקבלים תגובות חיות בסטרמינג        | `ph-robot`                  |
| **POST**      | `/admin-agent/confirm-action`                            | Admin Agent      | מאשר או מבטל פעולה מסוכנת שממתינה                    | מאשרים או מבטלים פעולה רגישה הממתינה לאישור הניהולי שלך    | `ph-shield-check`           |
| **POST**      | `/llm/models/{id}/test`                                  | llm              | —                                                    | בודקים ומאמתים את מהירות התגובה והחיבור של מודל ה-AI       | `ph-lightning`              |
| **DELETE**    | `/llm/test-results/{id}`                                 | llm              | —                                                    | מוחקים היסטוריית בדיקת חיבור בודדת של מודל מהארכיון        | `ph-trash`                  |
| **POST**      | `/llm/set-default-model`                                 | llm              | —                                                    | קובעים את מודל ה-AI המועדף עליך כברירת המחדל של המערכת     | `ph-star`                   |
| **GET**       | `/llm/default-model`                                     | llm              | —                                                    | מציגים את מודל ה-AI המוגדר כברירת המחדל שלך                | `ph-star`                   |
| **POST**      | `/llm/image/generate`                                    | llm              | —                                                    | יוצרים תמונות מרהיבות על בסיס טקסט עם Agnes Image          | `ph-palette`                |
| **POST**      | `/llm/video/generate`                                    | llm              | —                                                    | מפיקים סרטונים מרהיבים מבוססי טקסט או תמונה עם Agnes Video | `ph-video-camera`           |
| **GET**       | `/llm/video/{videoId}`                                   | llm              | —                                                    | בודקים את סטטוס הפקת הסרטון ומורידים אותו כשהוא מוכן       | `ph-hourglass-high`         |
| **POST**      | `/llm/video/extend`                                      | llm              | —                                                    | מאריכים וממשיכים סרטון קיים מפריים המפתח האחרון שלו        | `ph-fast-forward`           |
| **POST**      | `/llm-provider`                                          | LLM Provider     | —                                                    | רושמים ספק מודלים (Provider) חדש במערכת                    | `ph-database`               |
| **GET**       | `/llm-provider`                                          | LLM Provider     | —                                                    | מציגים את כל ספקי ה-AI והמודלים המוגדרים במערכת            | `ph-list-bullets`           |
| **PATCH**     | `/llm-provider/{id}`                                     | LLM Provider     | —                                                    | מעדכנים את הגדרות החיבור, הכתובת והמפתח של הספק            | `ph-pencil-simple`          |
| **POST**      | `/llm-provider/{id}/models`                              | LLM Provider     | —                                                    | מוסיפים מודל חדש תחת ספק ה-LLM שנבחר                       | `ph-plus-circle`            |
| **GET**       | `/llm-provider/{id}/models`                              | LLM Provider     | —                                                    | מציגים את כל המודלים המשויכים לספק שנבחר                   | `ph-cube`                   |
| **PATCH**     | `/llm-provider/models/{id}`                              | LLM Provider     | —                                                    | מעדכנים את ההגדרות, התפקיד והסטטוס הפעיל של מודל קיים      | `ph-sliders`                |
| **DELETE**    | `/llm-provider/models/{id}`                              | LLM Provider     | —                                                    | מכבים או מוחקים מודל לצמיתות מהספק שלו                     | `ph-trash`                  |
| **DELETE**    | `/llm-provider/models/{modelId}/test-results`            | LLM Provider     | —                                                    | מנקים את כל היסטוריית בדיקות החיבור של המודל               | `ph-eraser`                 |
| **POST**      | `/llm-provider/cleanup-test-results`                     | LLM Provider     | —                                                    | מנקים בדיקות חיבור ישנות מהארכיון על בסיס תקופת שימור      | `ph-broom`                  |
| **GET**       | `/llm-provider/test-results`                             | LLM Provider     | —                                                    | מציגים את ההיסטוריה המלאה של בדיקות החיבור במערכת          | `ph-activity`               |
| **POST**      | `/analytics/query`                                       | analytics        | מריץ שאילתת אנליטיקה בטוחה ומחזיר נתונים לגרף        | מריצים שאילתת אנליטיקה ומקבלים נתוני גרף מעובדים           | `ph-chart-line`             |
| **GET**       | `/currency/current`                                      | currency         | בודק שערי מטבע עדכניים לפי מטבע בסיס                 | מציגים שערי חליפין מעודכנים על בסיס מטבע נבחר              | `ph-currency-circle-dollar` |
| **GET**       | `/currency/convert`                                      | currency         | ממיר סכום בין שני מטבעות לפי שער עדכני               | ממירים סכומי כסף בין שני מטבעות לפי השער היציג העדכני      | `ph-currency-circle-dollar` |
| **GET**       | `/system/status`                                         | system           | שולף את מצב המערכת הכללי ומדדי הפעילות               | מציגים את מצב המערכת הכללי, העומסים ומדדי הפעילות          | `ph-gauge`                  |
| **GET**       | `/strain-hunter/fetch`                                   | strain-hunter    | בודק זנים..                                          | סורקים, מעדכנים ומציגים את מלאי הזנים הנוכחי               | `ph-compass`                |
| **GET**       | `/strain-hunter/preferences`                             | strain-hunter    | שולף את העדפות ההתאמה של המשתמש המחובר               | שולפים את הגדרות ההתאמה האישית השמורות שלך                 | `ph-sliders`                |
| **PUT**       | `/strain-hunter/preferences`                             | strain-hunter    | שומר או מעדכן את העדפות ההתאמה של המשתמש המחובר      | שומרים או מעדכנים את הגדרות ההתאמה האישית שלך              | `ph-floppy-disk`            |
| **GET**       | `/genetics`                                              | genetics         | שליפת כל הזנים בקטלוג                                | מציגים את קטלוג הגנטיקה והזנים המלא במערכת                 | `ph-tree-evergreen`         |
| **POST**      | `/genetics`                                              | genetics         | יצירת זן חדש בקטלוג                                  | יוצרים רשומת גנטיקה חדשה בקטלוג המערכת                     | `ph-tree-evergreen`         |
| **GET**       | `/genetics/{name}`                                       | genetics         | שליפת זן בודד לפי שם                                 | מציגים פרטים מלאים על זן גנטיקה ספציפי לפי שמו             | `ph-tree-evergreen`         |
| **PATCH**     | `/genetics/{name}`                                       | genetics         | עדכון זן קיים לפי שם                                 | מעדכנים את מאפייני הגנטיקה של זן קיים לפי שמו              | `ph-tree-evergreen`         |
| **DELETE**    | `/genetics/{name}`                                       | genetics         | —                                                    | מוחקים זן גנטיקה לצמיתות מהקטלוג                           | `ph-trash`                  |
| **POST**      | `/genetics/{name}/enrich`                                | genetics         | העשרת זן בודד באמצעות LLM                            | מעשירים זן גנטיקה בודד בפרטים ונתוני מעבדה מבוססי AI       | `ph-tree-evergreen`         |
| **POST**      | `/genetics/enrich-missing`                               | genetics         | —                                                    | מפעילים סריקה והעשרה אוטומטית לכל הזנים שחסר להם מידע      | `ph-magic-wand`             |
| **GET**       | `/web-search/search`                                     | web-search       | מחפש מידע עדכני באינטרנט — שימושי לאימות עובדות...   | מחפשים מידע עדכני באינטרנט לאימות עובדות ומחקר מהיר        | `ph-magnifying-glass`       |
| **GET**       | `/terpenes`                                              | terpenes         | שליפת כל הטרפנים בקטלוג                              | מציגים את קטלוג הטרפנים המלא המוגדר במערכת                 | `ph-flower-lotus`           |
| **POST**      | `/terpenes`                                              | terpenes         | יצירת טרפן חדש                                       | יוצרים טרפן חדש בקטלוג המערכת                              | `ph-flower-lotus`           |
| **GET**       | `/terpenes/{name}`                                       | terpenes         | שליפת טרפן בודד לפי שם                               | מציגים פרטים מלאים על טרפן ספציפי לפי שמו                  | `ph-flower-lotus`           |
| **PATCH**     | `/terpenes/{name}`                                       | terpenes         | עדכון טרפן לפי שם                                    | מעדכנים את המאפיינים, הריח וההשפעות של טרפן קיים           | `ph-flower-lotus`           |
| **DELETE**    | `/terpenes/{name}`                                       | terpenes         | —                                                    | מוחקים טרפן לצמיתות מקטלוג המערכת                          | `ph-trash`                  |
| **POST**      | `/terpenes/{name}/enrich`                                | terpenes         | העשרת טרפן בודד באמצעות LLM                          | מעשירים טרפן בודד בפרטי ארומה והשפעות מבוססי AI            | `ph-flower-lotus`           |
| **POST**      | `/terpenes/enrich-missing`                               | terpenes         | —                                                    | מפעילים סריקה והעשרה אוטומטית לכל הטרפנים שחסר להם מידע    | `ph-magic-wand`             |
| **POST**      | `/ideas/generate`                                        | ideas            | —                                                    | מגבשים ומחוללים רעיונות סטארטאפ חדשניים ופורצי דרך         | `ph-lightbulb`              |
| **GET**       | `/ideas/generate/stream`                                 | ideas            | מייצר רעיונות עסקיים עם פרוגרס בזמן אמת (SSE)        | מחוללים רעיונות עסקיים מעולים עם חיווי התקדמות חי בסטרמינג | `ph-lightbulb`              |
| **GET**       | `/database-monitor/storage`                              | database-monitor | שולף נתוני שימוש בזיכרון במסד הנתונים לפי טבלה       | מציגים את השימוש באחסון ומספר השורות של כל טבלה ב-DB       | `ph-database`               |

---

### 🤖 הנחיה ישירה לסוכן לעדכון ה-Decorators ב-Backend

סוכן, הוגדר סט של ניסוחים חדשים, מאוחדים ומרעננים לכל ה-API Operations במערכת, כולל אלו שהיו חסרים.

עליך לעבור על קבצי הבקרים (Controllers) ב-Backend ולעדכן את ה-Decorators מסוג `@ApiOperation` כך שיכילו בדיוק את הערכים החדשים של ה-`summaryHe` וה-`toolIcon` המופיעים בטבלה למעלה.

#### קבצים לעדכון:

1. `src/modules/auth/auth.controller.ts`
2. `src/modules/users/users.controller.ts`
3. `src/modules/admin-agent/admin-agent.controller.ts`
4. `src/modules/llm/llm.controller.ts`
5. `src/modules/llm-provider/llm-provider.controller.ts`
6. `src/modules/analytics/analytics.controller.ts`
7. `src/modules/currency/currency.controller.ts`
8. `src/modules/system/system.controller.ts`
9. `src/modules/strain-hunter/strain-hunter.controller.ts`
10. `src/modules/genetics/genetics.controller.ts`
11. `src/modules/web-search/web-search.controller.ts`
12. `src/modules/terpene/terpene.controller.ts`
13. `src/modules/ideas/ideas.controller.ts`
14. `src/modules/database-monitor/database-monitor.controller.ts`

**דגשים לסוכן בביצוע הכתיבה:**

- אל תשנה שום לוגיקה פנימית בבקרים. עדכן אך ורק את ה-`@ApiOperation` ואת שדות ה-`summaryHe` ו-`toolIcon` שלו.
- בקבצים בהם השדות היו חסרים לגמרי, דאג להוסיף אותם תחת עמידה בטיפוס `CustomApiOperationOptions`.
- בצע את העדכון במלואו, ללא placeholders, ללא קיצורים, וחתום בסיום ב-"✓ Verified".

---

מבחינתי התוכנית מנוסחת, מדויקת ומלוטשת ברמת UX מעולה.

**סוכן, בצע כעת את עדכון קבצי השרת (Backend Controllers) במלואם בהתאם להנחיות הללו.**
