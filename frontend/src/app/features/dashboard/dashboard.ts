import { Component, inject, computed, signal, ChangeDetectionStrategy, effect } from '@angular/core';
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
    protected readonly displayedUsersCount = signal(0);

    private readonly _tickerEffect = effect((onCleanup) => {
        const target = this.usersStore.users().length;
        if (target === 0) {
            this.displayedUsersCount.set(0);
            return;
        }

        let raf: number;
        const duration = 600;
        const start = performance.now();

        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            this.displayedUsersCount.set(Math.round(easeOut(progress) * target));

            if (progress < 1) {
                raf = requestAnimationFrame(tick);
            }
        };

        raf = requestAnimationFrame(tick);

        onCleanup(() => cancelAnimationFrame(raf));
    });
}
