להעביר את llm.service.ts ל-backend/src/modules/llm/.
להוציא types כמו LlmRequest, LlmResponse, LlmMessage, LlmToolCall לקובץ llm.types.ts.
ליצור LlmModule שמייצא את LlmService.
לעדכן AdminAgentModule לייבא LlmModule.
להוסיף LlmController רק לקריאה תפעולית: providers/models/status.
לא להפוך את /llm/\* לכלי agent אוטומטי בשלב ראשון, אלא אם אתה באמת רוצה שהסוכן יוכל לבחור מודל לבד.
