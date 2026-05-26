import { EnumData } from '../models/enum-data.model';

export enum UserRole {
  Admin = 1,
  User,
}

export const UserRoleOptions: EnumData[] = [
  {
    enumValue: UserRole.Admin,
    label: 'Admin',
    heLabel: 'מנהל',
    description: 'Administrator with full system access and management permissions',
    icon: 'shield',
    tooltip: 'Full access administrator',
    tailwind: 'bg-red-100 text-red-800',
    className: 'user-role-admin',
    severity: 'danger',
  },
  {
    enumValue: UserRole.User,
    label: 'User',
    heLabel: 'משתמש',
    description: 'Regular user with standard access to the system',
    icon: 'person',
    tooltip: 'Standard user account',
    tailwind: 'bg-blue-100 text-blue-800',
    className: 'user-role-user',
    severity: 'info',
  },
];

export function getUserRoleData(role: UserRole): EnumData | undefined {
  return UserRoleOptions.find((data) => data.enumValue === role);
}
