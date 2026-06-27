/**
 * Single terpene record returned by the backend terpene catalog API.
 *
 * `description`, `scent`, and `effects` are optional — the seed populates
 * most rows with all three, but the schema allows partial records.
 *
 * `color` is a per-terpene accent hex string used by the frontend to
 * tint UI accents (dot, icon, effect-tag borders). It is data, not a
 * design-system token.
 */
export interface ITerpene {
    id: number;
    name: string;
    description?: string;
    scent?: string;
    effects?: string[];
    color: string;
}