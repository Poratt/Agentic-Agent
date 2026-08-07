import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, finalize, shareReplay, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';

// Single in-flight refresh shared by every concurrent 401, so a burst of
// parallel calls triggers exactly one rotation and the rest reuse its result.
// Without this, each 401 fires its own refresh while the backend rotates the
// token on every call, so all but the first fail → spurious logout.
let refreshInFlight: Observable<unknown> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      if (err.status !== 401) {
        return throwError(() => {
          return err;
        });
      }

      if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login') || req.url.includes('/auth/logout') || req.url.includes('/auth/me')) {
        return throwError(() => err);
      }

      if (!refreshInFlight) {
        refreshInFlight = authService.refresh().pipe(
          shareReplay({ bufferSize: 1, refCount: true }),
          finalize(() => {
            refreshInFlight = null;
          }),
        );
      }

      return refreshInFlight.pipe(
        switchMap((res) => {
          if ((res as { result?: unknown } | null)?.result) {
            authStore.user.set((res as { result: unknown }).result as never);
          }
          return next(req);
        }),
        catchError((refreshErr) => {
          authStore.logout();
          router.navigate(['/login']);
          return throwError(() => {
            return refreshErr;
          });
        })
      );
    })
  );
};