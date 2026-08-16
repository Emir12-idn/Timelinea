import { Role } from "@prisma/client";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  /** "{RoleLabel} {name}", e.g. "HRD Agus" — see role-label.util.ts. */
  displayName: string;
  role: Role;
  employeeId: number | null;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  employeeId: number | null;
}
