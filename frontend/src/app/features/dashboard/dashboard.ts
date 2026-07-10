import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../core/store/auth.store';
import { UsersStore } from '../../core/store/users.store';
import { PageStates } from '../../core/enums/page-states.enum';
import { getUserRoleData } from '../../core/enums/user-role.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, BadgeColor],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './dashboard.html',
})
export class Dashboard {
    protected authStore = inject(AuthStore);
    protected usersStore = inject(UsersStore);
    protected readonly getUserRoleData = getUserRoleData;
    protected readonly PageStates = PageStates;

    pageState = computed(() => this.usersStore.pageState());
}
