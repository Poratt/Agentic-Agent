import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../../core/store/auth.store';
import { ThemeService } from '../../../core/services/theme.service';
import { UsersStore } from '../../../core/store/users.store';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './header.html',
	styleUrl: './header.css',
})
export class Header {
	protected authStore = inject(AuthStore);
	protected userStore = inject(UsersStore);
	protected themeService = inject(ThemeService);

	currentUserProfile = this.userStore.currentUserProfile;


	protected userEmail = computed(() => this.authStore.user()?.email || '');

	protected avatarLetter = computed(() => this.userEmail()[0]?.toUpperCase() || '?');
}
