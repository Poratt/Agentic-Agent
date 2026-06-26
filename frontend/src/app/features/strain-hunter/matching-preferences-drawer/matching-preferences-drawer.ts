import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
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

    readonly categories = computed<CategoryGroup[]>(() => {
        const items = this.items();

        return [
            {
                category: 'terpene',
                title: 'טרפנים',
                items: this.collectTerpenes(items),
            },
            {
                category: 'genetics',
                title: 'גנטיקה',
                items: this.collectGenetics(items),
            },
        ];
    });

    readonly preview = computed<PreviewItem[]>(() => {
        const top = this.engine.topScored(this.items(), 5);
        return top.map((item) => this.toPreview(item));
    });

    readonly hasPreview = computed(() => this.preview().length > 0);

    readonly hasPreferences = this.engine.hasAnyPreference;

    readonly weights = this.engine.weights;
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
        const value = Number(target.value);
        this.engine.setWeight(category, value);
    }

    reset(): void {
        this.engine.reset();
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
