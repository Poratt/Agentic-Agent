import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

export interface RoleChangeRenderData {
    id?: number;
    email?: string;
    fullName?: string;
    role?: number;
    updatedAt?: string;
}

const ROLE_LABELS: Record<number, string> = {
    1: 'Admin',
    2: 'User',
};

@Component({
    selector: 'app-role-change-card',
    standalone: true,
    templateUrl: './role-change-card.component.html',
    styleUrl: './role-change-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleChangeCardComponent {
    data = input.required<RoleChangeRenderData>();

    roleLabel = computed(() => {
        const role = this.data().role;
        return role != null ? (ROLE_LABELS[role] ?? `תפקיד ${role}`) : null;
    });

    isAdmin = computed(() => this.data().role === 1);
}
