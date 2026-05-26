import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authStore.user()) return of(true);

  return authService.me().pipe(
    tap((res) => {
      authStore.user.set(res.result);
    }),
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
