import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { IdeasStore } from './ideas.store';
import { IdeasService } from '../services/ideas.service';
import { PageStates } from '../enums/page-states.enum';

describe('IdeasStore', () => {
  let ideasService: {
    generateStream: ReturnType<typeof vi.fn>;
    listSessions: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
    setFavorite: ReturnType<typeof vi.fn>;
    nightlyUnreadCount: ReturnType<typeof vi.fn>;
    triggerNightly: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    ideasService = {
      generateStream: vi.fn(),
      listSessions: vi.fn(),
      getSession: vi.fn(),
      deleteSession: vi.fn(),
      setFavorite: vi.fn(),
      nightlyUnreadCount: vi.fn(),
      triggerNightly: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        IdeasStore,
        { provide: IdeasService, useValue: ideasService },
      ],
    });
  });

  function create(): IdeasStore {
    return TestBed.inject(IdeasStore);
  }

  describe('setDomain', () => {
    it('updates domain signal', () => {
      const store = create();
      store.setDomain('AI');
      expect(store.domain()).toBe('AI');
    });
  });

  describe('setCount', () => {
    it('updates count signal', () => {
      const store = create();
      store.setCount(10);
      expect(store.count()).toBe(10);
    });
  });

  describe('setModel', () => {
    it('updates modelSelection signal', () => {
      const store = create();
      const selection = { provider: 'openai', model: 'gpt-4' };
      store.setModel(selection);
      expect(store.modelSelection()).toEqual(selection);
    });
  });

  describe('generate', () => {
    it('sets error when domain is empty', () => {
      const store = create();
      store.setDomain('');
      store.generate();

      expect(store.error()).toBe('נא להזין תחום עסקי');
      expect(ideasService.generateStream).not.toHaveBeenCalled();
    });

    it('sets loading and subscribes to stream', () => {
      const stream$ = new Subject();
      ideasService.generateStream.mockReturnValue(stream$.asObservable());
      const store = create();
      store.setDomain('AI');
      store.generate();

      expect(store.loading()).toBe(true);
      expect(store.error()).toBeNull();

      stream$.complete();
    });
  });

  describe('stopGenerating', () => {
    it('unsubscribes and marks partial when ideas exist', () => {
      const stream$ = new Subject();
      ideasService.generateStream.mockReturnValue(stream$.asObservable());
      const store = create();
      store.setDomain('AI');
      store.generate();
      store.stopGenerating();

      expect(store.loading()).toBe(false);
      expect(store.phase()).toBe('done');
      expect(store.statusText()).toBe('היצירה הופסקה');
    });
  });

  describe('loadSessions', () => {
    it('sets sessions on success', async () => {
      const mockSessions = [{ id: 1, domain: 'AI', ideas: [] }];
      ideasService.listSessions.mockReturnValue(of(mockSessions as any));
      const store = create();

      await store.loadSessions();

      expect(store.sessions().length).toBe(1);
      expect(store.historyLoading()).toBe(false);
    });

    it('sets historyError on failure', async () => {
      ideasService.listSessions.mockReturnValue(throwError(() => new Error('Failed')));
      const store = create();

      await store.loadSessions();

      expect(store.historyError()).toBe('Failed');
      expect(store.historyLoading()).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('removes session from list', async () => {
      const store = create();
      store.sessions.set([{ id: 1, domain: 'AI', ideas: [] } as any, { id: 2, domain: 'Web', ideas: [] } as any]);
      ideasService.deleteSession.mockReturnValue(of(undefined as any));

      await store.deleteSession(1);

      expect(store.sessions().length).toBe(1);
      expect(store.sessions()[0].id).toBe(2);
    });

    it('sets historyError on failure', async () => {
      ideasService.deleteSession.mockReturnValue(
        throwError(() => new Error('Delete failed')),
      );
      const store = create();

      await store.deleteSession(1);

      expect(store.historyError()).toBe('Delete failed');
    });
  });

  describe('toggleFavorite', () => {
    it('optimistically updates then persists', async () => {
      const store = create();
      store.sessions.set([
        {
          id: 1,
          domain: 'AI',
          ideas: [{ id: 10, isFavorite: false } as any],
        } as any,
      ]);
      ideasService.setFavorite.mockReturnValue(of(undefined as any));

      await store.toggleFavorite(10, true);

      expect(store.sessions()[0].ideas![0].isFavorite).toBe(true);
    });

    it('rolls back on error', async () => {
      const store = create();
      store.sessions.set([
        {
          id: 1,
          domain: 'AI',
          ideas: [{ id: 10, isFavorite: false } as any],
        } as any,
      ]);
      ideasService.setFavorite.mockReturnValue(
        throwError(() => new Error('fail')),
      );

      await store.toggleFavorite(10, true);

      expect(store.sessions()[0].ideas![0].isFavorite).toBe(false);
    });
  });

  describe('loadNightlyUnread', () => {
    it('sets count on success', async () => {
      ideasService.nightlyUnreadCount.mockReturnValue(of(5));
      const store = create();

      await store.loadNightlyUnread();

      expect(store.nightlyUnread()).toBe(5);
    });

    it('sets 0 on failure', async () => {
      ideasService.nightlyUnreadCount.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      const store = create();

      await store.loadNightlyUnread();

      expect(store.nightlyUnread()).toBe(0);
    });
  });

  describe('triggerNightly', () => {
    it('returns message on success', async () => {
      ideasService.triggerNightly.mockReturnValue(
        of({ success: true, message: 'Done' }),
      );
      const store = create();

      const result = await store.triggerNightly();

      expect(result).toBe('Done');
      expect(store.triggeringNightly()).toBe(false);
    });

    it('throws on failure', async () => {
      ideasService.triggerNightly.mockReturnValue(
        throwError(() => new Error('trigger failed')),
      );
      const store = create();

      await expect(store.triggerNightly()).rejects.toThrow('trigger failed');
      expect(store.triggeringNightly()).toBe(false);
    });
  });

  describe('pageState', () => {
    it('returns Empty when no ideas and no error', () => {
      const store = create();
      expect(store.pageState()).toBe(PageStates.Empty);
    });
  });
});
