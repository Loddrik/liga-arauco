import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginInput } from '@liga/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(input: LoginInput): Promise<{ token: string; email: string }> {
    const user = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException('credenciales inválidas');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('credenciales inválidas');

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, email: user.email };
  }
}
