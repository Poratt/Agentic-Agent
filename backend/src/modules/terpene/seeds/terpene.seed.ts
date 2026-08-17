import { DataSource } from 'typeorm';
import { Terpene } from '../entities/terpene.entity';

type TerpeneSeed = {
    name: string;
    englishName: string;
    description: string;
    scent: string;
    effects: string[];
    color: string;
};

/**
 * Idempotent seed for the terpene reference catalog.
 *
 * Inserts the canonical list of 18 Hebrew-named terpenes used by the
 * matching-preferences drawer. Re-running the seed is a no-op: existing
 * rows (matched by `name`) are left untouched.
 */
export async function seedTerpenes(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(Terpene);

    const terpenes: TerpeneSeed[] = [
        {
            name: 'אוסימן',
            englishName: 'Ocimene',
            description: 'טרפן המצוי במגוון צמחים, כולל קנאביס, הידוע בתכונותיו המרגיעות והאנטי-דלקתיות.',
            scent: 'עשבוני, לימוני',
            effects: ['הרפיה', 'הפחתת חרדה'],
            color: '#8FBC8F'
        },
        {
            name: 'ביסבולול',
            englishName: 'Bisabolol',
            description: 'טרפן המעניק ניחוח עדין ותורם לתחושת רוגע כללית.',
            scent: 'פרחוני, עצי',
            effects: ['רוגע'],
            color: '#D7CCC8'
        },
        {
            name: 'גוואיול',
            englishName: 'Guaiol',
            description: 'טרפן המעניק לקנאביס גוון ייחודי של עישון ומתיקות, ותורם להעשרת החוויה הכללית של הזן.',
            scent: 'מעשן ומתוק',
            effects: ['מרגיע', 'משפר מצב רוח'],
            color: '#8B4513'
        },
        {
            name: 'גרמצרן',
            englishName: 'Germacrene',
            description: 'טרפן נדיר המעניק לצמחים ארומה מורכבת המשלבת תווים עשביים ומתקתקים. הוא תורם לפרופיל הטעם הייחודי של זנים מסוימים.',
            scent: 'עשבי, מתקתק, פירותי עם נגיעות של עץ',
            effects: ['מרגיע', 'משפר מצב רוח'],
            color: '#A4C639'
        },
        {
            name: 'טרפינאול',
            englishName: 'Terpinolene',
            description: 'טרפן המקדם תחושת שלווה ורוגע, המשמש לעיתים קרובות להפחתת מתחים ותמיכה בשינה.',
            scent: 'פרחוני, הדרים, עצי',
            effects: ['הרפיה', 'שלווה', 'הפגת מתחים'],
            color: '#E1BEE7'
        },
        {
            name: 'טרפינולן',
            englishName: 'Terpinolene',
            description: 'טרפן המעניק השפעות מעוררות ומעלה את רמת המיקוד ומצב הרוח.',
            scent: 'פרחוני, עצי',
            effects: ['אנרגיה', 'שיפור מצב הרוח', 'מיקוד'],
            color: '#C5E1A5'
        },
        {
            name: 'יומולן',
            englishName: 'Humulene',
            description: 'טרפן בעל תכונות מרגיעות המסייע בהפגת חרדה ותמיכה בשינה. הוא ידוע ביכולתו להשפיע על מצב הרוח ולהעניק תחושת שלווה.',
            scent: 'פרחוני, לבנדר, הדרים קלים ומתיקות עדינה',
            effects: ['מרגיע', 'הפגת חרדה', 'תמיכה בשינה'],
            color: '#B19CD9'
        },
        {
            name: 'לימונן',
            englishName: 'Limonene',
            description: 'טרפן המוכר בזכות השפעתו על שיפור מצב הרוח ויכולתו להפחית מתחים.',
            scent: 'הדרים, לימוני ומרענן',
            effects: ['שיפור מצב הרוח', 'הפגת מתחים', 'אנטי-דלקתי'],
            color: '#FDD835'
        },
        {
            name: 'לינאלול',
            englishName: 'Linalool',
            description: 'טרפן המזוהה עם פרחי הלבנדר, הידוע בתכונותיו המרגיעות והמרפיעות.',
            scent: 'פרחוני מתוק עם נגיעות הדרים',
            effects: ['רוגע', 'הפגת חרדה', 'שיכוך כאבים'],
            color: '#B39DDB'
        },
        {
            name: 'מירצן',
            englishName: 'Myrcene',
            description: "הטרפן הנפוץ ביותר בקנאביס, המזוהה עם השפעות מרגיעות עמוקות ותחושת 'couch-lock'.",
            scent: 'אדמתי, מושקי עם רמזים של ציפורן',
            effects: ['הרפיה', 'הפגת מתחים', 'סדטיבי'],
            color: '#556B2F'
        },
        {
            name: 'נרולידול',
            englishName: 'Nerolidol',
            description: 'טרפן בעל תכונות פרחוניות ועציות התורם לארומה של הצמח ופועל בסינרגיה עם קנבינואידים להגברת ההשפעות הטיפוליות (אפקט ה-Entourage).',
            scent: 'פרחוני, עצי',
            effects: ['מרגיע', 'אנטי-דלקתי', 'משכך כאבים'],
            color: '#F8BBD0'
        },
        {
            name: 'סלינה',
            englishName: 'Selina',
            description: 'טרפן התורם לפרופיל הריח וההשפעה של זני קנאביס שונים.',
            scent: 'פרחוני, לבנדר, הדרים קל',
            effects: ['רוגע', 'הפגת חרדה', 'תמיכה בשינה'],
            color: '#E0F2F1'
        },
        {
            name: 'סלינן',
            englishName: 'Salene',
            description: 'טרפן מסוג ססקוויטרפן הנמצא בזרעי סלרי, סיסקי (hops) ובזני קנאביס מסוימים. הוא ידוע בתכונותיו הנוגדות דלקת, נוגדות חמצון ואנטי-מיקרוביאליות. מחקרים ראשוניים מצביעים על כך שהוא עשוי לשמש כחומר מרגיע, כסייען בניקוז לימפטי וכמגן עצבי (neuroprotectant).',
            scent: 'עצי, אדמתי',
            effects: ['אנטי-דלקתי', 'נוגד חמצון', 'אנטי-מיקרוביאלי', 'מרגיע', 'מגן עצבי'],
            color: '#CCCCCC'
        },
        {
            name: 'פיינן',
            englishName: 'Pinene',
            description: 'טרפן הנפוץ במחטים של עצי אורן, הידוע ביכולתו לעודד ערנות ולסייע בריכוז. הוא נחשב למאזן של השפעות מרדימות של טרפנים אחרים.',
            scent: 'אורני, טרי, עצי',
            effects: ['ערנות', 'שיפור הריכוז', 'אנרגיה'],
            color: '#2E7D32'
        },
        {
            name: "פנצ'ול",
            englishName: 'Patchoulol',
            description: 'טרפן המוכר גם כ-p-cymene, בעל תכונות נוגדות דלקת וחמצון, המסייע בוויסות השפעות הקנבינואידים.',
            scent: 'הדרים',
            effects: ['הפגת חרדה', 'אנטי-דלקתי', 'שיכוך כאבים'],
            color: '#FFCC80'
        },
        {
            name: 'פרנסן',
            englishName: 'Phytol',
            description: 'טרפן נדיר המופיע בכמויות קטנות בקנאביס, הידוע בתכונותיו נוגדות דלקת ופטרת. הוא תורם לאפקט ה-Entourage ומסייע בוויסות ההשפעות הכלליות של הזן.',
            scent: 'רענן, פירותי',
            effects: ['נוגד דלקת', 'מרגיע', 'אנטי-פטרייתי'],
            color: '#C8E6C9'
        },
        {
            name: 'קימן',
            englishName: 'Cymene',
            description: 'טרפן המעניק לקנאביס ניחוחות מגוונים ומשפיע על רמת העירנות והמיקוד של המשתמש.',
            scent: 'הדרים, עצי, מתקתק ואדמתי',
            effects: ['עירנות', 'שיפור הריכוז'],
            color: '#CCCCCC'
        },
        {
            name: 'קריופילן',
            englishName: 'Caryophyllene',
            description: 'טרפן ייחודי המוכר ביכולתו להקל על כאבים ודלקות ולתמוך בתפקוד מערכת החיסון.',
            scent: 'פיקנטי, פלפלי עם רמזים של ציפורן',
            effects: ['הרפיה', 'שיכוך כאבים', 'אנטי-דלקתי'],
            color: '#A1887F'
        },
    ];

    for (const terpene of terpenes) {
        const exists = await repo.findOne({ where: { name: terpene.name } });
        if (exists) {
            // Update englishName if missing
            if (!exists.englishName) {
                exists.englishName = terpene.englishName;
                await repo.save(exists);
            }
            continue;
        }
        await repo.save(repo.create(terpene));
    }

    console.log(`Terpenes seeded: ${terpenes.length} rows (idempotent)`);
}
