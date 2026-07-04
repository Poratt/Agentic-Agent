/**
 * One-time backfill script for colorDark / colorLight columns.
 *
 * Usage:
 *   npx ts-node backend/src/seeds/backfill-color-variants.ts
 *
 * Requires DATABASE_URL env var pointing to the MySQL database.
 * Safe to run multiple times — only updates rows where colorDark/colorLight are null or default.
 */

import { DataSource } from 'typeorm';
import { deriveThemeColors } from '../core/utils/color-contrast.util';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL env var is required');
    process.exit(1);
}

const DEFAULT_COLOR = '#808080';

async function backfill() {
    const ds = new DataSource({
        type: 'mysql',
        url: DATABASE_URL,
        synchronize: false,
    });

    await ds.initialize();
    console.log('Connected to database.');

    // Backfill terpenes
    const terpenes = await ds.query('SELECT id, name, color, colorDark, colorLight FROM terpene');
    let terpeneUpdated = 0;
    for (const row of terpenes) {
        const color = row.color || DEFAULT_COLOR;
        const needsUpdate =
            !row.colorDark || row.colorDark === DEFAULT_COLOR ||
            !row.colorLight || row.colorLight === DEFAULT_COLOR;

        if (needsUpdate) {
            const { colorDark, colorLight } = deriveThemeColors(color);
            await ds.query(
                'UPDATE terpene SET colorDark = ?, colorLight = ? WHERE id = ?',
                [colorDark, colorLight, row.id],
            );
            console.log(`  terpene "${row.name}": ${color} → dark=${colorDark} light=${colorLight}`);
            terpeneUpdated++;
        }
    }
    console.log(`Terpenes: ${terpeneUpdated}/${terpenes.length} updated.`);

    // Backfill genetics
    const genetics = await ds.query('SELECT id, name, color, colorDark, colorLight FROM genetics');
    let geneticsUpdated = 0;
    for (const row of genetics) {
        const color = row.color || DEFAULT_COLOR;
        const needsUpdate =
            !row.colorDark || row.colorDark === DEFAULT_COLOR ||
            !row.colorLight || row.colorLight === DEFAULT_COLOR;

        if (needsUpdate) {
            const { colorDark, colorLight } = deriveThemeColors(color);
            await ds.query(
                'UPDATE genetics SET colorDark = ?, colorLight = ? WHERE id = ?',
                [colorDark, colorLight, row.id],
            );
            console.log(`  genetics "${row.name}": ${color} → dark=${colorDark} light=${colorLight}`);
            geneticsUpdated++;
        }
    }
    console.log(`Genetics: ${geneticsUpdated}/${genetics.length} updated.`);

    await ds.destroy();
    console.log('Done.');
}

backfill().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
