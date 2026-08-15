import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IdeasProgressEvent } from '../models/idea.interface';
import { SavedIdeaSession } from '../models/saved-idea-session.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdeasService {
  private base = `${environment.apiUrl}/ideas`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  generateStream(
    domain: string,
    count: number,
    provider?: string,
    model?: string,
  ): Observable<IdeasProgressEvent> {
    return new Observable<IdeasProgressEvent>((observer) => {
      const controller = new AbortController();
      const params = new URLSearchParams({ domain, count: String(count) });
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);

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
                  if (trimmed.startsWith('id:')) continue;
                  if (trimmed.startsWith('event:')) continue;
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

  listSessions(params?: { nightly?: boolean; favorites?: boolean }): Observable<SavedIdeaSession[]> {
    let httpParams = new HttpParams();
    if (params?.nightly !== undefined) httpParams = httpParams.set('nightly', String(params.nightly));
    if (params?.favorites !== undefined) httpParams = httpParams.set('favorites', String(params.favorites));
    return this.http.get<SavedIdeaSession[]>(`${this.base}/sessions`, { params: httpParams });
  }

  getSession(id: number): Observable<SavedIdeaSession> {
    return this.http.get<SavedIdeaSession>(`${this.base}/sessions/${id}`);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  setFavorite(ideaId: number, isFavorite: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/ideas/${ideaId}`, { isFavorite });
  }

  nightlyUnreadCount(): Observable<number> {
    return new Observable<number>((observer) => {
      this.http.get(`${this.base}/nightly/unread-count`).subscribe({
        next: (data: any) => observer.next(typeof data === 'number' ? data : data?.count ?? 0),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
    });
  }

  markNightlyRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/nightly/mark-read`, {});
  }

  triggerNightly(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/nightly/trigger`, {});
  }
}
