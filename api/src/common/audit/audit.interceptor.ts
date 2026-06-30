import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditContext } from './audit-context';

/**
 * Binds the authenticated user's id into the AsyncLocalStorage store for the
 * whole request, so PrismaService's audit hook can stamp `actorId` on every
 * write without each service having to thread the user through.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const actorId: string | null = req?.user?.id ?? null;

    return new Observable((subscriber) => {
      AuditContext.run({ actorId }, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
