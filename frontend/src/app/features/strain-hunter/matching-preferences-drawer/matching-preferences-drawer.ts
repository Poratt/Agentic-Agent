import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MatchingEngineStore, PrefState, ScoredStrain } from '../../../core/store/matching-engine.store';

type PreviewItem = {
    name: string;
    score: number;
    penalty: boolean;
    penaltyIngredient: string | null;
};

type CategoryGroup = {
    category: 'terpene' | 'genetics';
    title: string;
    items: string[];
};

@Component({
    selector: 'app-matching-preferences-drawer',
    standalone: true,
    imports: [CommonModule, FormsModule, DrawerModule, ButtonModule],
    templateUrl: './matching-preferences-drawer.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./matching-preferences-drawer.css'],
})
export class MatchingPreferencesDrawer {
    private readonly engine = inject(MatchingEngineStore);

    /** Two-way bound visibility for the drawer. */
    readonly visible = model<boolean>(false);

    /** Raw items to score for the top-5 preview. */
    readonly items = input<Record<string, unknown>[]>([]);

    /** Free-text filter for the genetics chip grid. */
    readonly geneticsFilter = signal('');

    readonly categories = computed<CategoryGroup[]>(() => {
        const items = this.items();
        const geneticsItems = this.collectGenetics(items);
        const filter = this.geneticsFilter().trim().toLowerCase();
        const filteredGenetics = filter.length === 0
            ? geneticsItems
            : geneticsItems.filter((name) => name.toLowerCase().includes(filter));

        return [
            {
                category: 'terpene',
                title: 'טרפנים',
                items: this.collectTerpenes(items),
            },
            {
                category: 'genetics',
                title: 'גנטיקה',
                items: filteredGenetics,
            },
        ];
    });

    /** Whether the genetics section should render at all (driven by raw data, not the current filter). */
    readonly hasGenetics = computed(() => this.collectGenetics(this.items()).length > 0);

    readonly preview = computed<PreviewItem[]>(() => {
        const top = this.engine.topScored(this.items(), 5);
        return top.map((item) => this.toPreview(item));
    });

    readonly hasPreview = computed(() => this.preview().length > 0);

    readonly hasPreferences = this.engine.hasAnyPreference;

    readonly weights = this.engine.weights;

    constructor() {
        effect(() => {
            const items = this.items();
            if (items.length === 0) return;
            console.log('All Terpenes:', this.collectTerpenes(items));
            console.log('All Genetics:', this.collectGenetics(items));
        });
    }

    /** Slider DOM value — inverted so the right end (terpene) reads as the high end of terpene weight. */
    readonly crossfaderValue = computed(() => 100 - this.weights().terpene);
    readonly PrefState = {
        Neutral: 'neutral',
        Like: 'like',
        Love: 'love',
        Avoid: 'avoid',
    } as const;

    chipClass(category: 'terpene' | 'genetics', name: string): string {
        const state = this.engine.prefState(`${category}:${name}`);
        return `${category}-chip chip-${state}`;
    }

    chipLabel(category: 'terpene' | 'genetics', name: string): string {
        const state = this.engine.prefState(`${category}:${name}`);
        switch (state) {
            case 'love':
                return 'ph-heart ph-fill';
            case 'like':
                return 'ph-bookmark-simple ph-fill';
            case 'avoid':
                return 'ph-prohibit';
            default:
                return '';
        }
    }

    cycle(category: 'terpene' | 'genetics', name: string): void {
        const key = `${category}:${name}`;
        this.engine.cyclePref(key);
    }

    onWeightChange(category: 'terpene' | 'genetics', event: Event): void {
        const target = event.target as HTMLInputElement;
        const raw = Number(target.value);
        // Slider is RTL: right end (terpene side) = value 0, left end (genetics side) = value 100.
        // Invert so dragging toward a label visually increases that category's weight.
        const value = 100 - raw;
        this.engine.setWeight(category, value);
    }

    onGeneticsSearch(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.geneticsFilter.set(target.value);
    }

    clearGeneticsSearch(): void {
        this.geneticsFilter.set('');
    }

    /** Number of set preferences for a category (used to decide whether to show its reset button). */
    categoryPreferenceCount(category: 'terpene' | 'genetics'): number {
        const prefix = `${category}:`;
        const prefs = this.engine.prefs();
        let count = 0;
        for (const key of Object.keys(prefs)) {
            if (key.startsWith(prefix)) {
                count += 1;
            }
        }
        return count;
    }

    hasCategoryPreferences(category: 'terpene' | 'genetics'): boolean {
        return this.categoryPreferenceCount(category) > 0;
    }

    resetCategory(category: 'terpene' | 'genetics'): void {
        const prefix = `${category}:`;
        for (const [key, state] of Object.entries(this.engine.prefs())) {
            if (key.startsWith(prefix) && state !== 'neutral') {
                this.engine.setPref(key, 'neutral');
            }
        }
    }

    reset(): void {
        this.engine.reset();
        this.geneticsFilter.set('');
    }

    private collectTerpenes(items: Record<string, unknown>[]): string[] {
        const set = new Set<string>();
        for (const item of items) {
            const raw = item['terpenes'];
            if (typeof raw !== 'string' || !raw || raw === 'לא ידוע') {
                continue;
            }
            for (const part of raw.split(',')) {
                const trimmed = part.replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, '')
                    .replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, '')
                    .trim();
                if (trimmed) {
                    set.add(trimmed);
                }
            }
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'he'));
    }

    private collectGenetics(items: Record<string, unknown>[]): string[] {
        const set = new Set<string>();
        for (const item of items) {
            for (const key of ['originStrain', 'parent1', 'parent2'] as const) {
                const value = item[key];
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if (trimmed) {
                        set.add(trimmed);
                    }
                }
            }
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'he'));
    }

    private toPreview(item: ScoredStrain): PreviewItem {
        const name = this.formatName(item['name']);
        return {
            name,
            score: item.score,
            penalty: item.penalty,
            penaltyIngredient: item.penaltyIngredient,
        };
    }

    private formatName(value: unknown): string {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
        return 'ללא שם';
    }
}
