import { HttpHandlerFn, HttpRequest, HttpEvent } from '@angular/common/http';
import { withCredentialsInterceptor } from './with-credentials.interceptor';
import { environment } from '../../environments/environment';
import { vi } from 'vitest';
import { of } from 'rxjs';

describe('withCredentialsInterceptor', () => {
  function req(url: string, withCredentials?: boolean): HttpRequest<unknown> {
    return new HttpRequest('GET', url, { withCredentials });
  }

  it('clones API request with withCredentials: true', () => {
    let calledRequest: HttpRequest<unknown> | undefined;
    const handler = vi.fn((r: HttpRequest<unknown>) => {
      calledRequest = r;
      return of({} as HttpEvent<unknown>);
    }) as unknown as HttpHandlerFn;

    withCredentialsInterceptor(req(`${environment.apiUrl}/users`), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(calledRequest!.withCredentials).toBe(true);
    expect(calledRequest!.url).toBe(`${environment.apiUrl}/users`);
  });

  it('passes non-API requests through untouched', () => {
    let calledRequest: HttpRequest<unknown> | undefined;
    const handler = vi.fn((r: HttpRequest<unknown>) => {
      calledRequest = r;
      return of({} as HttpEvent<unknown>);
    }) as unknown as HttpHandlerFn;

    withCredentialsInterceptor(req('https://example.com/image.png'), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(calledRequest!.url).toBe('https://example.com/image.png');
    expect(calledRequest!.withCredentials).toBeFalsy();
  });

  it('does not double-set withCredentials if already set', () => {
    let calledRequest: HttpRequest<unknown> | undefined;
    const handler = vi.fn((r: HttpRequest<unknown>) => {
      calledRequest = r;
      return of({} as HttpEvent<unknown>);
    }) as unknown as HttpHandlerFn;

    withCredentialsInterceptor(req(`${environment.apiUrl}/users`, true), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(calledRequest!.withCredentials).toBe(true);
  });

  it('clones request and preserves other properties', () => {
    let calledRequest: HttpRequest<unknown> | undefined;
    const handler = vi.fn((r: HttpRequest<unknown>) => {
      calledRequest = r;
      return of({} as HttpEvent<unknown>);
    }) as unknown as HttpHandlerFn;

    withCredentialsInterceptor(new HttpRequest('POST', `${environment.apiUrl}/auth/login`, { email: 'a@b.com' }), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(calledRequest!.withCredentials).toBe(true);
    expect(calledRequest!.method).toBe('POST');
    expect(calledRequest!.url).toBe(`${environment.apiUrl}/auth/login`);
  });
});