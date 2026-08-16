import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom, take } from 'rxjs';
import { IdeasService } from './ideas.service';

describe('IdeasService', () => {
  let service: IdeasService;
  let httpMock: HttpTestingController;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IdeasService, provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IdeasService);
    httpMock = TestBed.inject(HttpTestingController);
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listSessions', () => {
    it('should call GET /ideas/sessions', async () => {
      const mockSessions = [{ id: 1, domain: 'tech' }];
      const promise = firstValueFrom(service.listSessions());

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/sessions'));
      expect(req.request.method).toBe('GET');
      req.flush(mockSessions);

      expect(await promise).toEqual(mockSessions);
    });

    it('should include query params when provided', async () => {
      const promise = firstValueFrom(service.listSessions({ nightly: true }));

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/sessions'));
      expect(req.request.params.get('nightly')).toBe('true');
      req.flush([]);
      await promise;
    });
  });

  describe('deleteSession', () => {
    it('should call DELETE /ideas/sessions/:id', async () => {
      const promise = firstValueFrom(service.deleteSession(42));

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/sessions/42'));
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      await promise;
    });
  });

  describe('setFavorite', () => {
    it('should call PATCH /ideas/ideas/:id', async () => {
      const promise = firstValueFrom(service.setFavorite(10, true));

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/ideas/10'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isFavorite: true });
      req.flush(null);

      await promise;
    });
  });

  describe('nightlyUnreadCount', () => {
    it('should call GET /ideas/nightly/unread-count', async () => {
      const promise = firstValueFrom(service.nightlyUnreadCount());

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/nightly/unread-count'));
      expect(req.request.method).toBe('GET');
      req.flush(3);

      expect(await promise).toBe(3);
    });
  });

  describe('markNightlyRead', () => {
    it('should call POST /ideas/nightly/mark-read', async () => {
      const promise = firstValueFrom(service.markNightlyRead());

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/nightly/mark-read'));
      expect(req.request.method).toBe('POST');
      req.flush(null);

      await promise;
    });
  });

  describe('triggerNightly', () => {
    it('should call POST /ideas/nightly/trigger', async () => {
      const mockResult = { success: true, message: 'Done' };
      const promise = firstValueFrom(service.triggerNightly());

      const req = httpMock.expectOne((r) => r.url.includes('/ideas/nightly/trigger'));
      expect(req.request.method).toBe('POST');
      req.flush(mockResult);

      expect(await promise).toEqual(mockResult);
    });
  });

  describe('generateStream', () => {
    it('should create an observable that calls fetch with SSE headers', async () => {
      const mockReadableStream = {
        getReader() {
          const encoder = new TextEncoder();
          const sseData = 'data: {"phase":"done","result":{}}\n';
          let done = false;
          return {
            read() {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({ done: false, value: encoder.encode(sseData) });
            },
            releaseLock() {},
          };
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream,
        json: () => Promise.resolve({}),
      });

      const events: any[] = [];
      const obs = service.generateStream('tech', 5, 'openai', 'gpt-4');

      await new Promise<void>((resolve) => {
        obs.pipe(take(1)).subscribe({
          next: (event) => events.push(event),
          complete: resolve,
          error: resolve,
        });
        setTimeout(resolve, 500);
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/generate/stream'),
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
