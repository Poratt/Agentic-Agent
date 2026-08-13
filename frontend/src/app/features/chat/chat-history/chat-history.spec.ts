import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatHistory } from './chat-history';
import { ChatStore } from '../../../core/store/chat.store';

describe('ChatHistory', () => {
  let component: ChatHistory;
  let fixture: ComponentFixture<ChatHistory>;
  let chatStoreMock: {
    sessions: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    currentSessionId: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    chatStoreMock = {
      sessions: vi.fn().mockReturnValue([
        { id: 1, title: 'First Chat', createdAt: new Date(), updatedAt: new Date(), userId: 1 },
        { id: 2, title: 'Second Chat', createdAt: new Date(), updatedAt: new Date(), userId: 1 },
      ]),
      loading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      currentSessionId: vi.fn().mockReturnValue(null),
      reload: vi.fn(),
      deleteSession: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ChatHistory],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ChatStore, useValue: chatStoreMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filteredSessions should return all when no search', () => {
    component.searchQuery.set('');
    expect(component.filteredSessions().length).toBe(2);
  });

  it('filteredSessions should filter by search term', () => {
    component.searchQuery.set('first');
    expect(component.filteredSessions().length).toBe(1);
    expect(component.filteredSessions()[0].title).toBe('First Chat');
  });

  it('confirmDelete should call chatStore.deleteSession', () => {
    component.pendingDeleteSessionId.set(5);
    component.confirmDelete();
    expect(chatStoreMock['deleteSession']).toHaveBeenCalledWith(5);
    expect(component.pendingDeleteSessionId()).toBeNull();
  });

  it('onSearchChange should update search signal', () => {
    component.onSearchChange('hello');
    expect(component.searchQuery()).toBe('hello');
  });
});
