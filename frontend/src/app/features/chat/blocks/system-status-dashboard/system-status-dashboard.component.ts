import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SystemStatusRenderData {
    totalUsers?: number;
    activeSessions?: number;
    swaggerStatus?: string;
    uptime?: number;
    nodeVersion?: string;
}

@Component({
    selector: 'app-system-status-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './system-status-dashboard.component.html',
    styleUrl: './system-status-dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStatusDashboardComponent {
    data = input<SystemStatusRenderData>({});

    isSwaggerUp = computed(() => {
        const status = this.data().swaggerStatus;
        return status?.toLowerCase() === 'up' || status?.toLowerCase() === 'active';
    });

    uptimeFormatted = computed(() => {
        const uptime = this.data().uptime;
        if (uptime === undefined || uptime === null) return null;
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        return `${hours}h ${minutes}m`;
    });

    barData = computed(() => {
        const d = this.data();
        return [
            { label: 'Users', value: d.totalUsers ?? 0, color: 'var(--color-primary)' },
            { label: 'Sessions', value: d.activeSessions ?? 0, color: 'var(--color-secondary)' },
        ];
    });

    maxValue = computed(() => {
        const values = this.barData().map(b => b.value);
        return Math.max(...values, 1);
    });
}
