import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../enums/user-role.enum';
import { AuthStore } from '../store/auth.store';

export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const requiredRoles = (route.data?.['roles'] as UserRole[]) ?? [];
  if (requiredRoles.length === 0) return true;

  const userRole = authStore.userRole();
  if (userRole == null) return true;

  if (!requiredRoles.includes(userRole)) {
    router.navigate(['/chat']);
    return false;
  }

  return true;
};
