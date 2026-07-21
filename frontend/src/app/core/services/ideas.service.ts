import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IdeasProgressEvent } from '../models/idea.interface';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdeasService {
  private base = `${environment.apiUrl}/ideas`;
  private authService = inject(AuthService);

  generateStream(domain: string, count: number): Observable<IdeasProgressEvent> {
    return new Observable<IdeasProgressEvent>((observer) => {
      const controller = new AbortController();
      const params = new URLSearchParams({ domain, count: String(count) });

      const attemptFetch = (isRetry: boolean) => {
        fetch(`${this.base}/generate/stream?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        })
          .then(async (response) => {
            if (response.status === 401 && !isRetry) {
              try {
                await firstValueFrom(this.authService.refresh());
                attemptFetch(true);
              } catch {
                observer.error(new Error('Session expired, please log in again'));
              }
              return;
            }

            if (!response.ok) {
              let msg = `Failed to start stream: ${response.statusText}`;
              try {
                const body = await response.json();
                if (body?.message) msg = body.message;
              } catch {
                // ignore parse errors, keep default message
              }
              observer.error(new Error(msg));
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              observer.error(new Error('Response body reader is not available'));
              return;
            }

            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
                  if (!payload) continue;
                  try {
                    observer.next(JSON.parse(payload));
                  } catch (err) {
                    console.warn('Failed to parse ideas stream chunk:', payload, err);
                  }
                }
              }
              observer.complete();
            } catch (err) {
              observer.error(err);
            }
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              observer.error(err);
            }
          });
      };

      attemptFetch(false);

      return () => controller.abort();
    });
  }
}
