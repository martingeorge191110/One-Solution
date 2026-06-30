import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request store carrying the acting user's id so the Prisma audit hook
 * (which runs deep inside services, outside the request scope) can attribute
 * every write to whoever performed it. Populated by AuditInterceptor.
 */
export interface AuditStore {
  actorId?: string | null;
}

const als = new AsyncLocalStorage<AuditStore>();

export const AuditContext = {
  /** Run `fn` with the given store bound for the duration of the async chain. */
  run<T>(store: AuditStore, fn: () => T): T {
    return als.run(store, fn);
  },
  /** The acting user's id for the current async context, if any. */
  getActorId(): string | null {
    return als.getStore()?.actorId ?? null;
  },
};
