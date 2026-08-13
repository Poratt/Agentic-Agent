import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthStore } from '../store/auth.store';
import { UserRole } from '../enums/user-role.enum';

describe('roleGuard', () => {
  let authStore: { userRole: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authStore = { userRole: vi.fn().mockReturnValue(null) };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(roles: UserRole[]): boolean {
    const route = { data: { roles } } as any;
    return TestBed.runInInjectionContext(() => roleGuard(route, {} as any)) as boolean;
  }

  it('allows activation when no roles are required', () => {
    expect(run([])).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('allows activation when the user role is unknown (null)', () => {
    authStore.userRole.mockReturnValue(null);
    expect(run([UserRole.Admin])).toBe(true);
  });

  it('blocks and redirects to /chat when the role is not allowed', () => {
    authStore.userRole.mockReturnValue(UserRole.User);
    const result = run([UserRole.Admin]);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/chat']);
  });

  it('allows activation when the user role is in the required list', () => {
    authStore.userRole.mockReturnValue(UserRole.Admin);
    expect(run([UserRole.Admin])).toBe(true);
    authStore.userRole.mockReturnValue(UserRole.User);
    expect(run([UserRole.User, UserRole.Admin])).toBe(true);
  });
});
