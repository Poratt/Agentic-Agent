import { CommonModule } from '@angular/common';
import { Component, computed, inject, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { TieredMenu } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { AuthStore } from '../../../core/store/auth.store';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, TieredMenu],
    templateUrl: './header.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './header.css',
})
export class Header {
    protected authStore = inject(AuthStore);
    protected themeService = inject(ThemeService);

    protected userEmail = computed(() => this.authStore.user()?.email || '');

    protected avatarLetter = computed(() => this.userEmail()[0]?.toUpperCase() || '?');

    protected readonly themeMode = this.themeService.mode;

    @ViewChild('userMenu') userMenu?: TieredMenu;

    protected menuItems = computed<MenuItem[]>(() => [
        {
            label: this.themeMode() === 'dark' ? 'מצב בהיר' : 'מצב כהה',
            icon: this.themeMode() === 'dark' ? 'ph ph-sun' : 'ph ph-moon',
            command: () => this.themeService.toggle(),
        },
        { separator: true },
        {
            label: 'התנתקות',
            icon: 'ph ph-sign-out',
            command: () => this.authStore.logout(),
        },
    ]);

    protected toggleMenu(event: Event) {
        this.userMenu?.toggle(event);
    }
}
