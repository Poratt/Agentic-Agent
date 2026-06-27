import { DataSource } from 'typeorm';
import { Genetics } from '../entities/genetics.entity';

type GeneticsSeed = {
    name: string;
    description: string;
    parent1: string | null;
    parent2: string | null;
    origin: string;
    type: string;
    color: string;
};

type Split = { parent1: string | null; parent2: string | null };

type RawGeneticsSeed = {
    name?: unknown;
    genetics?: unknown;
    description?: unknown;
    type?: unknown;
    origin?: unknown;
    color?: unknown;
};

/**
 * Split a raw `genetics` cross string (e.g. "Chemdawg x Hindu Kush") into a
 * `parent1` / `parent2` pair. Phenotype-only rows (single parent with a
 * `(...)` cut note) collapse to `null / null` — the description, origin,
 * type, and color still describe the strain.
 *
 * Handles these shapes seen in the source catalog:
 *
 * - `"Chemdawg x Hindu Kush"`                  → Chemdawg / Hindu Kush
 * - `"Chemdawg x Hindu Kush (Florida Cut)"`    → Chemdawg / Hindu Kush (Florida Cut) — keep the cut note on parent2
 * - `"OG Kush Phenotype (GSC cut)"`            → null / null — single parent with a phenotype note
 * - `"OG Kush Breath x Mendo Montage"`         → OG Kush Breath / Mendo Montage
 * - `"Trop Cherry x #1 Strain"`                → Trop Cherry / #1 Strain (preserve the "#")
 * - `"Alien Cookies x Starfighter x Colombian"` → Alien Cookies / Starfighter — three-parent crosses are truncated to the first cross
 * - `"Jack Herer x White Widow"`                → Jack Herer / White Widow
 * - `null` / `undefined` / `""`                → null / null
 *
 * @param raw Cross string from the source JSON. May be null/undefined/empty.
 * @returns A pair of parent names. Either or both may be null.
 */
function splitGenetics(raw: string | null | undefined): Split {
    if (!raw) return { parent1: null, parent2: null };

    const cleaned = raw.replace(/\s+/g, ' ').trim();

    // Split on the FIRST x/×/X surrounded by spaces. Anything inside parentheses belongs to the side it sits on.
    const match = cleaned.match(/^(.+?)\s+[x×X]\s+(.+)$/);
    if (!match) {
        // No cross — single parent with a phenotype note, no parent2.
        return { parent1: null, parent2: null };
    }

    const parent1 = match[1].trim() || null;
    let parent2 = match[2].trim() || null;

    // If parent2 itself contains a second cross (e.g. "Starfighter x Colombian"),
    // keep only the first side of that cross — we model two-parent crosses only.
    const nestedMatch = parent2 && parent2.match(/^(.+?)\s+[x×X]\s+(.+)$/);
    if (nestedMatch) {
        parent2 = nestedMatch[1].trim() || null;
    }

    return { parent1, parent2 };
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Idempotent seed for the genetics reference catalog.
 *
 * Reads the canonical strain catalog from
 * `documents/features/todo/genetic-details-plan.md` (the fenced JSON block at
 * the top of the file) and inserts one row per strain. Re-running the seed
 * is a no-op: existing rows (matched by `name`) are left untouched.
 *
 * Before insertion the rows pass through a one-time dedupe pass — see
 * `normalizeRows` for the exact rules. If any duplicate name survives the
 * pass the seed aborts with a clear error rather than swallowing the
 * `ER_DUP_ENTRY` from MySQL.
 */
export async function seedGenetics(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Genetics);

    const rows = loadRawRows();
    const normalized = normalizeRows(rows);

    let insertedCount = 0;
    for (const row of normalized) {
        const exists = await repo.findOne({ where: { name: row.name } });
        if (exists) {
            continue;
        }
        await repo.save(repo.create(row));
        insertedCount += 1;
    }

    console.log(`Genetics seeded: ${insertedCount} rows (idempotent, after dedupe)`);
}

/**
 * One-time normalization pass: sort by `name` ASC and resolve any duplicate
 * names according to §1.7 of the genetics plan.
 *
 * Rules:
 *
 * 1. Sort rows by `name` ASC and walk consecutive duplicates.
 * 2. For each duplicate, keep the row with the longer non-empty `description`,
 *    tie-break by non-empty `origin`, then `type`. Final tie → keep first.
 * 3. If the duplicate is a genuinely different strain (different `origin` or
 *    `type`), append `" (2)"` to the LATER one's name. Otherwise drop the
 *    duplicate and log a warning.
 * 4. After normalization, assert `new Set(rows.map(r => r.name)).size ===
 *    rows.length`. If false, abort with a clear error message naming the
 *    remaining duplicate strain(s).
 */
function normalizeRows(rawRows: GeneticsSeed[]): GeneticsSeed[] {
    if (rawRows.length === 0) return rawRows;

    const sorted = [...rawRows].sort((a, b) => a.name.localeCompare(b.name, 'he'));

    const kept: GeneticsSeed[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < sorted.length; ) {
        let group = [sorted[i]];
        let j = i + 1;
        while (j < sorted.length && sorted[j].name === sorted[i].name) {
            group.push(sorted[j]);
            j += 1;
        }

        if (group.length === 1) {
            kept.push(group[0]);
        } else {
            // Sort within group: prefer longer description, then origin, then type.
            group.sort((a, b) => {
                const descDiff = (b.description?.length ?? 0) - (a.description?.length ?? 0);
                if (descDiff !== 0) return descDiff;
                const originDiff = (b.origin ? 1 : 0) - (a.origin ? 1 : 0);
                if (originDiff !== 0) return originDiff;
                const typeDiff = (b.type ? 1 : 0) - (a.type ? 1 : 0);
                if (typeDiff !== 0) return typeDiff;
                return 0;
            });

            const winner = group[0];
            const rest = group.slice(1);

            for (const dup of rest) {
                const genuinelyDifferent = dup.origin !== winner.origin || dup.type !== winner.type;
                if (genuinelyDifferent) {
                    kept.push({ ...dup, name: `${dup.name} (2)` });
                    warnings.push(`Duplicate strain "${dup.name}" resolved with "(2)" suffix.`);
                } else {
                    warnings.push(
                        `Duplicate strain "${dup.name}" dropped (same origin/type as winner).`,
                    );
                }
            }

            kept.push(winner);
        }

        i = j;
    }

    const finalRows = kept.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const unique = new Set(finalRows.map((r) => r.name));
    if (unique.size !== finalRows.length) {
        const duplicates: string[] = [];
        const seen = new Set<string>();
        for (const row of finalRows) {
            if (seen.has(row.name)) {
                duplicates.push(row.name);
            } else {
                seen.add(row.name);
            }
        }
        const message = `seedGenetics: duplicate strain names survived normalization: ${duplicates.join(', ')}`;
        throw new Error(message);
    }

    for (const warning of warnings) {
        console.warn(`seedGenetics: ${warning}`);
    }

    return finalRows;
}

/**
 * Read the raw catalog from the fenced JSON block at the top of the
 * genetics plan markdown. Throws if the block cannot be located or parsed.
 */
function loadRawRows(): GeneticsSeed[] {
    const md = readPlanMarkdown();
    const json = extractJsonBlock(md);
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
        throw new Error('seedGenetics: expected an array at the top of the JSON block.');
    }

    const rows: GeneticsSeed[] = [];
    for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;
        const raw = entry as RawGeneticsSeed;
        const name = asString(raw.name);
        if (!name) continue;
        const description = asString(raw.description);
        const origin = asString(raw.origin);
        const type = asString(raw.type);
        const color = asString(raw.color);
        if (!color) continue;
        const { parent1, parent2 } = splitGenetics(asString(raw.genetics) || null);
        rows.push({ name, description, parent1, parent2, origin, type, color });
    }

    return rows;
}

function readPlanMarkdown(): string {
    // Lazy-required so the seed file does not have a hard dependency on the
    // plan file existing in the runtime container — only at seed time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const planPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'documents',
        'features',
        'todo',
        'genetic-details-plan.md',
    );
    return fs.readFileSync(planPath, 'utf8');
}

function extractJsonBlock(markdown: string): string {
    const fenceMatch = markdown.match(/```json\s*([\s\S]*?)```/);
    if (!fenceMatch) {
        throw new Error('seedGenetics: could not locate fenced ```json block in plan markdown.');
    }
    return fenceMatch[1].trim();
}
