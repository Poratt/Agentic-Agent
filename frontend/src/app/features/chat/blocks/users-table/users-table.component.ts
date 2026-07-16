import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

export interface UsersTableRenderData {
    users?: { id?: number; fullName?: string; email?: string; role?: number; createdAt?: string }[];
}

const ROLE_LABELS: Record<number, string> = {
    1: 'Admin',
    2: 'User',
};

@Component({
    selector: 'app-users-table',
    standalone: true,
    imports: [CommonModule, TableModule],
    templateUrl: './users-table.component.html',
    styleUrl: './users-table.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class UsersTableComponent {
    data = input.required<UsersTableRenderData>();

    sortedUsers = computed(() => {
        const users = this.data().users;
        if (!users) return [];
        return [...users].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    });

    getRoleLabel(role?: number): string | null {
        return role != null ? (ROLE_LABELS[role] ?? `Role ${role}`) : null;
    }

    isAdmin(role?: number): boolean {
        return role === 1;
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('he-IL');
        } catch {
            return dateStr;
        }
    }
}
