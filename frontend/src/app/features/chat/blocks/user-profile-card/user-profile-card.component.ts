import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UserProfileRenderData {
    sub?: number;
    email?: string;
    role?: number;
    iat?: number;
    exp?: number;
}

const ROLE_LABELS: Record<number, string> = {
    1: 'Admin',
    2: 'User',
};

@Component({
    selector: 'app-user-profile-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-profile-card.component.html',
    styleUrl: './user-profile-card.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserProfileCardComponent {
    data = input.required<UserProfileRenderData>();

    roleLabel = computed(() => {
        const role = this.data().role;
        return role != null ? (ROLE_LABELS[role] ?? `Role ${role}`) : null;
    });

    isAdmin = computed(() => this.data().role === 1);

    formatTimestamp(ts?: number): string {
        if (ts == null) return '';
        try {
            return new Date(ts * 1000).toLocaleString('he-IL');
        } catch {
            return String(ts);
        }
    }
}
