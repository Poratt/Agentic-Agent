import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';


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

      return authService.refresh().pipe(
        switchMap(() => {
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