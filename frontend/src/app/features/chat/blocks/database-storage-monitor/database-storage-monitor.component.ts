import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DatabaseStorageRenderData {
    databaseName?: string;
    tableCount?: number;
    totalRows?: number;
    totalSizeFormatted?: string;
    tables?: {
        tableName?: string;
        rowCount?: number;
        dataSizeFormatted?: string;
        indexSizeFormatted?: string;
        totalSizeFormatted?: string;
        percentOfDatabase?: number;
        totalSizeBytes?: number;
    }[];
}

const TABLE_COLORS = [
    'var(--color-table-1)',
    'var(--color-table-2)',
    'var(--color-table-3)',
    'var(--color-table-4)',
    'var(--color-table-5)',
    'var(--color-table-6)',
];

@Component({
    selector: 'app-database-storage-monitor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './database-storage-monitor.component.html',
    styleUrl: './database-storage-monitor.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseStorageMonitorComponent {
    data = input<DatabaseStorageRenderData>({});

    sortedTables = computed(() => {
        const tables = this.data().tables ?? [];
        return [...tables].sort((a, b) => (b.totalSizeBytes ?? 0) - (a.totalSizeBytes ?? 0));
    });

    donutGradient = computed(() => {
        const tables = this.sortedTables();
        if (!tables.length) return 'conic-gradient(var(--color-surface) 0% 100%)';

        let cumulative = 0;
        const stops: string[] = [];
        tables.forEach((table, i) => {
            const pct = table.percentOfDatabase ?? 0;
            const color = TABLE_COLORS[i % TABLE_COLORS.length];
            stops.push(`${color} ${cumulative}% ${cumulative + pct}%`);
            cumulative += pct;
        });

        return `conic-gradient(${stops.join(', ')})`;
    });

    tableColor(index: number): string {
        return TABLE_COLORS[index % TABLE_COLORS.length];
    }

    barWidth(table: { percentOfDatabase?: number }): number {
        return table.percentOfDatabase ?? 0;
    }
}
