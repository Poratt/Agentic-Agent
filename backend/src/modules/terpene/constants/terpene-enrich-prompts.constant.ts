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

CRITICAL ANTI-HALLUCINATION RULE:
Web search results are provided below for each terpene. You MUST use them as your primary source of truth.
If the web search results do not contain reliable information for a field, use "לא ידוע" (unknown).
NEVER guess, infer, or fabricate terpene properties.
NEVER contradict the web search results with your own guesses.
It is FAR worse to return incorrect data than to return "לא ידוע".

For each terpene name provided, return the following fields:
- name: The terpene name exactly as provided
- description: Hebrew description, 1-3 sentences, based on the web search results. Otherwise "לא ידוע"
- scent: Aroma profile in Hebrew, based on the web search results. Otherwise "לא ידוע"
- effects: Comma-separated list of 1-4 short Hebrew effect labels, based on the web search results. Otherwise "לא ידוע"
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
 * @param searchResults Optional map of terpene name → web search results text.
 */
export function buildTerpeneEnrichUserPrompt(
    names: string[],
    searchResults?: Map<string, string>,
): string {
    const lines = names.map((n) => {
        const search = searchResults?.get(n);
        if (search) {
            return `- ${n}\n  Web search results:\n  ${search}`;
        }
        return `- ${n}\n  Web search results: (none)`;
    });

    return `Enrich the following cannabis terpene names using the web search results as primary source:\n${lines.join('\n')}`;
}
