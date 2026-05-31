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
    icon: 'ph ph-shield ph-fill ',
    tooltip: 'Full access administrator',
    color: '#835588'
  },
  {
    enumValue: UserRole.User,
    label: 'User',
    heLabel: 'משתמש',
    description: 'Regular user with standard access to the system',
    icon: 'ph ph-user',
    tooltip: 'Standard user account',
    color: '#931188'
  },
];

export function getUserRoleData(role: UserRole): EnumData | undefined {
  return UserRoleOptions.find((data) => data.enumValue === role);
}
