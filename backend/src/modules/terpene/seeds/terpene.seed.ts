import { DataSource } from 'typeorm';
import { Terpene } from '../entities/terpene.entity';

type TerpeneSeed = {
    name: string;
    description: string;
    scent: string;
    effects: string[];
    color: string;
};

/**
 * Idempotent seed for the terpene reference catalog.
 *
 * Inserts the canonical list of 17 Hebrew-named terpenes used by the
 * matching-preferences drawer. Re-running the seed is a no-op: existing
 * rows (matched by `name`) are left untouched.
 */
export async function seedTerpenes(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Terpene);

    const terpenes: TerpeneSeed[] = [
        { name: 'לימונן', description: 'טרפן ציטרוסי נפוץ', scent: 'לימון, אשכולית', effects: ['ממריץ', 'מרים מצב רוח'], color: '#FFD600' },
        { name: 'מירצן', description: 'הטרפן הנפוץ ביותר בקנאביס', scent: 'אדמה, פירות יער', effects: ['מרגיע', 'משכך כאבים'], color: '#66BB6A' },
        { name: 'לינאלול', description: 'ניחוח לבנדר מרגיע', scent: 'לבנדר, פרחים', effects: ['מרגיע', 'נגד חרדה'], color: '#CE93D8' },
        { name: 'קריופילן', description: 'טרפן ספייסי עם השפעה נגד דלקת', scent: 'פלפל שחור, ציפורן', effects: ['נגד דלקת', 'משכך כאבים'], color: '#FF7043' },
        { name: 'פיינן', description: 'ריח עצי אורן רענן', scent: 'אורן, עצים', effects: ['ממריץ', 'משפר זיכרון'], color: '#26A69A' },
        { name: 'טרפינאול', description: 'ניחוח פרחוני עדין', scent: 'לילך, תפוח', effects: ['מרגיע', 'מסייע לשינה'], color: '#EF9A9A' },
        { name: 'נרולידול', description: 'ריח עדין של עץ ופרחים', scent: 'ורד, קליפת עץ', effects: ['מרגיע', 'נגד פטריות'], color: '#80DEEA' },
        { name: 'אוסימן', description: 'טרפן פרחוני ועשבוני', scent: 'בזיליקום, עשבי תיבול', effects: ['נגד דלקת', 'נוגד חמצון'], color: '#A5D6A7' },
        { name: 'ביסבולול', description: 'טרפן מרגיע עם ניחוח פרחוני', scent: 'קמומיל, מתוק', effects: ['נגד חרדה', 'נגד דלקת'], color: '#FFF59D' },
        { name: 'גוואיול', description: 'ריח עצי ועשן עדין', scent: 'ורד, עץ', effects: ['נגד כאב', 'נגד דלקת'], color: '#FFCCBC' },
        { name: 'גרמצרן', description: 'טרפן עשבוני עם ניחוח עץ', scent: 'עצים, אדמה', effects: ['נגד דלקת'], color: '#BCAAA4' },
        { name: 'יומולן', description: 'טרפן דמוי קמומיל', scent: 'קמומיל, עשבי תיבול', effects: ['נגד דלקת', 'מרגיע'], color: '#FFE082' },
        { name: 'סלינה', description: 'טרפן עם ריח פירותי', scent: 'פירות, אדמה', effects: ['נגד חרדה'], color: '#80CBC4' },
        { name: 'סלינן', description: 'ניחוח ציטרוסי ועצי', scent: 'לימון, עצים', effects: ['ממריץ', 'נגד דלקת'], color: '#AED581' },
        { name: "פנצ'ול", description: 'ריח צמחי ומינטי', scent: 'נענע, אנוז', effects: ['ממריץ', 'מרענן'], color: '#4DB6AC' },
        { name: 'פרנסן', description: 'טרפן עצי עם ניחוח אורן', scent: 'אורן, לימון', effects: ['ממריץ', 'משפר קוגניציה'], color: '#81C784' },
        { name: 'קימן', description: 'ריח ציטרוסי ממריץ', scent: 'קמח, ציטרוס', effects: ['ממריץ', 'מרים מצב רוח'], color: '#FFB74D' },
    ];

    for (const terpene of terpenes) {
        const exists = await repo.findOne({ where: { name: terpene.name } });
        if (exists) {
            continue;
        }
        await repo.save(repo.create(terpene));
    }

    console.log(`Terpenes seeded: ${terpenes.length} rows (idempotent)`);
}