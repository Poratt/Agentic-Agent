import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MatchingEngineStore, ScoredStrain } from '../../../core/store/matching-engine.store';
import { TerpeneStore } from '../../../core/store/terpene.store';
import { TerpeneTooltip } from '../terpene-tooltip/terpene-tooltip';

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

type TooltipPos = {
    name: string;
    top: number;
    left: number;
    openUp: boolean;
};

const TOOLTIP_W = 240;
const TOOLTIP_H = 140;
const GAP = 8;

@Component({
    selector: 'app-matching-preferences-drawer',
    standalone: true,
    imports: [CommonModule, FormsModule, DrawerModule, ButtonModule, TerpeneTooltip],
    templateUrl: './matching-preferences-drawer.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./matching-preferences-drawer.css'],
})
export class MatchingPreferencesDrawer {
    private readonly engine = inject(MatchingEngineStore);
    private readonly terpeneStore = inject(TerpeneStore);

    readonly visible = model<boolean>(false);
    readonly items = input<Record<string, unknown>[]>([]);
    readonly geneticsFilter = signal('');

    /** Fixed-position tooltip state — null = hidden */
    readonly tooltip = signal<TooltipPos | null>(null);

    readonly categories = computed<CategoryGroup[]>(() => {
        const items = this.items();
        const geneticsItems = this.collectGenetics(items);
        const filter = this.geneticsFilter().trim().toLowerCase();
        const filteredGenetics = filter.length === 0
            ? geneticsItems
            : geneticsItems.filter((name) => name.toLowerCase().includes(filter));

        return [
            { category: 'terpene', title: 'טרפנים', items: this.collectTerpenes(items) },
            { category: 'genetics', title: 'גנטיקה', items: filteredGenetics },
        ];
    });

    readonly hasGenetics = computed(() => this.collectGenetics(this.items()).length > 0);

    readonly preview = computed<PreviewItem[]>(() => {
        const top = this.engine.topScored(this.items(), 5);
        return top.map((item) => this.toPreview(item));
    });

    readonly hasPreview = computed(() => this.preview().length > 0);
    readonly hasPreferences = this.engine.hasAnyPreference;
    readonly weights = this.engine.weights;
    readonly crossfaderValue = computed(() => 100 - this.weights().terpene);

    readonly PrefState = { Neutral: 'neutral', Like: 'like', Love: 'love', Avoid: 'avoid' } as const;

    constructor() {
        effect(() => {
            const items = this.items();
            if (items.length === 0) return;
            console.log('All Terpenes:', this.collectTerpenes(items));
            console.log('All Genetics:', this.collectGenetics(items));
        });

        effect(() => {
            if (this.visible()) {
                this.terpeneStore.loadAll();
            }
        });
    }

    chipClass(category: 'terpene' | 'genetics', name: string): string {
        const state = this.engine.prefState(`${category}:${name}`);
        return `${category}-chip chip-${state}`;
    }

    chipLabel(category: 'terpene' | 'genetics', name: string): string {
        const state = this.engine.prefState(`${category}:${name}`);
        switch (state) {
            case 'love': return 'ph-heart ph-fill';
            case 'like': return 'ph-bookmark-simple ph-fill';
            case 'avoid': return 'ph-prohibit';
            default: return '';
        }
    }

    cycle(category: 'terpene' | 'genetics', name: string): void {
        this.engine.cyclePref(`${category}:${name}`);
    }

    onChipEnter(category: 'terpene' | 'genetics', name: string, event: MouseEvent): void {
        if (category !== 'terpene') return;
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();

        // Vertical: prefer above, flip below if not enough room
        const openUp = rect.top >= TOOLTIP_H + GAP;
        const top = openUp ? rect.top - TOOLTIP_H - GAP : rect.bottom + GAP;

        // Horizontal: center on chip, clamp inside viewport
        const chipCenter = rect.left + rect.width / 2;
        const left = Math.max(GAP, Math.min(chipCenter - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - GAP));

        this.tooltip.set({ name, top, left, openUp });
    }

    onChipLeave(category: 'terpene' | 'genetics'): void {
        if (category !== 'terpene') return;
        this.tooltip.set(null);
    }

    onWeightChange(category: 'terpene' | 'genetics', event: Event): void {
        const raw = Number((event.target as HTMLInputElement).value);
        this.engine.setWeight(category, 100 - raw);
    }

    onGeneticsSearch(event: Event): void {
        this.geneticsFilter.set((event.target as HTMLInputElement).value);
    }

    clearGeneticsSearch(): void {
        this.geneticsFilter.set('');
    }

    categoryPreferenceCount(category: 'terpene' | 'genetics'): number {
        const prefix = `${category}:`;
        const prefs = this.engine.prefs();
        let count = 0;
        for (const key of Object.keys(prefs)) {
            if (key.startsWith(prefix)) count += 1;
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
            if (typeof raw !== 'string' || !raw || raw === 'לא ידוע') continue;
            for (const part of raw.split(',')) {
                const trimmed = part
                    .replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, '')
                    .replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, '')
                    .trim();
                if (trimmed) set.add(trimmed);
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
                    if (trimmed) set.add(trimmed);
                }
            }
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'he'));
    }

    private toPreview(item: ScoredStrain): PreviewItem {
        return {
            name: this.formatName(item['name']),
            score: item.score,
            penalty: item.penalty,
            penaltyIngredient: item.penaltyIngredient,
        };
    }

    private formatName(value: unknown): string {
        return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'ללא שם';
    }
}