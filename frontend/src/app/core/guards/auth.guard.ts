import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map, of, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.user()) return of(true);

  return from(authService.checkSession()).pipe(
    tap((user) => {
      if (user) {
        authStore.user.set(user);
      } else {
        router.navigate(['/login']);
      }
    }),
    map((user) => !!user),
  );
};
