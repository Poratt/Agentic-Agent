import { HttpRequest } from '@angular/common/http';
import { withCredentialsInterceptor } from './with-credentials.interceptor';
import { environment } from '../../environments/environment';

describe('withCredentialsInterceptor', () => {
  function req(url: string, withCredentials?: boolean): HttpRequest<unknown> {
    return new HttpRequest('GET', url, { withCredentials });
  }

  function next(): ReturnType<typeof vi.fn> {
    return vi.fn();
  }

  it('clones API request with withCredentials: true', () => {
    const handler = next();
    const request = req(`${environment.apiUrl}/users`);

    withCredentialsInterceptor(request, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    const cloned = handler.mock.calls[0][0];
    expect(cloned.withCredentials).toBe(true);
    expect(cloned.url).toBe(`${environment.apiUrl}/users`);
  });

  it('passes non-API requests through untouched', () => {
    const handler = next();
    const request = req('https://example.com/image.png');

    withCredentialsInterceptor(request, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(request);
  });

  it('does not double-set withCredentials if already set', () => {
    const handler = next();
    const request = req(`${environment.apiUrl}/users`, true);

    withCredentialsInterceptor(request, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(request);
  });

  it('clones request and preserves other properties', () => {
    const handler = next();
    const request = new HttpRequest('POST', `${environment.apiUrl}/auth/login`, { email: 'a@b.com' });

    withCredentialsInterceptor(request, handler);

    const cloned = handler.mock.calls[0][0];
    expect(cloned.withCredentials).toBe(true);
    expect(cloned.method).toBe('POST');
    expect(cloned.url).toBe(`${environment.apiUrl}/auth/login`);
  });
});
