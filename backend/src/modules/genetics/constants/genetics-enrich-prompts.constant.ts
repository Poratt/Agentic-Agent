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

For each strain name provided, infer or look up:
- description: Hebrew description, 1-3 sentences, e.g. "זן חזק במיוחד שזכה במקומות ראשונים ב-Cannabis Cup..."
- parent1: First genetic parent name in Hebrew or English, or "לא ידוע"
- parent2: Second genetic parent name in Hebrew or English, or "לא ידוע"
- origin: Country or region of origin in Hebrew, e.g. "ארה"ב", "הולנד", "לא ידוע"
- type: One of "היברידי", "סאטיבה", or "אינדיקה"
- color: A hex color that fits the strain's character (e.g. "#228B22" for green/gorilla strains, "#FF6B35" for orange/energetic strains)

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
 */
export function buildGeneticsEnrichUserPrompt(names: string[]): string {
    return `Enrich the following cannabis strain names:\n${names.map((n) => `- ${n}`).join('\n')}`;
}
