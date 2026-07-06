/**
 * Single terpene record returned by the backend terpene catalog API.
 *
 * `description`, `scent`, and `effects` are optional — the seed populates
 * most rows with all three, but the schema allows partial records.
 *
 * `color` is the raw AI-generated hex accent.
 * `colorDark` / `colorLight` are WCAG AA-safe variants derived from `color`
 * for dark and light theme backgrounds respectively.
 */
export interface ITerpene {
    id: number;
    name: string;
    englishName?: string;
    description?: string;
    scent?: string;
    effects?: string[];
    color: string;
    colorDark: string;
    colorLight: string;
}