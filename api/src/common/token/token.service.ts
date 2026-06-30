import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface JwtClaims {
  sub: string;
  email: string;
  role: Role;
}

/**
 * Thin wrapper over the `jsonwebtoken` package for signing/verifying the
 * access and refresh tokens. Access and refresh use separate secrets so a
 * leaked access token can't be used to mint refresh tokens and vice-versa.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret = process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret-change-me';
  private readonly accessExpiry = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'];
  private readonly refreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

  signAccess(claims: JwtClaims): string {
    return jwt.sign(claims, this.accessSecret, { expiresIn: this.accessExpiry });
  }

  signRefresh(claims: JwtClaims): string {
    return jwt.sign(claims, this.refreshSecret, { expiresIn: this.refreshExpiry });
  }

  verifyAccess(token: string): JwtClaims {
    try {
      return jwt.verify(token, this.accessSecret) as JwtClaims;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  verifyRefresh(token: string): JwtClaims {
    try {
      return jwt.verify(token, this.refreshSecret) as JwtClaims;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
