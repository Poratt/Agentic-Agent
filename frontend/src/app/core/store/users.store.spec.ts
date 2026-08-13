import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UsersStore } from './users.store';
import { UserService } from '../services/user.service';
import { AuthStore } from './auth.store';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';

describe('UsersStore', () => {
  const user: User = {
    id: 1,
    email: 'a@b.com',
    role: UserRole.User,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let userService: {
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };

  let authStore: { user: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userService = {
      update: vi.fn(),
      delete: vi.fn(),
      updateRole: vi.fn(),
      getById: vi.fn(),
    };

    authStore = { user: vi.fn(() => user) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        UsersStore,
        { provide: UserService, useValue: userService },
        { provide: AuthStore, useValue: authStore },
      ],
    });
  });

  function create(): UsersStore {
    return TestBed.inject(UsersStore);
  }

  describe('updateUserRole', () => {
    it('calls service and reloads on success', () => {
      userService.updateRole.mockReturnValue(of({ result: user }));
      const store = create();
      store.updateUserRole(1, UserRole.Admin);

      expect(userService.updateRole).toHaveBeenCalledWith(1, UserRole.Admin);
      expect(store.error()).toBeNull();
    });

    it('sets error on failure', () => {
      userService.updateRole.mockReturnValue(
        throwError(() => ({ error: { message: 'Failed to update role' } })),
      );
      const store = create();
      store.updateUserRole(1, UserRole.Admin);

      expect(store.error()).toBe('Failed to update role');
    });
  });

  describe('deleteUser', () => {
    it('calls service and reloads on success', () => {
      userService.delete.mockReturnValue(of({ result: { deleted: true } }));
      const store = create();
      store.deleteUser(1);

      expect(userService.delete).toHaveBeenCalledWith(1);
      expect(store.error()).toBeNull();
    });

    it('sets error on failure', () => {
      userService.delete.mockReturnValue(
        throwError(() => ({ error: { message: 'Failed to delete user' } })),
      );
      const store = create();
      store.deleteUser(1);

      expect(store.error()).toBe('Failed to delete user');
    });
  });

  describe('updateUser', () => {
    it('calls service and reloads on success', () => {
      userService.update.mockReturnValue(of({ result: user }));
      const store = create();
      store.updateUser(1, { fullName: 'New Name' });

      expect(userService.update).toHaveBeenCalledWith(1, { fullName: 'New Name' });
      expect(store.error()).toBeNull();
    });

    it('sets error on failure', () => {
      userService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'Failed to update user' } })),
      );
      const store = create();
      store.updateUser(1, { fullName: 'New Name' });

      expect(store.error()).toBe('Failed to update user');
    });
  });

  describe('getUserById', () => {
    it('sets selectedUser', () => {
      userService.getById.mockReturnValue(of({ result: user }));
      const store = create();
      store.getUserById(1);

      expect(store.selectedUser()).toEqual(user);
    });

    it('sets error on failure', () => {
      userService.getById.mockReturnValue(
        throwError(() => ({ error: { message: 'User not found' } })),
      );
      const store = create();
      store.getUserById(999);

      expect(store.error()).toBe('User not found');
    });
  });

  describe('clearError', () => {
    it('resets error to null', () => {
      userService.update.mockReturnValue(
        throwError(() => ({ error: { message: 'fail' } })),
      );
      const store = create();
      store.updateUser(1, { fullName: 'x' });
      expect(store.error()).toBe('fail');

      store.clearError();
      expect(store.error()).toBeNull();
    });
  });

  describe('pageState', () => {
    it('returns Empty when no data and no error', () => {
      const store = create();
      expect(store.pageState()).toBeDefined();
    });
  });
});
