/**
 * LLM prompt constants for batch-enriching the terpene reference catalog.
 *
 * Used by TerpeneService.enrichBatch() when new terpene names are detected
 * in scraped Jane products but are absent from the DB.
 *
 * The LLM is asked to return ONLY valid JSON — no preamble, no markdown fences.
 * TerpeneService.parseTerpeneResponse() strips any accidental fences before parsing.
 */
export const TERPENE_ENRICH_SYSTEM_PROMPT = `You are a cannabis terpene encyclopedia assistant.
Your task is to enrich a reference catalog of cannabis terpenes.
Return ONLY valid JSON — no explanation, no preamble, no markdown code fences.

For each terpene name provided, infer or look up:
- description: Hebrew description, 1-3 sentences, e.g. "הטרפן הנפוץ ביותר בקנאביס, מספק ריח הדיר וטעם ארצי..."
- scent: Aroma profile in Hebrew, e.g. "אדמה, פירות יער, פלפל"
- effects: Comma-separated list of 1-4 short Hebrew effect labels, e.g. "מרגיע, משכך כאבים, מעורר תיאבון"
- color: A hex color that fits the terpene's aromatic character (e.g. "#66BB6A" for citrus/sour, "#8D6E63" for earthy/wood)

Return format:
{
  "terpenes": [
    { "name": "...", "description": "...", "scent": "...", "effects": "...", "color": "..." },
    ...
  ]
}`;

/**
 * Builds the user prompt for a terpene batch enrichment request.
 *
 * @param names The list of terpene names to enrich. Assumed to be already
 *   deduplicated and filtered (empty / "לא ידוע" values removed upstream).
 */
export function buildTerpeneEnrichUserPrompt(names: string[]): string {
    return `Enrich the following cannabis terpene names:\n${names.map((n) => `- ${n}`).join('\n')}`;
}
