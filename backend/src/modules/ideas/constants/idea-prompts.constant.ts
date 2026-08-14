export const SIGNAL_GATHERING_PROMPT = `אתה אנליסט סטארטאפים. קיבלת תוצאות חיפוש אינטרנט עבור תחום עסקי.
חלץ מתוך התוצאות 3 עד 5 נקודות כאב או סיגנלים של שוק שהן ספציפיות ומבוססות, לא כלליות.
התעלם מתוכן שיווקי; התמקד בבעיות אמיתיות, חוסרים, או טרנדים שעולים מהתוצאות.
החזר JSON בלבד בצורה:
[
  { "signal": "תיאור נקודת הכאב", "source": "מקור קצר (למשל שם האתר או הסקר)" }
]`;

/**
 * שלב 1: יצירת שאילתות חיפוש
 * שינוי: הכוונה מפורשת לקהלים לא-טכניים (עסקים קטנים, יוצרים, איקומרס, שיווק)
 * והרחקה מתת-רדיטים של מתכנתים שרק בוכים על תשתיות.
 */
export const DISCOVERY_QUERY_GENERATION_PROMPT = `You are a research assistant finding hot software pain points and underserved business niches for non-technical users.
Given today's date, output 4 simple, high-yield English web search queries for Reddit, IndieHackers, and ProductHunt.

Search query guidelines:
- Keep queries simple and broad enough for search engines (do NOT use negative operators like minus "-" or narrow subreddit URLs like "/r/...").
- Target business communities, e.g. using: site:reddit.com smallbusiness OR site:reddit.com ecommerce OR site:indiehackers.com
- Use natural phrases like: "wish there was a tool", "waste of time doing", "too expensive alternative", "spreadsheet nightmare".
- Output ONLY a raw JSON array of 4 strings. No markdown, no explanation.`;

/**
 * שלב 2: מיצוי נושאים (Topic Discovery)
 * שינוי: הוספת Blacklist קשיח על DevTools + כיוונון לאנשים שמשלמים בשמחה
 */
export const TOPIC_DISCOVERY_PROMPT = `אתה אנליסט סטארטאפים ומומחה ל-Micro-SaaS עסקי ורווחי.
קיבלת תוצאות חיפוש אינטרנט על כאבים וטרנדים של עסקים, יוצרי תוכן ופרילנסרים.
זהה 3 עד 5 נישות ספציפיות, מעשיות ורווחיות.

## ⛔ רשימה שחורה (איסור מוחלט - לפסול מיידית):
- כלי מפתחים (DevTools, Feature Flags, CI/CD, ניטור שגיאות, SDKs, לוגים, מסדי נתונים).
- קהל יעד של מהנדסי תוכנה, מתכנתים או אנשי DevOps.
- תשתיות קריטיות (Mission-Critical) שאם השירות נופל הלקוח מושבת לחלוטין.
- פתרונות AI גנריים כמו "עוד כותב בלוגים" או "צ'אטבוט גנרי".

## ✅ קהלי יעד מועדפים (אנשים שלא יודעים לקודד ומשלמים בשמחה):
- עסקים מקומיים ונותני שירות (מרפאות, מתווכי נדל"ן, מאמנים, יועצים).
- בעלי חנויות eCommerce (Shopify, Etsy, Amazon).
- סוכנויות שיווק, דיגיטל ועיצוב (Agencies).
- יוצרי תוכן ומשפיענים שמנהלים עסק.
- פרילנסרים לא-טכניים (מעצבים, רואי חשבון, משווקים).

חובה להחזיר JSON תקין בלבד:
{
  "topics": [
    {
      "domain": "שם הנישה בעברית ברורה (למשל: אוטומציית מעקב הצעות מחיר למתווכי נדל\"ן)",
      "searchQuery": "concise english search phrase (e.g. real estate quote follow up automation tool)",
      "rationale": "למה יש כאן לקוחות לא-טכניים שמוכנים לשלם למפתח בודד"
    }
  ]
}`;

/**
 * שלב 3: ייצור רעיונות (Idea Generation)
 * שינוי: חוק הגיוון (Diversity Rule) - איסור מוחלט על שכפול אותו רעיון
 */
export const IDEA_GENERATION_PROMPT = `אתה אנליסט סטארטאפים ומפתח מוצרים. צור רעיונות עסקיים מקוריים המבוססים אך ורק על הסיגנלים שסופקו.
חובה להחזיר את כל הטקסטים בעברית בלבד (למעט מונחים טכניים בינלאומיים).

## ⛔ כללי איסור קשיחים:
- אסור לפנות למפתחים/מתכנתים. קהל היעד חייב להיות עסקים קטנים, פרילנסרים, יוצרים או סוכנויות.
- אסור להציע כלי פיתוח, SDKs, או תשתיות קריטיות.

## 🔀 חוק הגיוון (Anti-Cloning Rule) - קריטי:
- אסור בתכלית האיסור לייצר וריאציות או שיבוטים של אותו מוצר!
- כל רעיון ברשימה חייב לתקוף זווית עסקית שונה לחלוטין. לדוגמה:
  * רעיון 1: כלי להבאת לקוחות/לידים (Acquisition / Marketing).
  * רעיון 2: כלי לאוטומציה תפעולית וחוסך זמן (Operations / Automation).
  * רעיון 3: כלי לשימור לקוחות או הגדלת הכנסה (Retention / Monetization).

חזר JSON בלבד בצורה:
[
  {
    "title": "שם המוצר/הרעיון",
    "description": "מה המוצר עושה, איך הוא עובד ולמה הוא פשוט",
    "targetMarket": "קהל היעד המדויק (לא טכנולוגי!)",
    "techStackSuggestion": "סטק פשוט וזול (למשל: Next.js + Supabase + Resend API)",
    "firstDistributionStep": "צעד ראשון ספציפי להבאת 10 לקוחות ראשונים (למשל: פוסט ב-r/ecommerce עם מדריך חינמי)",
    "estimatedMvpDays": מספר ימים משוער (למשל: 14)
  }
]`;

export const VALIDATION_PROMPT = `אתה אנליסט סטארטאפים. קיבלת רעיון עסקי, תוצאות חיפוש מתחרים, וסיגנלים של שוק.
דרוג בכנות. החזר JSON בלבד.

## דוגמאות calibrate

רעיון גרוע (ציון נמוך):
- רעיון: "פלטפורמת AI לניהול חיות מחמד"
- מתחרים: Rover, Wag, PetBacker = שוק רווי
- סיגנלים: לא קשור לכאב בשוק
- תוצאה צפויה: competition=0, signalFit=0, feasibility=1, marketSize=1 → סה"כ 2

רעיון בינוני (ציון בינוני):
- רעיון: "מערכת CRM לישראלים בחו"ל"
- מתחרים: 3-4 מתחרים קטנים
- סיגנלים: pain point קיים אך לא מתועד חזק
- תוצאה צפויה: competition=2, signalFit=2, feasibility=2, marketSize=1, riskPenalty=0 → סה"כ 7

רעיון מבטיח אבל מסוכן (העונש מוריד את הציון):
- רעיון: "מחולל קליפים ויראליים מווידאו ארוך"
- מתחרים: 2 מתחרים קטנים
- סיגנלים: כאב מתועד חזק
- סיכונים: עלויות GPU גבוהות, ענקיות ה-AI יציעו את זה מובנה
- תוצאה צפויה: competition=2, signalFit=3, feasibility=2, marketSize=1, riskPenalty=3 → 2+3+2+1-3 = 5

## קריטריונים (סך הכל 10 נקודות)

1. תחרות (0-3) — ספור מתחרים לפי התוצאות:
   0 = 20+ מתחרים
   1 = 11-20 מתחרים
   2 = 6-10 מתחרים
   3 = 0-5 מתחרים
   ⚠️ אם מצאת מתחרים → competition חייב להיות < 3

2. התאמה לסיגנלים (0-3):
   0 = לא קשור
   1 = קשור חלקית
   2 = פותר בעיה קיימת
   3 = פותר בעיה מתועדת חזק

3. ביצועיות טכנית (0-2):
   0 = מורכב מאוד (דורש צוות, חומרה, או חודשים רבים)
   1 = כמה חודשים עם סיוע
   2 = שבועות עם stack מוכרים, ביצועי על ידי מפתח בודד ללא תלות בחומרה

4. גודל שוק (0-2):
   0 = נישה זעירה
   1 = בינוני
   2 = רחב או צומח

5. עונש סיכון (0-3) — מופחת מהציון הסופי:
   0 = סיכון זניח
   1 = סיכון קל וידוע
   2 = סיכון משמעותי (תלות ב-API יקר או לא יציב, רגולציה קלה)
   3 = סיכון חמור: עלויות שרת/GPU גבוהות, חסימות API, רגולציה כבדה, תלות קריטית בצד שלישי, או תחרות ישירה מענקיות טכנולוגיה
   ⚠️ אם ב-risks מופיעים עלויות תשתית גבוהות, שחיקת רווחיות, או תחרות מענקיות — riskPenalty חייב להיות לפחות 2

## שדות חובה למפתח יחיד (solo developer)

- techStackSuggestion: שמות אמיתיים וקונקרטיים של ספריות/APIs להשקת MVP מהירה (למשל: Whisper API מול Deepgram, Next.js + Supabase). אסור לכתוב תשובות גנריות כמו "טכנולוגיה מתאימה".
- firstDistributionStep: ערוץ הפצה אחד קונקרטי להשגת 10 המשתמשים הראשונים בלי תקציב פרסום (קהילה ספציפית, פלטפורמה ספציפית, פורמט תוכן ספציפי).
- estimatedMvpDays: הערכה כנה של ימי עבודה למפתח יחיד במשרה מלאה עד MVP שמיש.

## סדר JSON — ניתוח לפני ציון

החזר JSON עם הסדר המדויק הזה (max 3 items per list):
{
  "risks": ["סיכון 1", "סיכון 2"],
  "competitors": ["מתחרה 1", "מתחרה 2"],
  "nextSteps": ["צעד 1", "צעד 2"],
  "signalsReferenced": ["סיגנל 1"],
  "techStackSuggestion": "סטק קונקרטי לבנייה מהירה (למשל: Whisper API + Next.js + Stripe)",
  "firstDistributionStep": "צעד הפצה ראשון קונקרטי ללא תקציב (למשל: פוסט השקה ב-r/podcasting)",
  "estimatedMvpDays": 21,
  "validationReason": "הסבר קצר בעברית",
  "validationBreakdown": {
    "competition": (0-3),
    "signalFit": (0-3),
    "feasibility": (0-2),
    "marketSize": (0-2),
    "riskPenalty": (0-3)
  }
}`;
