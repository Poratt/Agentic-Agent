import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DatabaseMonitorService, DatabaseStorageSummary, DatabaseTableStorage } from '../../../core/services/database-monitor.service';

interface SvgSegment {
    tableName: string;
    percent: number;
    strokeDashArray: string;
    rotation: string;
    color: string;
    index: number;
    formattedSize: string;
}

@Component({
    selector: 'app-database-monitor-settings',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './database-monitor-settings.html',
    styleUrls: ['./database-monitor-settings.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseMonitorSettings implements OnInit {
    private readonly dbMonitorService = inject(DatabaseMonitorService);

    loading = signal(false);
    error = signal<string | null>(null);
    data = signal<DatabaseStorageSummary | null>(null);
    activeSegment = signal<number | null>(null);

    readonly radius = 40;
    readonly circumference = 2 * Math.PI * this.radius; // 251.327

    readonly topTables = computed<DatabaseTableStorage[]>(() => this.data()?.tables.slice(0, 6) ?? []);
    readonly allTables = computed<DatabaseTableStorage[]>(() => this.data()?.tables ?? []);
    readonly totalRowsFormatted = computed<string | null>(() => {
        const rows = this.data()?.totalRows;
        return rows != null ? rows.toLocaleString('he-IL') : null;
    });

    readonly chartSegments = computed<SvgSegment[]>(() => {
        const tables = this.topTables();
        if (!tables.length) return [];

        const total = tables.reduce((sum, t) => sum + t.percentOfDatabase, 0);
        if (total === 0) return [];

        let accumulatedPercent = 0;

        return tables.map((t, i) => {
            const percent = t.percentOfDatabase;
            const gap = tables.length > 1 ? 1.5 : 0;
            const strokeLength = Math.max(0, (percent / 100) * this.circumference - gap);
            const rotation = (accumulatedPercent / 100) * 360 - 90;
            accumulatedPercent += percent;

            return {
                tableName: t.tableName,
                percent,
                strokeDashArray: `${strokeLength} ${this.circumference}`,
                rotation: `${rotation}deg`,
                color: `var(--color-chart-${i + 1})`,
                index: i,
                formattedSize: t.totalSizeFormatted
            };
        });
    });

    readonly centerLabel = computed(() => {
        const activeIdx = this.activeSegment();
        if (activeIdx === null) return 'סך הכל';
        const segments = this.chartSegments();
        return segments[activeIdx]?.tableName ?? 'סך הכל';
    });

    readonly centerValue = computed(() => {
        const activeIdx = this.activeSegment();
        if (activeIdx === null) return this.data()?.totalSizeFormatted ?? '0B';
        const segments = this.chartSegments();
        return segments[activeIdx]?.formattedSize ?? '0B';
    });

    ngOnInit(): void {
        this.loadStorage();
    }

    async loadStorage(): Promise<void> {
        if (this.loading()) return;
        this.loading.set(true);
        this.error.set(null);
        try {
            const res = await firstValueFrom(this.dbMonitorService.getStorage());
            if (res.success) {
                this.data.set(res.result);
            } else {
                this.error.set(res.message);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load database storage';
            this.error.set(message);
        } finally {
            this.loading.set(false);
        }
    }

    getBarWidth(percent: number): string {
        return `${Math.max(1, percent) / 100}`;
    }

    getChartColor(index: number): string {
        return `var(--color-chart-${index + 1})`;
    }

    setActiveSegment(index: number): void {
        this.activeSegment.set(index);
    }

    clearActiveSegment(): void {
        this.activeSegment.set(null);
    }
}
