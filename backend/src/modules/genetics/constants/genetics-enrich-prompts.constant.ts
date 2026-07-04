/**
 * LLM prompt constants for batch-enriching the genetics (strain) reference catalog.
 *
 * Used by GeneticsService.enrichBatch() when new strain names are detected
 * in scraped Jane products but are absent from the DB.
 *
 * The LLM is asked to return ONLY valid JSON — no preamble, no markdown fences.
 * GeneticsService.parseGeneticsResponse() strips any accidental fences before parsing.
 */
export const GENETICS_ENRICH_SYSTEM_PROMPT = `You are a cannabis strain encyclopedia assistant.
Your task is to enrich a reference catalog of cannabis genetics (strains).
Return ONLY valid JSON — no explanation, no preamble, no markdown code fences.

CRITICAL ANTI-HALLUCINATION RULE:
Web search results are provided below for each strain. You MUST use them as your primary source of truth.
If the web search results do not contain reliable information for a field, use "לא ידוע" (unknown).
NEVER guess, infer, or fabricate genetic parentage, origin, or type.
NEVER contradict the web search results with your own guesses.
It is FAR worse to return incorrect data than to return "לא ידוע".

For each strain name provided, return the following fields:
- name: The strain name exactly as provided
- description: Hebrew description, 1-3 sentences, based on the web search results. Otherwise "לא ידוע"
- parent1: First genetic parent name in Hebrew or English, based on the web search results. Otherwise "לא ידוע"
- parent2: Second genetic parent name in Hebrew or English, based on the web search results. Otherwise "לא ידוע"
- origin: Country or region of origin in Hebrew, based on the web search results. Otherwise "לא ידוע"
- type: One of "היברידי", "סאטיבה", or "אינדיקה", based on the web search results. Otherwise "לא ידוע"
- color: A hex color that fits the strain's character (e.g. "#228B22" for green strains, "#FF6B35" for orange strains)

Return format:
{
  "genetics": [
    { "name": "...", "description": "...", "parent1": "...", "parent2": "...", "origin": "...", "type": "...", "color": "..." },
    ...
  ]
}`;

/**
 * Builds the user prompt for a genetics batch enrichment request.
 *
 * @param names The list of strain names to enrich. Assumed to be already
 *   deduplicated and filtered (empty / "לא ידוע" values removed upstream).
 * @param searchResults Optional map of strain name → web search results text.
 */
export function buildGeneticsEnrichUserPrompt(
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

    return `Enrich the following cannabis strain names using the web search results as primary source:\n${lines.join('\n')}`;
}
