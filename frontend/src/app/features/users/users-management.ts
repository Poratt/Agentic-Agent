import { Component, inject, computed, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';
import { UserRole } from '../../core/enums/user-role.enum';
import { PageStates } from '../../core/enums/page-states.enum';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { User } from '../../core/models/user.interface';

type UserColumn = {
    field: keyof User;
    label: string;
};

type UserTableRow = User & {
    roleLabel: string;
    roleHeLabel: string;
};

@Component({
    selector: 'app-users-management',
    standalone: true,
    imports: [CommonModule, InputTextModule, TableModule, BadgeColor],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './users-management.html',
})
export class UsersManagement {
    private table = viewChild<Table>('table');

    protected authStore = inject(AuthStore);
    protected usersStore = inject(UsersStore);
    protected readonly getUserRoleData = getUserRoleData;
    protected readonly PageStates = PageStates;
    protected readonly columns: UserColumn[] = [
        { field: 'id', label: 'ID' },
        { field: 'fullName', label: 'שם מלא' },
        { field: 'email', label: 'אימייל' },
        { field: 'role', label: 'תפקיד' },
        { field: 'createdAt', label: 'תאריך הרשמה' },
    ];
    protected readonly globalFilterFields = ['id', 'fullName', 'email', 'roleLabel', 'roleHeLabel', 'createdAt'];

    pageState = computed(() => this.usersStore.pageState());
    tableUsers = computed<UserTableRow[]>(() =>
        this.usersStore.users().map((user) => {
            const roleData = this.getUserRoleData(user.role);

            return {
                ...user,
                roleLabel: roleData?.label ?? '',
                roleHeLabel: roleData?.heLabel ?? '',
            };
        }),
    );

    applyGlobalFilter(event: Event) {
        this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    toggleRole(userId: number, currentRole: UserRole) {
        const targetRole = currentRole === UserRole.Admin ? UserRole.User : UserRole.Admin;
        this.usersStore.updateUserRole(userId, targetRole);
    }

    getUserRoleIcon(role: UserRole) {
        const icon = this.getUserRoleData(role)?.icon ?? '';
        return {
            ph: true,
            [icon]: !!icon,
            sm: true,
        };
    }

    deleteUser(userId: number) {
        if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו אינה הפיכה.')) {
            this.usersStore.deleteUser(userId);
        }
    }
}
