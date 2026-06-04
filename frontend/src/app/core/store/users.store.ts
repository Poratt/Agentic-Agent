import { Injectable, inject, signal, computed } from '@angular/core';
import { UserService } from '../services/user.service';
import { AuthStore } from './auth.store';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';
import { PageStates } from '../enums/page-states.enum';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsersStore {
  private userService = inject(UserService);
  private authStore = inject(AuthStore);

  // State
  private _users = signal<User[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Selectors
  users = computed(() => {
    return this._users();
  });

  loading = computed(() => {
    return this._loading();
  });

  error = computed(() => {
    return this._error();
  });

  currentUserProfile = computed(() => {
    const userId = this.currentUserId();
    return userId ? this._users().find((u) => u.id === userId) ?? null : null;
  });

  pageState = computed<PageStates>(() => {
    if (this._loading() && this._users().length === 0) {
      return PageStates.Loading;
    }

    if (this._error()) {
      return PageStates.Error;
    }

    if (this._users().length === 0) {
      return PageStates.Empty;
    }

    return PageStates.Ready;
  });

  // Actions
  loadCurrentUser() {
    const userId = this.currentUserId();
    if (!userId) return;

    this.getUserById(userId);
  }

  loadUsers() {
    this._loading.set(true);
    this._error.set(null);

    this.userService
      .list()
      .pipe(
        finalize(() => {
          this._loading.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          this._users.set(res.result ?? []);
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to load users');
        },
      });
  }

  updateUser(userId: number, userData: Partial<User>) {
    this._loading.set(true);
    this.userService
      .update(userId, userData)
      .pipe(
        finalize(() => {
          this._loading.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          const updatedUser = res.result;
          this._users.update((users) =>
            users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
          );
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to update user');
        },
      });
  }
  getUserById(userId: number) {
    this._loading.set(true);
    this.userService
      .getById(userId)
      .pipe(
        finalize(() => {
          this._loading.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          if (!res.result) return;

          this._users.update((users) => {
            const exists = users.some((u) => u.id === res.result.id);
            if (exists) {
              // אם קיים, נעדכן אותו במערך
              return users.map((u) => (u.id === res.result.id ? res.result : u));
            } else {
              return [...users, res.result];
            }
          });
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to get user');
        },
      });
  }

  deleteUser(userId: number) {
    this._loading.set(true);
    this.userService
      .delete(userId)
      .pipe(
        finalize(() => {
          this._loading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this._users.update((users) => users.filter((u) => u.id !== userId));
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to delete user');
        },
      });
  }

  updateUserRole(userId: number, role: UserRole) {
    this._loading.set(true);
    this.userService
      .updateRole(userId, role)
      .pipe(
        finalize(() => {
          this._loading.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          const updatedUser = res.result;
          this._users.update((users) =>
            users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
          );
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to update role');
        },
      });
  }

  clearError() {
    this._error.set(null);
  }

  private currentUserId(): number | null {
    const user = this.authStore.user();
    return user ? ((user as any).sub ?? user.id) : null;
  }
}
