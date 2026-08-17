import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthStore } from '../store/auth.store';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';

describe('authGuard', () => {
  const user: User = {
    id: 1,
    email: 'a@b.com',
    role: UserRole.User,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let authStore: { user: ReturnType<typeof vi.fn> & { set: ReturnType<typeof vi.fn> }; userRole: ReturnType<typeof vi.fn> };
  let authService: { checkSession: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authStore = {
      user: Object.assign(vi.fn().mockReturnValue(null), { set: vi.fn() }),
      userRole: vi.fn().mockReturnValue(null),
    };
    authService = { checkSession: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  async function run(): Promise<boolean> {
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    return firstValueFrom(result as any) as Promise<boolean>;
  }

  it('allows activation when a user is already in the store', async () => {
    authStore.user.mockReturnValue(user);
    const result = await run();
    expect(result).toBe(true);
    expect(authService.checkSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('checks the session when no user is present and stores the resolved user', async () => {
    authStore.user.mockReturnValue(null);
    authService.checkSession.mockReturnValue(Promise.resolve(user));

    const result = await run();

    expect(result).toBe(true);
    expect(authService.checkSession).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /login and blocks activation when the session is empty', async () => {
    authStore.user.mockReturnValue(null);
    authService.checkSession.mockReturnValue(Promise.resolve(null));

    const result = await run();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
