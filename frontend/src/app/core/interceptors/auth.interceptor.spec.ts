import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError, firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from '../store/auth.store';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';

describe('authInterceptor', () => {
  const user: User = {
    id: 1,
    email: 'a@b.com',
    role: UserRole.User,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let authStore: { user: { set: ReturnType<typeof vi.fn> }; logout: ReturnType<typeof vi.fn> };
  let authService: { refresh: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function req(url: string): HttpRequest<unknown> {
    return new HttpRequest('GET', url);
  }

  function nextWith(resp: HttpResponse<unknown> | HttpErrorResponse): HttpHandlerFn {
    return () => (resp instanceof HttpErrorResponse ? throwError(() => resp) : of(resp));
  }

  beforeEach(() => {
    authStore = { user: { set: vi.fn() }, logout: vi.fn() };
    authService = { refresh: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function call(url: string, handler: HttpHandlerFn): Promise<unknown> {
    return firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(req(url), handler)),
    );
  }

  it('passes non-401 errors through untouched', async () => {
    const err = new HttpErrorResponse({ status: 500, url: '/api/x' });
    await expect(call('/api/x', nextWith(err))).rejects.toBe(err);
    expect(authService.refresh).not.toHaveBeenCalled();
    expect(authStore.logout).not.toHaveBeenCalled();
  });

  it('does not refresh for auth endpoints (login/refresh/logout/me)', async () => {
    const err = new HttpErrorResponse({ status: 401, url: '/auth/refresh' });
    await expect(call('/auth/refresh', nextWith(err))).rejects.toBe(err);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('refreshes once and retries the original request on 401', async () => {
    authService.refresh.mockReturnValue(of({ result: user } as any));
    const ok = new HttpResponse({ status: 200, body: { ok: true } });
    const handler = vi.fn(nextWith(ok)) as unknown as HttpHandlerFn;

    const res = await call('/api/secure', handler);

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(authStore.user.set).toHaveBeenCalledWith(user);
    expect(handler).toHaveBeenCalledTimes(2); // original + retry
    expect(res).toBe(ok);
  });

  it('logs out and redirects when the refresh itself fails', async () => {
    authService.refresh.mockReturnValue(throwError(() => new Error('refresh failed')));
    const err = new HttpErrorResponse({ status: 401, url: '/api/secure' });

    await expect(call('/api/secure', nextWith(err))).rejects.toBeTruthy();
    expect(authStore.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('only refreshes a single time for concurrent 401s (single-flight)', async () => {
    authService.refresh.mockReturnValue(of({ result: user } as any));
    const ok = new HttpResponse({ status: 200, body: { ok: true } });
    const handler = vi.fn(nextWith(ok)) as unknown as HttpHandlerFn;

    const [a, b] = await Promise.all([
      call('/api/secure-a', handler),
      call('/api/secure-b', handler),
    ]);

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(a).toBe(ok);
    expect(b).toBe(ok);
  });
});
