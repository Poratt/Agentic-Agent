import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { IdeasService } from './ideas.service';

describe('IdeasService', () => {
  let service: IdeasService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IdeasService,
        provideZonelessChangeDetection(),
        { provide: 'AuthService', useValue: { refresh: () => ({ subscribe: () => {} }) } },
      ],
    });
    service = TestBed.inject(IdeasService);
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listSessions', () => {
    it('should call GET /ideas/sessions', async () => {
      const mockSessions = [{ id: 1, domain: 'tech' }];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessions),
      });

      const result = await firstValueFrom(service.listSessions());
      expect(result).toEqual(mockSessions);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/sessions'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should include query params when provided', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await firstValueFrom(service.listSessions({ nightly: true }));
      expect(fetchSpy.mock.calls[0][0]).toContain('nightly=true');
    });
  });

  describe('deleteSession', () => {
    it('should call DELETE /ideas/sessions/:id', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(),
      });

      await firstValueFrom(service.deleteSession(42));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/sessions/42'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('setFavorite', () => {
    it('should call PATCH /ideas/ideas/:id', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(),
      });

      await firstValueFrom(service.setFavorite(10, true));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/ideas/10'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('nightlyUnreadCount', () => {
    it('should call GET /ideas/nightly/unread-count', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(3),
      });

      const result = await firstValueFrom(service.nightlyUnreadCount());
      expect(result).toBe(3);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/nightly/unread-count'),
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('markNightlyRead', () => {
    it('should call POST /ideas/nightly/mark-read', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(),
      });

      await firstValueFrom(service.markNightlyRead());
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/nightly/mark-read'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('triggerNightly', () => {
    it('should call POST /ideas/nightly/trigger', async () => {
      const mockResult = { success: true, message: 'Done' };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await firstValueFrom(service.triggerNightly());
      expect(result).toEqual(mockResult);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ideas/nightly/trigger'),
        expect.objectContaining({ method: 'POST' }),
      );
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
