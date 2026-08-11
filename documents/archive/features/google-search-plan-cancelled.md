משימה: הוסף GoogleSearchService כ-fallback ל-Tavily ב-WebSearchService, עם מעבר
אוטומטי כש-Tavily מחזיר קוד 432 (Plan Limit Exceeded).

── שלב 1: חקירה (בצע לפני כתיבת קוד) ──

1. מצא ופתח את WebSearchService הקיים (כנראה תחת core/services או web-tool module).
2. תעד:
   - איזה interface/type מחזיר כרגע כל search call (השדות שה-consumers מצפים
     להם: title, url, content/snippet, וכו').
   - איך כרגע מטופלות שגיאות HTTP מ-Tavily (יש כבר try/catch? interceptor?
     retry logic?).
   - איפה מוגדר ה-API key של Tavily (env var, config service) - כדי לדעת
     את הקונבנציה להוספת GOOGLE_SEARCH_API_KEY ו-GOOGLE_SEARCH_ENGINE_ID.
   - אילו safeguards קיימים כבר מה-security review הקודם (SSRF, sanitization,
     prompt injection guards שצוינו ב-WebToolModule) - חובה שה-provider החדש
     יעבור באותם safeguards ולא יעקוף אותם.
3. דווח בקצרה מה מצאת לפני שאתה ממשיך לשלב 2, כדי שאוודא שההבנה נכונה.

── שלב 2: GoogleSearchService ──

קובץ חדש: core/services/google-search.service.ts (התאם את הנתיב למוסכמה שמצאת).

1. שירות חדש שעוטף את Google Custom Search JSON API:
   - endpoint: https://www.googleapis.com/customsearch/v1
   - פרמטרים: key (GOOGLE_SEARCH_API_KEY), cx (GOOGLE_SEARCH_ENGINE_ID), q (query)
   - שים את שני ה-env vars ב-config service הקיים, לא hardcoded, לפי אותה
     קונבנציה שבה שמור מפתח ה-Tavily (כולל הצפנה אם המפתחות הקיימים מוצפנים
     ב-AES-256-GCM כמו ב-LLM provider DB - ודא עקביות).

2. מפה את תוצאות ה-response של גוגל (items[].title / items[].link /
   items[].snippet) לאותו interface/type שכבר קיים ומשמש את תוצאות Tavily,
   כדי שה-consumers (למשל ScoringEngine / genetics enrichment flow) לא ידעו
   ולא יצטרכו לדעת מאיזה provider הגיעה התוצאה.

3. טיפול שגיאות: כשל ב-Google Custom Search (rate limit יומי, 403, וכו')
   צריך להיזרק/להיתפס באותו pattern שמצאת בשלב 1 (לא pattern חדש משלך).

4. הרץ את אותם safeguards קיימים (SSRF protection, sanitization) על כל URL/
   snippet שמוחזר מגוגל, בדיוק כמו שרץ כרגע על תוצאות Tavily - אל תדלג על
   זה בגלל שזה "רק fallback".

── שלב 3: לוגיקת ה-fallback ב-WebSearchService ──

1. ב-method הקיים שקורא ל-Tavily, עטוף את הקריאה כך שבמקרה של שגיאה עם
   status code 432 (ורק 432 - לא כל שגיאה) הוא:
   - ירשום warning ל-log (לא error - זו נפילה צפויה/מטופלת, לא תקלה)
   - יקרא ל-GoogleSearchService עם אותה query
   - יחזיר את התוצאה ממנו באותו format
2. אם גם ה-fallback נכשל, יזרוק/יטפל בשגיאה באותו אופן שה-Tavily error
   מטופל כרגע כשאין fallback (אל תבליע שקט - caller צריך לדעת ששני
   ה-providers נכשלו).
3. הוסף גם fallback דומה אם Tavily מחזיר 433 (Pay-As-You-Go Limit Exceeded) -
   זו אותה משפחת שגיאות של "נגמרה המכסה".
4. אל תוסיף fallback על 401/429/500 של Tavily - אלה שגיאות אחרות (auth,
   rate-limit רגעי, שגיאת שרת) שלא בהכרח פתרונן הוא מעבר ל-provider אחר,
   ועלולות להצביע על בעיה אחרת שצריך לטפל בה בנפרד.

── שלב 4: Config ──

1. הוסף ל-.env.example (או שקול הקיים):
   GOOGLE_SEARCH_API_KEY=
   GOOGLE_SEARCH_ENGINE_ID=
2. תעד ב-README/CLAUDE.md הרלוונטי (nestjs-rules.md?) שני משפטים על
   ה-fallback הזה, כדי שיהיה תיעוד ל-multi-agent workflow (MiniMax/MiMo)
   שלך.

── הערות כלליות ──

- שמור על no comments בקוד עצמו (רק Swagger/JSDoc quality docs לפי
  nestjs-rules.md הקיים), JS/TS בלבד.
- אל תיצור duplicate mapping logic - אם יש כבר util למיפוי תוצאות חיפוש
  ל-DTO אחיד, השתמש בו במקום לכתוב מיפוי חדש בתוך GoogleSearchService.
- הרץ/כתוב טסט קצר (unit) שמוודא: כש-Tavily זורק 432, הקריאה עוברת
  ל-Google ומחזירה תוצאה תקינה; כש-Tavily זורק 401, אין מעבר ל-Google.
