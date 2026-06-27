import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TerpeneStore } from '../../../core/store/terpene.store';
import { GeneticsStore } from '../../../core/store/genetics.store';

export type TooltipCategory = 'terpene' | 'genetics';

@Component({
    selector: 'app-tooltip',
    standalone: true,
    imports: [],
    templateUrl: './tooltip.html',
    styleUrl: './tooltip.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class Tooltip {
    private readonly terpeneStore = inject(TerpeneStore);
    private readonly geneticsStore = inject(GeneticsStore);

    /** Category switch — decides which store and which card template renders. */
    readonly category = input.required<TooltipCategory>();

    /** Display name — looked up in the matching store. */
    readonly name = input.required<string>();

    readonly terpene = computed(() =>
        this.category() === 'terpene' ? this.terpeneStore.getByName(this.name()) : undefined,
    );

    readonly genetics = computed(() =>
        this.category() === 'genetics' ? this.geneticsStore.getByName(this.name()) : undefined,
    );
}