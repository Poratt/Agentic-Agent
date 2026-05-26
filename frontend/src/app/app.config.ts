import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { AuthStore } from './core/store/auth.store';
import localeHe from '@angular/common/locales/he';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { withCredentialsInterceptor } from './core/interceptors/with-credentials.interceptor';

registerLocaleData(localeHe);


export function initializeApp(authService: AuthService, authStore: AuthStore) {
  return async () => {
    const user = await authService.checkSession();
    authStore.user.set(user);

  };
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([withCredentialsInterceptor, authInterceptor]),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService, AuthStore],
      multi: true,
    },
    { provide: LOCALE_ID, useValue: 'he-IL' },
    providePrimeNG({
      theme: {
        preset: Aura
      }
    })
  ]
};
