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

    public readonly category = input.required<TooltipCategory>();
    public readonly name = input.required<string>();

    public readonly terpene = computed(() => {
        if (this.category() === 'terpene') {
            return this.terpeneStore.getByName(this.name());
        }
        return undefined;
    });

    public readonly genetics = computed(() => {
        if (this.category() === 'genetics') {
            return this.geneticsStore.getByName(this.name());
        }
        return undefined;
    });
}