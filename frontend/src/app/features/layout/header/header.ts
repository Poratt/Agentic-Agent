import { CommonModule } from '@angular/common';
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthStore } from '../../../core/store/auth.store';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './header.css',
})
export class Header {
    protected authStore = inject(AuthStore);

    protected userEmail = computed(() => this.authStore.user()?.email || '');

    protected avatarLetter = computed(() => this.userEmail()[0]?.toUpperCase() || '?');
}
