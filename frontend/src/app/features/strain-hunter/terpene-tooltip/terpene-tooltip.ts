import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TerpeneStore } from '../../../core/store/terpene.store';

/**
 * Hover-popover card that shows a terpene's details (description, scent,
 * effects) when the user hovers a terpene chip in the matching-preferences
 * drawer.
 *
 * The accent color is taken from the backend row (`ITerpene.color`) and
 * injected as a CSS custom property — every other visual value comes from
 * the project's design tokens.
 */
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

    /** Hebrew name of the terpene to display. Must match `ITerpene.name` exactly. */
    readonly name = input.required<string>();

    /** Resolved terpene row, or `undefined` while the catalog is still loading. */
    readonly terpene = computed(() => this.store.getByName(this.name()));
}