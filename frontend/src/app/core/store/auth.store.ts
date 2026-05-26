import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.interface';
import { UserForLogin } from '../models/user-for-login.interface';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = signal<User | null>(null);
  userRole = computed(() => this.user()?.role);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  login(payload: UserForLogin) {
    this.loading.set(true);
    this.error.set(null);

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.user.set(res.result);
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login failed');
        this.loading.set(false);
      },
    });
  }

  register(payload: UserForLogin) {
    this.loading.set(true);
    this.error.set(null);

    this.authService.register(payload).subscribe({
      next: () => {
        this.router.navigate(['/login']);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Registration failed');
        this.loading.set(false);
      },
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.user.set(null);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.user.set(null);
        this.router.navigate(['/login']);
      },
    });
  }

  loadMe() {
    this.loading.set(true);

    this.authService.me().subscribe({
      next: (res) => {
        this.user.set(res.result);
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
      },
    });
  }

  clearError() {
    this.error.set(null);
  }
}
