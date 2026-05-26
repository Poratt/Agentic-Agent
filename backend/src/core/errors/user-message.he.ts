import { AppErrorCode } from './app-error-code';

const HEBREW_MESSAGES: Record<string, string> = {
  [AppErrorCode.VALIDATION_ERROR]: 'יש שגיאה בפרטים שהוזנו. נא לבדוק ולנסות שוב.',
  [AppErrorCode.NOT_FOUND]: 'המידע המבוקש לא נמצא.',
  [AppErrorCode.UNAUTHORIZED]: 'אין הרשאה לפעולה זו. נא להתחבר ולנסות שוב.',
  [AppErrorCode.FORBIDDEN]: 'אין לך הרשאה לבצע פעולה זו.',
  [AppErrorCode.INVALID_URL]: 'הקישור שהוזן אינו תקין.',
  [AppErrorCode.SCRAPE_FAILED]: 'לא הצלחנו לסרוק את האתר. נסו שוב מאוחר יותר.',
  [AppErrorCode.CLIENT_DELETE_FAILED]: 'מחיקת הלקוח נכשלה. נסו שוב מאוחר יותר.',
  [AppErrorCode.UPDATE_FAILED]: 'העדכון נכשל. נסו שוב מאוחר יותר.',

  [AppErrorCode.AUTH_MISSING_TOKEN]: 'נדרשת התחברות כדי להמשיך.',
  [AppErrorCode.AUTH_INVALID_TOKEN]: 'פג תוקף ההתחברות. התחברו מחדש.',
  [AppErrorCode.INVALID_CREDENTIALS]: 'פרטי ההתחברות שגויים.',
  [AppErrorCode.ACCESS_DENIED]: 'אין לך הרשאה לפעולה זו.',
  [AppErrorCode.EMAIL_IN_USE]: 'כתובת האימייל כבר בשימוש.',
  [AppErrorCode.SLUG_IN_USE]: 'ה־slug כבר בשימוש. בחרו מזהה אחר.',
  [AppErrorCode.ORIGIN_NOT_ALLOWED]: 'הבקשה נחסמה מטעמי אבטחה (Origin לא מורשה).',

  INTERNAL_SERVER_ERROR: 'אירעה שגיאה לא צפויה. נסו שוב מאוחר יותר.',
};

export function toHebrewUserMessage(code?: string, fallback?: string): string {
  if (code && HEBREW_MESSAGES[code]) return HEBREW_MESSAGES[code];
  if (fallback && looksLikeHebrew(fallback)) return fallback;
  return HEBREW_MESSAGES.INTERNAL_SERVER_ERROR;
}

function looksLikeHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}
