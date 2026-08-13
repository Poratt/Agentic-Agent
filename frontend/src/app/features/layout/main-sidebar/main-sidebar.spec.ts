import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { MainSidebar } from './main-sidebar';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatStore } from '../../../core/store/chat.store';
import { IdeasStore } from '../../../core/store/ideas.store';
import { UserRole } from '../../../core/enums/user-role.enum';

describe('MainSidebar', () => {
  let component: MainSidebar;
  let fixture: ComponentFixture<MainSidebar>;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let chatStoreMock: {
    loadSessions: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
    recentSessions: ReturnType<typeof vi.fn>;
    currentSessionId: ReturnType<typeof vi.fn>;
  };
  let ideasStoreMock: {
    loadSessions: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
    recentSessions: ReturnType<typeof vi.fn>;
    currentSessionId: ReturnType<typeof vi.fn>;
  };
  let authStoreMock: {
    userRole: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    routerMock = { navigate: vi.fn() };
    chatStoreMock = {
      loadSessions: vi.fn(),
      deleteSession: vi.fn(),
      recentSessions: vi.fn().mockReturnValue([]),
      currentSessionId: vi.fn().mockReturnValue(null),
    };
    ideasStoreMock = {
      loadSessions: vi.fn(),
      deleteSession: vi.fn(),
      recentSessions: vi.fn().mockReturnValue([]),
      currentSessionId: vi.fn().mockReturnValue(null),
    };
    authStoreMock = {
      userRole: vi.fn().mockReturnValue(UserRole.Admin),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MainSidebar],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthStore, useValue: authStoreMock },
        { provide: ChatStore, useValue: chatStoreMock },
        { provide: IdeasStore, useValue: ideasStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggleSidebar toggles collapsed signal', () => {
    const initial = component.collapsed();
    component.toggleSidebar();
    expect(component.collapsed()).toBe(!initial);
  });

  it('confirmDelete calls chatStore.deleteSession', () => {
    component.pendingDeleteSessionId.set(42);
    component.confirmDelete();
    expect(chatStoreMock.deleteSession).toHaveBeenCalledWith(42);
    expect(component.pendingDeleteSessionId()).toBeNull();
  });

  it('confirmDelete does nothing when no pending id', () => {
    component.pendingDeleteSessionId.set(null);
    component.confirmDelete();
    expect(chatStoreMock.deleteSession).not.toHaveBeenCalled();
  });

  it('navigateTo navigates to /chat with sessionId', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.navigateTo(5);
    expect(router.navigate).toHaveBeenCalledWith(['/chat'], { queryParams: { sessionId: 5 } });
    expect(component.pendingDeleteSessionId()).toBeNull();
  });

  it('navigateTo navigates to /chat/history without sessionId', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component.navigateTo();
    expect(router.navigate).toHaveBeenCalledWith(['/chat/history']);
  });

  it('confirmDeleteIdea calls ideasStore.deleteSession', () => {
    component.pendingDeleteIdeaSessionId.set(7);
    component.confirmDeleteIdea();
    expect(ideasStoreMock.deleteSession).toHaveBeenCalledWith(7);
    expect(component.pendingDeleteIdeaSessionId()).toBeNull();
  });
});
