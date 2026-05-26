import { UserRole } from "../../core/enums/user-role.enum";

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  refreshToken?: string;
}
