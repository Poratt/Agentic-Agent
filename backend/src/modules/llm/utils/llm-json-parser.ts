/**
 * Strips optional markdown code fences from raw LLM content and parses the
 * remaining string as JSON. Returns `null` on any failure (no exception is
 * thrown) so the caller can decide how to log and recover.
 *
 * Used by reference-catalog enrichment calls (`GeneticsService.enrichBatch`,
 * `TerpeneService.enrichBatch`) where the LLM is asked to return ONLY JSON.
 * Defensive fence stripping is a safety net for the few models that wrap
 * their JSON in ```` ```json ... ``` ```` even when explicitly told not to.
 *
 * @param content Raw LLM response content. May be `null`, an empty string, or
 *   a fenced JSON blob. The function does not throw on any of these.
 * @param context Short label used in the failure log message — for example
 *   `'genetics-enrich'`. Helps when multiple enrichment sites share this helper.
 * @returns Parsed JSON object, or `null` if parsing failed.
 */
export function parseLlmJson<T>(content: string | null, context: string): T | null {
    if (!content) {
        return null;
    }

    let cleaned = content.trim();

    if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
    }

    if (!cleaned) {
        return null;
    }

    try {
        return JSON.parse(cleaned) as T;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        // eslint-disable-next-line no-console
        console.warn(`[${context}] Failed to parse LLM JSON: ${message}`);
        return null;
    }
}
