import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, JwtPayload } from "./auth.types";
import { displayName } from "./role-label.util";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user || !user.isActive) throw new UnauthorizedException("Email atau password salah");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Email atau password salah");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: displayName(user.name, user.role),
      role: user.role,
      employeeId: user.employeeId,
    };
  }

  async login(user: AuthUser) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, employeeId: user.employeeId };
    return {
      accessToken: this.jwt.sign(payload),
      user,
    };
  }

  async me(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: displayName(user.name, user.role),
      role: user.role,
      employeeId: user.employeeId,
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Password saat ini salah");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }
}
