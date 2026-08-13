import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';

describe('AuthStore', () => {
  const user: User = {
    id: 1,
    email: 'a@b.com',
    role: UserRole.User,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let authService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    me: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
    };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthStore,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function create(): AuthStore {
    return TestBed.inject(AuthStore);
  }

  describe('login', () => {
    it('sets user and navigates to / on success', () => {
      authService.login.mockReturnValue(of({ result: user }));
      const store = create();
      store.login({ email: 'a@b.com', password: 'pw' });

      expect(store.user()).toEqual(user);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('sets error message on failure', () => {
      authService.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Bad credentials' } })),
      );
      const store = create();
      store.login({ email: 'a@b.com', password: 'pw' });

      expect(store.error()).toBe('Bad credentials');
      expect(store.user()).toBeNull();
      expect(store.loading()).toBe(false);
    });
  });

  describe('register', () => {
    it('navigates to /login on success', () => {
      authService.register.mockReturnValue(of({ result: user }));
      const store = create();
      store.register({ email: 'a@b.com', password: 'pw' });

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(store.loading()).toBe(false);
    });

    it('sets error message on failure', () => {
      authService.register.mockReturnValue(
        throwError(() => ({ error: { message: 'Email taken' } })),
      );
      const store = create();
      store.register({ email: 'a@b.com', password: 'pw' });

      expect(store.error()).toBe('Email taken');
      expect(store.loading()).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and navigates to /login on success', () => {
      authService.logout.mockReturnValue(of({}));
      const store = create();
      store.logout();

      expect(store.user()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('clears user and navigates to /login even on error', () => {
      authService.logout.mockReturnValue(throwError(() => new Error('fail')));
      const store = create();
      store.logout();

      expect(store.user()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('loadMe', () => {
    it('sets user on success', () => {
      authService.me.mockReturnValue(of({ result: user }));
      const store = create();
      store.loadMe();

      expect(store.user()).toEqual(user);
      expect(store.loading()).toBe(false);
    });

    it('clears user on failure', () => {
      authService.me.mockReturnValue(throwError(() => new Error('unauthorized')));
      const store = create();
      store.loadMe();

      expect(store.user()).toBeNull();
      expect(store.loading()).toBe(false);
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      authService.login.mockReturnValue(
        throwError(() => ({ error: { message: 'fail' } })),
      );
      const store = create();
      store.login({ email: 'a@b.com', password: 'pw' });
      expect(store.error()).toBe('fail');

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });

  describe('userRole', () => {
    it('returns role from user', () => {
      authService.me.mockReturnValue(of({ result: user }));
      const store = create();
      store.loadMe();

      expect(store.userRole()).toBe(UserRole.User);
    });

    it('returns undefined when no user', () => {
      const store = create();
      expect(store.userRole()).toBeUndefined();
    });
  });
});
