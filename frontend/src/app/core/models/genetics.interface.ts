/**
 * Single genetics/strain record returned by the backend genetics catalog API.
 *
 * `description`, `parent1`, `parent2`, `origin`, and `type` are optional —
 * the seed populates most rows with all fields, but the schema allows partial
 * records (e.g. phenotype-only strains end up with `parent1 = parent2 = null`).
 *
 * `color` is a per-strain accent hex string used by the frontend to tint UI
 * accents (dot, icon). It is data, not a design-system token.
 */
export interface IGenetics {
    id: number;
    name: string;
    description?: string;
    parent1?: string;
    parent2?: string;
    origin?: string;
    type?: string;
    color: string;
}