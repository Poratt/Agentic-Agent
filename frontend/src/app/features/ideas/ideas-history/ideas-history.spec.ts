import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IdeasHistory } from './ideas-history';
import { IdeasStore } from '../../../core/store/ideas.store';
import { SavedIdeaSession } from '../../../core/models/saved-idea-session.model';
import { SavedIdea } from '../../../core/models/saved-idea.model';

function makeIdea(overrides: Partial<SavedIdea> = {}): SavedIdea {
  return {
    id: 1,
    userId: 1,
    sessionId: 1,
    title: 'Test Idea',
    description: 'A test idea',
    targetMarket: 'Developers',
    validationScore: 8,
    validationReason: 'Good',
    risks: [],
    competitors: [],
    nextSteps: [],
    signalsReferenced: [],
    groundedInSignals: true,
    isFavorite: false,
    createdAt: '2025-01-01',
    ...overrides,
  };
}

function makeSession(overrides: Partial<SavedIdeaSession> = {}): SavedIdeaSession {
  return {
    id: 1,
    userId: 1,
    domain: 'tech',
    provider: null,
    model: null,
    nightly: false,
    unread: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ideas: [],
    ideasCount: 0,
    ...overrides,
  };
}

describe('IdeasHistory', () => {
  let component: IdeasHistory;
  let fixture: ComponentFixture<IdeasHistory>;
  let storeMock: {
    sessions: ReturnType<typeof vi.fn>;
    currentSessionId: ReturnType<typeof vi.fn>;
    historyPageState: ReturnType<typeof vi.fn>;
    nightlyUnread: ReturnType<typeof vi.fn>;
    loadSessions: ReturnType<typeof vi.fn>;
    loadSession: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
    toggleFavorite: ReturnType<typeof vi.fn>;
    triggerNightly: ReturnType<typeof vi.fn>;
    markNightlyRead: ReturnType<typeof vi.fn>;
    isSessionLoading: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const sessions: SavedIdeaSession[] = [
      makeSession({ id: 1, nightly: true }),
      makeSession({ id: 2, nightly: false, ideas: [makeIdea({ id: 10, isFavorite: true })] }),
      makeSession({ id: 3, nightly: false }),
    ];

    storeMock = {
      sessions: vi.fn().mockReturnValue(sessions),
      currentSessionId: vi.fn().mockReturnValue(null),
      historyPageState: vi.fn().mockReturnValue(4),
      nightlyUnread: vi.fn().mockReturnValue(0),
      loadSessions: vi.fn().mockResolvedValue(undefined),
      loadSession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      toggleFavorite: vi.fn().mockResolvedValue(undefined),
      triggerNightly: vi.fn().mockResolvedValue('Done'),
      markNightlyRead: vi.fn().mockResolvedValue(undefined),
      isSessionLoading: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [IdeasHistory],
      providers: [
        provideZonelessChangeDetection(),
        { provide: IdeasStore, useValue: storeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IdeasHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setFilter should update filterMode', () => {
    component.setFilter('nightly');
    expect(component.filterMode()).toBe('nightly');
  });

  it('filteredSessions should return all sessions when mode is all', () => {
    component.setFilter('all');
    expect(component.filteredSessions().length).toBe(3);
  });

  it('filteredSessions should return only nightly sessions', () => {
    component.setFilter('nightly');
    expect(component.filteredSessions().length).toBe(1);
    expect(component.filteredSessions()[0].nightly).toBe(true);
  });

  it('filteredSessions should return only favorites', () => {
    component.setFilter('favorites');
    expect(component.filteredSessions().length).toBe(1);
    expect(component.filteredSessions()[0].id).toBe(2);
  });

  it('toggleExpand should expand a session', async () => {
    const session = makeSession({ id: 5 });
    // toggleExpand awaits loadSession + a requestAnimationFrame before expanding
    await component.toggleExpand(session);
    expect(component.expandedSessionId()).toBe(5);
  });

  it('toggleExpand should collapse if already expanded', async () => {
    const session = makeSession({ id: 1 });
    component.expandedSessionId.set(1);
    await component.toggleExpand(session);
    expect(component.expandedSessionId()).toBeNull();
  });

  it('confirmDelete should call ideasStore.deleteSession', () => {
    component.pendingDeleteSessionId.set(7);
    component.confirmDelete();
    expect(storeMock['deleteSession']).toHaveBeenCalledWith(7);
    expect(component.pendingDeleteSessionId()).toBeNull();
  });

  it('toggleFavorite should call ideasStore.toggleFavorite', () => {
    component.toggleFavorite({ ideaId: 10, isFavorite: true });
    expect(storeMock['toggleFavorite']).toHaveBeenCalledWith(10, true);
  });

  it('triggerNightly should reload the session list after triggering', async () => {
    await component.triggerNightly();
    expect(storeMock['triggerNightly']).toHaveBeenCalled();
    expect(storeMock['loadSessions']).toHaveBeenCalledWith({});
    expect(storeMock['loadSession']).not.toHaveBeenCalled();
  });

  it('triggerNightly should reload with the current filter and refresh an expanded session', async () => {
    component.setFilter('nightly');
    component.expandedSessionId.set(5);
    await component.triggerNightly();
    expect(storeMock['loadSessions']).toHaveBeenCalledWith({ nightly: true });
    expect(storeMock['loadSession']).toHaveBeenCalledWith(5);
  });
});
