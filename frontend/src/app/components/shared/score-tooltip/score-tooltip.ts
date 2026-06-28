import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreBreakdown } from '../../../core/store/matching-engine.store';

@Component({
    selector: 'app-score-tooltip',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './score-tooltip.html',
    styleUrl: './score-tooltip.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class ScoreTooltip {
    public readonly breakdown = input.required<ScoreBreakdown>();

    public readonly hasPenalty = computed(() => {
        return this.breakdown().penalty;
    });

    public readonly showTerpenes = computed(() => {
        const t = this.breakdown().terpene;
        return t.weight > 0 && (t.hits.length > 0 || t.misses.length > 0);
    });

    public readonly showGenetics = computed(() => {
        const g = this.breakdown().genetics;
        return g.weight > 0 && g.preferred.length > 0;
    });

    public readonly terpeneScoreText = computed(() => {
        const t = this.breakdown().terpene;
        return `${t.hits.length}/${t.hits.length + t.misses.length} התאמות`;
    });

    public readonly geneticsMisses = computed(() => {
        const g = this.breakdown().genetics;
        return g.preferred.filter(p => !g.hits.includes(p));
    });

    public readonly geneticsScoreText = computed(() => {
        const g = this.breakdown().genetics;
        return g.hasMatch ? 'התאמה נמצאה' : 'ללא התאמה';
    });
}