import { UserRole } from "../enums/user-role.enum";

export interface User {
  id: number;
  email: string;
  fullName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
