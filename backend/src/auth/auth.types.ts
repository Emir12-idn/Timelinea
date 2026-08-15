import { Role } from "@prisma/client";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  employeeId: number | null;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  employeeId: number | null;
}
