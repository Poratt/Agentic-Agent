import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { UserService } from '../services/user.service';
import { AuthStore } from './auth.store';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';
import { PageStates } from '../enums/page-states.enum';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsersStore {
  private userService = inject(UserService);
  private authStore = inject(AuthStore);

  usersResource = httpResource<ServiceResultContainer<User[]>>(() => {
    if (!this.authStore.user()) return undefined as any;
    return `${environment.apiUrl}/users`;
  });

  users = computed(() => this.usersResource.value()?.result ?? []);
  loading = computed(() => this.usersResource.isLoading());
  error = signal<string | null>(null);

  currentUserProfile = computed(() => {
    const userId = this.currentUserId();
    return userId ? this.users().find((u) => u.id === userId) ?? null : null;
  });

  pageState = computed<PageStates>(() => {
    if (this.loading() && this.users().length === 0) {
      return PageStates.Loading;
    }

    if (this.error()) {
      return PageStates.Error;
    }

    if (this.users().length === 0) {
      return PageStates.Empty;
    }

    return PageStates.Ready;
  });

  reload(): void {
    this.usersResource.reload();
  }

  clearError() {
    this.error.set(null);
  }

  updateUser(userId: number, userData: Partial<User>) {
    this.userService.update(userId, userData).subscribe({
      next: () => {
        this.usersResource.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to update user');
      },
    });
  }

  getUserById(userId: number) {
    this.userService.getById(userId).subscribe({
      next: (res) => {
        if (!res.result) return;
        this.usersResource.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to get user');
      },
    });
  }

  deleteUser(userId: number) {
    this.userService.delete(userId).subscribe({
      next: () => {
        this.usersResource.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to delete user');
      },
    });
  }

  updateUserRole(userId: number, role: UserRole) {
    this.userService.updateRole(userId, role).subscribe({
      next: () => {
        this.usersResource.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to update role');
      },
    });
  }

  private currentUserId(): number | null {
    const user = this.authStore.user();
    return user ? ((user as any).sub ?? user.id) : null;
  }
}
