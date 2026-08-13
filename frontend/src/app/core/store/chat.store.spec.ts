import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChatStore } from './chat.store';
import { ChatService } from '../services/chat.service';
import { IChatSession } from '../models/chat-session.interface';

describe('ChatStore', () => {
  const sessions: IChatSession[] = [
    { id: 1, userId: 1, title: 'Session 1', createdAt: new Date(), updatedAt: new Date() },
    { id: 2, userId: 1, title: 'Session 2', createdAt: new Date(), updatedAt: new Date() },
  ];

  let chatService: {
    listSessions: ReturnType<typeof vi.fn>;
    createSession: ReturnType<typeof vi.fn>;
    deleteSession: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    chatService = {
      listSessions: vi.fn(),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
    };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ChatStore,
        { provide: ChatService, useValue: chatService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function create(): ChatStore {
    return TestBed.inject(ChatStore);
  }

  describe('loadSessions', () => {
    it('sets sessions on success', () => {
      chatService.listSessions.mockReturnValue(of(sessions));
      const store = create();
      store.loadSessions();

      expect(store.sessions()).toEqual(sessions);
      expect(store.loading()).toBe(false);
    });

    it('sets error on failure', () => {
      chatService.listSessions.mockReturnValue(throwError(() => new Error('Network error')));
      const store = create();
      store.loadSessions();

      expect(store.error()).toBe('Network error');
      expect(store.loading()).toBe(false);
    });
  });

  describe('createSession', () => {
    it('creates and returns new session via observable', () => {
      const newSession = sessions[0];
      chatService.createSession.mockReturnValue(of(newSession));
      chatService.listSessions.mockReturnValue(of(sessions));
      const store = create();

      store.createSessionForMessage().subscribe((result) => {
        expect(result).toEqual(newSession);
      });

      expect(store.currentSessionId()).toBe(newSession.id);
    });
  });

  describe('deleteSession', () => {
    it('removes session and reloads', () => {
      chatService.deleteSession.mockReturnValue(of(undefined));
      chatService.listSessions.mockReturnValue(of([sessions[1]]));
      const store = create();
      store.deleteSession(1);

      expect(store.currentSessionId()).toBeNull();
      expect(store.sessions()).toEqual([sessions[1]]);
    });

    it('sets error on failure', () => {
      chatService.deleteSession.mockReturnValue(
        throwError(() => new Error('Failed to delete')),
      );
      const store = create();
      store.deleteSession(1);

      expect(store.error()).toBe('Failed to delete');
    });
  });

  describe('setCurrentSession', () => {
    it('sets currentSessionId', () => {
      const store = create();
      store.currentSessionId.set(5);
      expect(store.currentSessionId()).toBe(5);
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      chatService.listSessions.mockReturnValue(throwError(() => new Error('fail')));
      const store = create();
      store.loadSessions();
      expect(store.error()).toBe('fail');

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });
});
