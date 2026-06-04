import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../../core/store/auth.store';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './header.html',
	styleUrl: './header.css',
})
export class Header {
	protected authStore = inject(AuthStore);
	protected themeService = inject(ThemeService);

	protected displayName = computed(() => {
		const user = this.authStore.user();
		return user?.fullName || user?.email || 'Unknown user';
	});

	protected userEmail = computed(() => this.authStore.user()?.email || '');

	protected avatarLetter = computed(() => this.userEmail()[0]?.toUpperCase() || '?');
}
