import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IdeasProgressEvent } from '../models/idea.interface';
import { SavedIdeaSession } from '../models/saved-idea-session.model';
import { SavedIdea } from '../models/saved-idea.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdeasService {
  private base = `${environment.apiUrl}/ideas`;
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
    return new Observable<SavedIdeaSession[]>((observer) => {
      const searchParams = new URLSearchParams();
      if (params?.nightly !== undefined) searchParams.set('nightly', String(params.nightly));
      if (params?.favorites !== undefined) searchParams.set('favorites', String(params.favorites));
      const query = searchParams.toString();
      const url = `${this.base}/sessions${query ? `?${query}` : ''}`;

      fetch(url, { method: 'GET', credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to list sessions: ${response.statusText}`));
            return;
          }
          const data: SavedIdeaSession[] = await response.json();
          observer.next(data);
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }

  getSession(id: number): Observable<SavedIdeaSession> {
    return new Observable<SavedIdeaSession>((observer) => {
      fetch(`${this.base}/sessions/${id}`, { method: 'GET', credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to get session: ${response.statusText}`));
            return;
          }
          const data: SavedIdeaSession = await response.json();
          observer.next(data);
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }

  deleteSession(id: number): Observable<void> {
    return new Observable<void>((observer) => {
      fetch(`${this.base}/sessions/${id}`, { method: 'DELETE', credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to delete session: ${response.statusText}`));
            return;
          }
          observer.next();
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }

  setFavorite(ideaId: number, isFavorite: boolean): Observable<void> {
    return new Observable<void>((observer) => {
      fetch(`${this.base}/ideas/${ideaId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to update favorite: ${response.statusText}`));
            return;
          }
          observer.next();
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }

  nightlyUnreadCount(): Observable<number> {
    return new Observable<number>((observer) => {
      fetch(`${this.base}/nightly/unread-count`, { method: 'GET', credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to get unread count: ${response.statusText}`));
            return;
          }
          const data = await response.json();
          observer.next(typeof data === 'number' ? data : data?.count ?? 0);
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }

  markNightlyRead(): Observable<void> {
    return new Observable<void>((observer) => {
      fetch(`${this.base}/nightly/mark-read`, { method: 'POST', credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error(body?.message || `Failed to mark as read: ${response.statusText}`));
            return;
          }
          observer.next();
          observer.complete();
        })
        .catch((err) => observer.error(err));
    });
  }
}
