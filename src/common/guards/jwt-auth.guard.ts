import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token/token.service';

/**
 * Global authentication guard. Reads the `access_token` httpOnly cookie,
 * verifies it with `jsonwebtoken` (via TokenService), and attaches the decoded
 * user to `req.user`. Routes marked @Public() skip authentication. No Passport.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const claims = this.tokens.verifyAccess(token); // throws 401 if invalid/expired
    (req as Request & { user?: unknown }).user = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
    };
    return true;
  }
}
