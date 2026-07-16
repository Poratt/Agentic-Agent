import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AnalyticsChartRenderData {
    chartType?: number;
    title?: string;
    summary?: string;
    maxValue?: number;
    series?: { label?: string; value?: number }[];
}

@Component({
    selector: 'app-analytics-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './analytics-chart.component.html',
    styleUrl: './analytics-chart.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class AnalyticsChartComponent {
    data = input.required<AnalyticsChartRenderData>();

    hasSeries = computed(() => {
        const s = this.data().series;
        return s != null && s.length > 0;
    });

    chartTypeLabel = computed(() => {
        const t = this.data().chartType;
        if (t === 1) return 'bar';
        if (t === 2) return 'line';
        if (t === 3) return 'pie';
        return 'bar';
    });

    effectiveMax = computed(() => {
        const explicit = this.data().maxValue;
        if (explicit != null && explicit > 0) return explicit;
        const series = this.data().series;
        if (!series || series.length === 0) return 100;
        return Math.max(...series.map(s => s.value ?? 0), 1);
    });

    barHeights = computed(() => {
        const max = this.effectiveMax();
        const series = this.data().series ?? [];
        return series.map(s => ((s.value ?? 0) / max) * 100);
    });

    barWidth = computed(() => {
        const count = (this.data().series ?? []).length;
        if (count === 0) return 20;
        return Math.max(260 / count - 4, 8);
    });

    polylinePoints = computed(() => {
        const series = this.data().series ?? [];
        if (series.length === 0) return '';
        const max = this.effectiveMax();
        const svgW = 300;
        const svgH = 120;
        const padX = 20;
        const padY = 10;
        const usableW = svgW - padX * 2;
        const step = series.length > 1 ? usableW / (series.length - 1) : usableW;
        return series.map((s, i) => {
            const x = padX + i * step;
            const y = padY + (1 - (s.value ?? 0) / max) * (svgH - padY * 2);
            return `${x},${y}`;
        }).join(' ');
    });

    pieGradient = computed(() => {
        const series = this.data().series ?? [];
        if (series.length === 0) return '';
        const total = series.reduce((sum, s) => sum + (s.value ?? 0), 0);
        if (total === 0) return '';
        const colors = [
            'var(--color-table-1)',
            'var(--color-table-2)',
            'var(--color-table-3)',
            'var(--color-table-4)',
            'var(--color-table-5)',
            'var(--color-table-6)',
        ];
        let accumulated = 0;
        const stops: string[] = [];
        series.forEach((s, i) => {
            const pct = ((s.value ?? 0) / total) * 100;
            const color = colors[i % colors.length];
            stops.push(`${color} ${accumulated}% ${accumulated + pct}%`);
            accumulated += pct;
        });
        return `conic-gradient(${stops.join(', ')})`;
    });

    pieSegments = computed(() => {
        const series = this.data().series ?? [];
        if (series.length === 0) return [];
        const total = series.reduce((sum, s) => sum + (s.value ?? 0), 0);
        if (total === 0) return [];
        const colors = [
            'var(--color-table-1)',
            'var(--color-table-2)',
            'var(--color-table-3)',
            'var(--color-table-4)',
            'var(--color-table-5)',
            'var(--color-table-6)',
        ];
        let accumulated = 0;
        return series.map((s, i) => {
            const pct = ((s.value ?? 0) / total) * 100;
            const color = colors[i % colors.length];
            const segment = { label: s.label, value: s.value, color, pct };
            accumulated += pct;
            return segment;
        });
    });
}
