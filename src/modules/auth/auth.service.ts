import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, JwtClaims } from '../../common/token/token.service';
import { LoginDto } from './dto/login.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  passwordHash: true,
} as const;

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    };
  }

  private setTokenCookies(res: Response, claims: JwtClaims) {
    res.cookie('access_token', this.tokens.signAccess(claims), this.cookieOptions(ACCESS_MAX_AGE));
    res.cookie('refresh_token', this.tokens.signRefresh(claims), this.cookieOptions(REFRESH_MAX_AGE));
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: USER_SELECT,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => undefined);

    this.setTokenCookies(res, { sub: user.id, email: user.email, role: user.role });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const claims = this.tokens.verifyRefresh(refreshToken); // throws 401 if invalid/expired

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: SAFE_USER_SELECT,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    // Rotate both tokens so the refresh window keeps sliding while the user is active.
    this.setTokenCookies(res, { sub: user.id, email: user.email, role: user.role });

    return { user };
  }

  logout(res: Response) {
    const clearOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }
}
