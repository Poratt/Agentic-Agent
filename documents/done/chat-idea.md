התוכנית מוצקה עכשיו — כל ארבע הנקודות מוגדרות כ-spec מלא, לא כהצהרות כוונה. שתי הערות קטנות שנשארו לפני שממשיכים לצד לקוח:

**1. תשובת ה-429** — כדאי להוסיף גוף תשובה קונקרטי (`{ statusCode: 429, message: "..." }` בעברית), כדי שהקליינט ידע להציג הודעה נכונה למשתמש ולא רק לתפוס שגיאה גנרית.

**2. GenUI integration** — אם אתה רוצה שהסוכן הזה יהיה גם tool בתוך ה-chat agent הקיים שלך (לא רק endpoint עצמאי), שווה כבר עכשיו להוסיף `@ApiOperation` עם `genUiSpec` ל-controller, כדי שה-`SwaggerToolsParser` שלך יזהה אותו אוטומטית. אחרת תצטרך להוסיף את זה בנפרד מאוחר יותר.

חוץ מזה — מוכן לבנייה.

---

## איך זה אמור להיראות בצד לקוח

בהתאם לסגנון שלך (glassmorphism, neon, RTL, PrimeNG) ולזרימה של 4 השלבים, אני חושב על זה כ**רצף חשיפה הדרגתי**, לא טופס-ואז-תוצאה חד-פעמית — כי יש כאן 3 שלבי עיבוד עם המתנה אמיתית (SearXNG + LLM × N), והמשתמש צריך לדעת שקורה משהו.

### מבנה מסך

1. **קלט** — שדה domain + stepper/slider ל-count (1-10), כפתור "צור רעיונות"
2. **מצב טעינה מדורג** — לא spinner סתמי, אלא indicator שמראה באיזה phase נמצאים: "מחפש סיגנלים בשוק..." → "מייצר רעיונות..." → "מאמת מול מתחרים..." (בהתאם ל-SSE אם תרצה סטרימינג, או polling אם זה sync)
3. **תוצאות כ-cards** — כל `BusinessIdea` ככרטיס glassmorphism נפרד עם:
   - כותרת + `validationScore` כ-badge צבעוני (ירוק/צהוב/אדום לפי ציון)
   - אם `groundedInSignals: false` → תג אזהרה עדין ("ללא עיגון במחקר שוק")
   - accordion/expand ל-risks, competitors, nextSteps
4. **מצב partial** — אם `partial: true`, banner עדין למעלה: "הוצגו X מתוך Y רעיונות" עם `failedCount`

### ארכיטקטורה טכנית (Angular 22)

- **Store**: signal store עם `domain`, `count`, `ideas`, `loading`, `partial`, `error` signals
- **Service**: `IdeasService` עם `httpResource` — הבקשה הזו היא POST לא GET, אז `httpResource` פחות מתאים כאן (זה ל-reads); תישאר עם `HttpClient` + subscribe רגיל, ותעדכן signals ב-store ידנית
- **Component**: standalone, `input()`/`output()` signals, container לרשימת cards + child component לכל card

```html
<div dir="rtl" style="font-family: var(--font-sans);">
  <h2 class="sr-only">
    סקיצה של מסך מחולל רעיונות עסקיים: טופס קלט, מחוון התקדמות תלת-שלבי, וכרטיסי תוצאות
  </h2>

  <div
    style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;"
  >
    <label
      style="font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 6px;"
    >
      תחום עסקי
    </label>
    <input
      type="text"
      value="כלי AI לפרילנסרים"
      style="width: 100%; margin-bottom: 12px;"
    />
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
      <label style="font-size: 13px; color: var(--text-secondary); white-space: nowrap;">
        מספר רעיונות
      </label>
      <input type="range" min="1" max="10" value="5" step="1" style="flex: 1;" />
      <span style="font-size: 14px; font-weight: 500; min-width: 20px;">5</span>
    </div>
    <button
      style="background: var(--fill-brand); color: var(--on-brand); border: none; width: 100%;"
    >
      צור רעיונות
    </button>
  </div>

  <div
    style="background: var(--surface-1); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.25rem;"
  >
    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
      <div
        style="flex:1; height: 4px; border-radius: 2px; background: var(--fill-accent);"
      ></div>
      <div
        style="flex:1; height: 4px; border-radius: 2px; background: var(--fill-accent);"
      ></div>
      <div
        style="flex:1; height: 4px; border-radius: 2px; background: var(--border);"
      ></div>
    </div>
    <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
      <i
        class="ti ti-search"
        style="font-size:15px; vertical-align:-2px; margin-left:4px;"
        aria-hidden="true"
      ></i>
      מאמת מול מתחרים בשוק...
    </p>
  </div>

  <div
    style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;"
  >
    <div
      style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem;"
    >
      <div
        style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;"
      >
        <p style="font-weight: 500; font-size: 15px; margin: 0;">
          חשבונית אוטומטית לפרילנסרים
        </p>
        <span
          style="background: var(--bg-success); color: var(--text-success); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap;"
        >
          8/10
        </span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 10px;">
        אינטגרציה ישירה עם מערכות חשבוניות ישראליות, ללא צורך בהזנה ידנית.
      </p>
      <div
        style="border-top: 0.5px solid var(--border); padding-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;"
      >
        <span
          style="background: var(--surface-1); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-secondary);"
        >
          מבוסס על סיגנלים
        </span>
        <span
          style="background: var(--surface-1); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-secondary);"
        >
          3 מתחרים נמצאו
        </span>
      </div>
    </div>

    <div
      style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem;"
    >
      <div
        style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;"
      >
        <p style="font-weight: 500; font-size: 15px; margin: 0;">מעקב שעות חכם עם AI</p>
        <span
          style="background: var(--bg-warning); color: var(--text-warning); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap;"
        >
          5/10
        </span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 10px;">
        שוק רווי יחסית, אך יש פוטנציאל בנישה של פרילנסרים דוברי עברית.
      </p>
      <div
        style="border-top: 0.5px solid var(--border); padding-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;"
      >
        <span
          style="background: var(--bg-warning); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-warning);"
        >
          <i
            class="ti ti-alert-triangle"
            style="font-size:13px; vertical-align:-2px; margin-left:3px;"
            aria-hidden="true"
          ></i>
          ללא עיגון מלא
        </span>
      </div>
    </div>
  </div>

  <p style="font-size: 12px; color: var(--text-muted); margin-top: 1rem;">
    הוצגו 5 מתוך 5 רעיונות
  </p>
</div>
```

זו סקיצה מבנית — הצבעים והסגנון כאן ניטרליים (design system כללי), אבל המבנה הוא בדיוק מה שתיארתי:

- **טופס קלט** — domain + slider ל-count
- **מחוון התקדמות** — פס שמראה איפה נמצאים מתוך 3 השלבים (Signal Gathering → Generation → Validation), עם טקסט דינמי מתחתיו
- **כרטיסי תוצאות** — כל `BusinessIdea` בכרטיס נפרד, badge צבעוני לפי `validationScore` (ירוק/צהוב/אדום), תג "ללא עיגון מלא" כשה-`groundedInSignals` הוא false, ותגית מספר מתחרים
- **שורת partial** למטה — "הוצגו X מתוך Y"

בפרויקט שלך זה כמובן יקבל את העור שלך — glassmorphism, neon accents, `colorDark`/`colorLight` variants שכבר בנית ל-terpene/genetics UI. המבנה הזה (grid responsive, badge לפי ציון, progress בר תלת-שלבי) הוא מה שיישאר קבוע; העיצוב הספציפי (blur, זוהר, גבולות עגולים חדים) יבוא מה-CSS conventions שלך.

רוצה שאבנה את זה בפועל כ-Angular components (standalone, signal store, PrimeNG) לפי הסקיצה הזו?

השדה קלט לא סותר את רעיון ה-pain points — הוא מה שנותן ל-SearXNG **תחום חיפוש**. בלי זה, אין ל-SearXNG על מה לחפש.

תחשוב על זה ככה: SearXNG לא "סורק את כל האינטרנט" ומוצא pain points אקראיים. הוא מריץ **query ספציפי**, למשל:

```
"freelancer invoicing" reddit "I wish there was"
```

המילה `"freelancer invoicing"` בתוך ה-query הזה — זו בדיוק ה-`domain` שהמשתמש הקליד. בלי שהמשתמש יגיד "פרילנסרים" או "כושר לקשישים" או משהו דומה, אין ל-query שום דבר לחפש עליו, וה-search יחזיר תוצאות חסרות משמעות או כלליות מדי.

## אז הזרימה בפועל היא:

```
1. משתמש מקליד domain (למשל "כלי AI לפרילנסרים")
        ↓
2. המערכת בונה queries עם ה-domain הזה:
   "freelancer AI tools" reddit "frustrated with"
   "freelancer AI tools" hackernews "pain point"
        ↓
3. SearXNG מריץ את ה-queries → מחזיר פוסטים אמיתיים מ-Reddit/HN
        ↓
4. LLM שולף מתוך התוצאות pain points אמיתיים (לא ממציא)
        ↓
5. LLM מייצר רעיונות שעונים על ה-pain points האלה
```

כלומר ה-domain הוא לא "עוד קלט גנרי" — הוא **ה-scope** שקובע איפה בכלל מחפשים. המשתמש עדיין נותן כיוון ("איזה תחום מעניין אותי"), אבל הרעיונות בתוכו מגיעים מ-pain points אמיתיים שנמצאו בחיפוש, לא מהדמיון של ה-LLM.

הבלבול המובן: זה נראה כאילו "אז מה בעצם השתנה מהגרסה הראשונה שדיברנו עליה?" — התשובה היא שבגרסה הראשונה ה-LLM היה ממציא ideas ישירות מה-domain בלי לחפש כלום קודם. עכשיו יש שלב ביניים (Phase 0) שמחפש אמיתי לפני שה-LLM כותב משהו.

זה הגיוני יותר עכשיו?
