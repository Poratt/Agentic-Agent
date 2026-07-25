import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DatabaseMonitorService, DatabaseStorageSummary, DatabaseTableStorage } from '../../../core/services/database-monitor.service';

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

    async ngOnInit(): Promise<void> {
        await this.loadStorage();
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
        } catch (err: any) {
            this.error.set(err?.error?.message ?? 'Failed to load database storage');
        } finally {
            this.loading.set(false);
        }
    }

    getTopTables(): DatabaseTableStorage[] {
        const d = this.data();
        return d ? d.tables.slice(0, 6) : [];
    }

    getAllTables(): DatabaseTableStorage[] {
        return this.data()?.tables ?? [];
    }

    getDonutGradient(): string {
        const tables = this.getTopTables();
        if (!tables.length) return '';
        const total = tables.reduce((sum, t) => sum + t.percentOfDatabase, 0);
        if (total === 0) return '';
        const segments: string[] = [];
        let accumulated = 0;
        for (const t of tables) {
            const start = (accumulated / total) * 100;
            accumulated += t.percentOfDatabase;
            const end = (accumulated / total) * 100;
            const colorIdx = tables.indexOf(t) + 1;
            segments.push(`var(--color-chart-${colorIdx}) ${start.toFixed(2)}% ${end.toFixed(2)}%`);
        }
        return `conic-gradient(${segments.join(', ')})`;
    }

    getBarWidth(percent: number): string {
        return `${Math.max(1, percent)}%`;
    }

    getChartColor(index: number): string {
        return `var(--color-chart-${index + 1})`;
    }
}
