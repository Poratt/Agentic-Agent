מעולה, תמונה ברורה. הנה מה שנבנה:

**DB:** טבלה `terpene` עם `name`, `description`, `scent`, `effects`, `color`
**NestJS:** Entity + Service + Controller
**Angular:** Store + Service + Tooltip component

נתחיל מה-**NestJS** — Entity ו-Migration:

---

### 1. Entity — `terpene.entity.ts`

```ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("terpene")
export class Terpene {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  scent: string;

  @Column({ type: "simple-array", nullable: true })
  effects: string[];

  @Column({ nullable: true })
  color: string;
}
```

---

### 2. DTO — `terpene.dto.ts`

```ts
import { ApiProperty } from "@nestjs/swagger";

export class TerpeneDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description: string;

  @ApiProperty({ required: false })
  scent: string;

  @ApiProperty({ type: [String], required: false })
  effects: string[];

  @ApiProperty({ required: false })
  color: string;
}
```

---

### 3. Service — `terpene.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Terpene } from "./terpene.entity";

@Injectable()
export class TerpeneService {
  constructor(
    @InjectRepository(Terpene)
    private readonly repo: Repository<Terpene>,
  ) {}

  findAll(): Promise<Terpene[]> {
    return this.repo.find({ order: { name: "ASC" } });
  }

  findByName(name: string): Promise<Terpene | null> {
    return this.repo.findOne({ where: { name } });
  }

  upsert(data: Partial<Terpene>): Promise<Terpene> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
```

---

### 4. Controller — `terpene.controller.ts`

```ts
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { TerpeneService } from "./terpene.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Terpenes")
@UseGuards(JwtAuthGuard)
@Controller("terpenes")
export class TerpeneController {
  constructor(private readonly service: TerpeneService) {}

  @Get()
  @ApiOperation({ summary: "Get all terpenes with descriptions" })
  findAll() {
    return this.service.findAll();
  }

  @Get(":name")
  @ApiOperation({ summary: "Get terpene by name" })
  findOne(@Param("name") name: string) {
    return this.service.findByName(name);
  }
}
```

---

### 5. Module — `terpene.module.ts`

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Terpene } from "./terpene.entity";
import { TerpeneService } from "./terpene.service";
import { TerpeneController } from "./terpene.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Terpene])],
  providers: [TerpeneService],
  controllers: [TerpeneController],
  exports: [TerpeneService],
})
export class TerpeneModule {}
```

> אל תשכח להוסיף `TerpeneModule` ל-`AppModule`.

---

### 6. Seed — `terpene.seed.ts`

נזריע את 17 הטרפנים שמצאנו עם נתונים בסיסיים:

```ts
import { DataSource } from "typeorm";
import { Terpene } from "./terpene.entity";

export async function seedTerpenes(dataSource: DataSource) {
  const repo = dataSource.getRepository(Terpene);

  const terpenes: Partial<Terpene>[] = [
    {
      name: "לימונן",
      description: "טרפן ציטרוסי נפוץ",
      scent: "לימון, אשכולית",
      effects: ["ממריץ", "מרים מצב רוח"],
      color: "#FFD600",
    },
    {
      name: "מירצן",
      description: "הטרפן הנפוץ ביותר בקנאביס",
      scent: "אדמה, פירות יער",
      effects: ["מרגיע", "משכך כאבים"],
      color: "#66BB6A",
    },
    {
      name: "לינאלול",
      description: "ניחוח לבנדר מרגיע",
      scent: "לבנדר, פרחים",
      effects: ["מרגיע", "נגד חרדה"],
      color: "#CE93D8",
    },
    {
      name: "קריופילן",
      description: "טרפן ספייסי עם השפעה נגד דלקת",
      scent: "פלפל שחור, ציפורן",
      effects: ["נגד דלקת", "משכך כאבים"],
      color: "#FF7043",
    },
    {
      name: "פיינן",
      description: "ריח עצי אורן רענן",
      scent: "אורן, עצים",
      effects: ["ממריץ", "משפר זיכרון"],
      color: "#26A69A",
    },
    {
      name: "טרפינאול",
      description: "ניחוח פרחוני עדין",
      scent: "לילך, תפוח",
      effects: ["מרגיע", "מסייע לשינה"],
      color: "#EF9A9A",
    },
    {
      name: "נרולידול",
      description: "ריח עדין של עץ ופרחים",
      scent: "ורד, קליפת עץ",
      effects: ["מרגיע", "נגד פטריות"],
      color: "#80DEEA",
    },
    {
      name: "אוסימן",
      description: "טרפן פרחוני ועשבוני",
      scent: "בזיליקום, עשבי תיבול",
      effects: ["נגד דלקת", "נוגד חמצון"],
      color: "#A5D6A7",
    },
    {
      name: "ביסבולול",
      description: "טרפן מרגיע עם ניחוח פרחוני",
      scent: "קמומיל, מתוק",
      effects: ["נגד חרדה", "נגד דלקת"],
      color: "#FFF59D",
    },
    {
      name: "גוואיול",
      description: "ריח עצי ועשן עדין",
      scent: "ורד, עץ",
      effects: ["נגד כאב", "נגד דלקת"],
      color: "#FFCCBC",
    },
    {
      name: "גרמצרן",
      description: "טרפן עשבוני עם ניחוח עץ",
      scent: "עצים, אדמה",
      effects: ["נגד דלקת"],
      color: "#BCAAA4",
    },
    {
      name: "יומולן",
      description: "טרפן דמוי קמומיל",
      scent: "קמומיל, עשבי תיבול",
      effects: ["נגד דלקת", "מרגיע"],
      color: "#FFE082",
    },
    {
      name: "סלינה",
      description: "טרפן עם ריח פירותי",
      scent: "פירות, אדמה",
      effects: ["נגד חרדה"],
      color: "#80CBC4",
    },
    {
      name: "סלינן",
      description: "ניחוח ציטרוסי ועצי",
      scent: "לימון, עצים",
      effects: ["ממריץ", "נגד דלקת"],
      color: "#AED581",
    },
    {
      name: "פנצ'ול",
      description: "ריח צמחי ומינטי",
      scent: "נענע, אנוז",
      effects: ["ממריץ", "מרענן"],
      color: "#4DB6AC",
    },
    {
      name: "פרנסן",
      description: "טרפן עצי עם ניחוח אורן",
      scent: "אורן, לימון",
      effects: ["ממריץ", "משפר קוגניציה"],
      color: "#81C784",
    },
    {
      name: "קימן",
      description: "ריח ציטרוסי ממריץ",
      scent: "קמח, ציטרוס",
      effects: ["ממריץ", "מרים מצב רוח"],
      color: "#FFB74D",
    },
  ];

  for (const t of terpenes) {
    const exists = await repo.findOne({ where: { name: t.name } });
    if (!exists) {
      await repo.save(repo.create(t));
    }
  }

  console.log("✅ Terpenes seeded");
}
```

---

הכל ברור. הנה הקוד Angular — מותאם ל-conventions של הפרויקט (standalone, signals, `inject()`, `styleUrl` יחיד, שמות בלי `.component.`, tokens מ-`_variables.css` בלבד, glass-pattern דרך `::before` + `isolation: isolate`).

---

### 1. Interface — `core/models/terpene.interface.ts`

> שמות קבצים/ממשקים עוקבים אחרי ה-convention הקיים (`IChatMessage`, `IUser` וכו'): שימוש ב-`I` prefix ל-types שמייצגים ישויות.

```ts
export interface ITerpene {
    id: number;
    name: string;
    description?: string;
    scent?: string;
    effects?: string[];
    color: string;
}
```

---

### 2. Service — `core/services/terpene.service.ts`

> עוקב אחרי `ChatService` / `UserService`: `inject(HttpClient)`, `environment.apiUrl`, `Observable`, response wrapper `ServiceResultContainer<T>`.

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { ITerpene } from '../models/terpene.interface';

@Injectable({ providedIn: 'root' })
export class TerpeneService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/terpenes`;

    list(): Observable<ServiceResultContainer<ITerpene[]>> {
        return this.http.get<ServiceResultContainer<ITerpene[]>>(this.base);
    }
}
```

---

### 3. Store — `core/store/terpene.store.ts`

> עוקב אחרי `ChatStore`: signals גלויים, readonly `computed` indexes, subscribe עם `next/error`, אין `BehaviorSubject`.

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TerpeneService } from '../services/terpene.service';
import { ITerpene } from '../models/terpene.interface';

@Injectable({ providedIn: 'root' })
export class TerpeneStore {
    private service = inject(TerpeneService);

    terpenes = signal<ITerpene[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    /** Lookup table by Hebrew name — recomputed only when `terpenes` changes. */
    readonly byName = computed<ReadonlyMap<string, ITerpene>>(() => {
        const map = new Map<string, ITerpene>();
        for (const t of this.terpenes()) {
            map.set(t.name, t);
        }
        return map;
    });

    getByName(name: string): ITerpene | undefined {
        return this.byName().get(name);
    }

    loadAll() {
        // Cache: terpenes rarely change — load once per app lifetime.
        if (this.terpenes().length > 0 || this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.service.list().subscribe({
            next: (res) => {
                this.terpenes.set(res?.result ?? []);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(this.extractMessage(err, 'טעינת טרפנים נכשלה'));
                this.loading.set(false);
            },
        });
    }

    clearError() {
        this.error.set(null);
    }

    private extractMessage(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            const body = error.error;
            if (typeof body?.message === 'string') {
                return body.message;
            }
            if (typeof body === 'string') {
                return body;
            }
        }
        return fallback;
    }
}
```

---

### 4. Tooltip Component — `features/strain-hunter/terpene-tooltip/terpene-tooltip.ts`

> עוקב אחרי `Dropdown` (reusable presentation component, `Eager` change detection — זה ה-current project behavior שמור לפי angular-rules), `styleUrl` יחיד (לא `styleUrls`), ללא `*ngIf`/`*ngFor`.

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TerpeneStore } from '../../../core/store/terpene.store';

@Component({
    selector: 'app-terpene-tooltip',
    standalone: true,
    imports: [],
    templateUrl: './terpene-tooltip.html',
    styleUrl: './terpene-tooltip.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class TerpeneTooltip {
    private readonly store = inject(TerpeneStore);

    /** Hebrew name of the terpene to display (matches the chip text). */
    readonly name = input.required<string>();

    readonly terpene = computed(() => this.store.getByName(this.name()));
}
```

---

### 5. Template — `features/strain-hunter/terpene-tooltip/terpene-tooltip.html`

> RTL, `@if`/`@for` בלבד, `track` בכל `@for`. `--terpene-color` מוזרק מ-DB (data, לא token — לכן מותר inline style binding).

```html
@if (terpene(); as t) {
    <div class="terpene-card" [style.--terpene-color]="t.color">
        <header class="terpene-card-header">
            <span class="terpene-card-dot"></span>
            <h4 class="terpene-card-name">{{ t.name }}</h4>
        </header>

        @if (t.description) {
            <p class="terpene-card-desc">{{ t.description }}</p>
        }

        @if (t.scent) {
            <div class="terpene-card-row">
                <span class="ph ph-flower-lotus terpene-card-icon"></span>
                <span>{{ t.scent }}</span>
            </div>
        }

        @if (t.effects?.length) {
            <div class="terpene-card-effects">
                @for (effect of t.effects; track effect) {
                    <span class="terpene-card-effect-tag">{{ effect }}</span>
                }
            </div>
        }
    </div>
} @else {
    <div class="terpene-card terpene-card-empty">
        <span>אין מידע זמין</span>
    </div>
}
```

---

### 6. CSS — `features/strain-hunter/terpene-tooltip/terpene-tooltip.css`

> עוקב אחרי `.card` (glass pattern עם `::before` + `isolation: isolate`), nesting בתוך `:host`/`&`, אך ורק `var(--token)` מ-`_variables.css`. **צבע הטרפן הוא data, לא token** — לכן הוא מוזרק דרך `[style.--terpene-color]` ולא נכתב hardcoded כאן (למעט ה-fallback הפנימי).

```css
:host {
    display: inline-block;
    direction: rtl;
}

.terpene-card {
    /* Fallback if upstream forgets to set the inline color. */
    --terpene-color: var(--color-text-muted);

    position: relative;
    isolation: isolate;
    min-width: 200px;
    max-width: 260px;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    /* Glass blur lives on a pseudo-element so layout never negotiates with it. */
    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        backdrop-filter: blur(var(--glass-blur));
        -webkit-backdrop-filter: blur(var(--glass-blur));
        z-index: -1;
    }
}

.terpene-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
}

.terpene-card-dot {
    width: var(--space-2);
    height: var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--terpene-color);
    box-shadow: 0 0 var(--space-2) var(--terpene-color);
    flex-shrink: 0;
}

.terpene-card-name {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
}

.terpene-card-desc {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
}

.terpene-card-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

.terpene-card-icon {
    color: var(--terpene-color);
    font-size: var(--font-size-md);
    flex-shrink: 0;
}

.terpene-card-effects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
}

.terpene-card-effect-tag {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    color: var(--terpene-color);
    border: 1px solid var(--color-border);
    line-height: 1;
}

.terpene-card-empty {
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
}
```

---

### 7. שימוש ב-`matching-preferences-drawer.html`

> עוטפים כל chip של טרפן עם `<app-terpene-tooltip>` שמופיע ב-hover. PrimeNG `pTooltip` לא נדרש — זה component מותאם עם hover משלו, מה שמאפשר עיצוב מלא.

מחליפים את ה-`@for` של ה-chips:

```html
@for (name of group.items; track name) {
    <div class="chip-wrapper" [class.chip-wrapper-terpene]="group.category === 'terpene'">
        <button
            type="button"
            [class]="chipClass(group.category, name)"
            (click)="cycle(group.category, name)"
            [attr.aria-label]="group.title + ': ' + name"
        >
            @if (chipLabel(group.category, name); as iconClass) {
                <span class="ph chip-state" [class]="iconClass"></span>
            }
            <span class="chip-name">{{ name }}</span>
        </button>

        @if (group.category === 'terpene') {
            <div class="terpene-tooltip-anchor">
                <app-terpene-tooltip [name]="name" />
            </div>
        }
    </div>
}
```

ובקובץ ה-CSS של ה-drawer — מוסיפים:

```css
.chip-wrapper {
    position: relative;
    display: inline-block;

    .terpene-tooltip-anchor {
        display: none;
        position: absolute;
        bottom: calc(100% + var(--space-2));
        right: 50%;
        transform: translateX(50%);
        z-index: 1000;
        pointer-events: none;
    }

    /* The wrapper itself keeps the tooltip visible while hovering it,
       so users can move the cursor over the tooltip contents. */
    &:hover .terpene-tooltip-anchor {
        display: block;
    }

    &:hover .terpene-tooltip-anchor:hover .terpene-tooltip-anchor {
        display: block;
    }
}
```

---

### 8. טעינה ב-`MatchingPreferencesDrawer`

> effect שמגיב ל-`visible()` וקורא ל-`loadAll()` רק כשה-drawer נפתח (lazy load). ה-`TerpeneStore` כבר שומר cache פנימי כך שקריאות חוזרות הן no-op.

מוסיפים ל-`MatchingPreferencesDrawer`:

```ts
import { TerpeneStore } from '../../../core/store/terpene.store';
import { TerpeneTooltip } from '../terpene-tooltip/terpene-tooltip';

// ב-@Component decorator:
imports: [CommonModule, FormsModule, DrawerModule, ButtonModule, TerpeneTooltip],

// ב-class:
private readonly terpeneStore = inject(TerpeneStore);

constructor() {
    effect(() => {
        if (this.visible()) {
            this.terpeneStore.loadAll();
        }
    });
}
```

---

**סדר העבודה:**

1. צור את Entity + Module + Seed בNestJS ✅
2. הרץ את הseed
3. צור את הקבצים Angular לפי הסדר: `interface` → `service` → `store` → `terpene-tooltip`
4. הוסף לdrawer את ה-import וה-`effect`
