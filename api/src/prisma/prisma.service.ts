import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuditContext } from '../common/audit/audit-context';

/** Models whose writes are recorded to the AuditLog. */
const AUDITED_MODELS = new Set<string>([
  'User',
  'Client',
  'Project',
  'Term',
  'Item',
  'TermsCondition',
  'AlertThreshold',
  'Quotation',
  'QuotationLine',
  'QuotationCondition',
  'Payment',
  'DailyLog',
]);

/** Prisma write operation → audit action. Reads are never audited. */
const ACTION_MAP: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
  create: 'CREATE',
  createMany: 'CREATE',
  update: 'UPDATE',
  updateMany: 'UPDATE',
  upsert: 'UPDATE',
  delete: 'DELETE',
  deleteMany: 'DELETE',
};

/** Fields that must never be persisted into the audit trail. */
const REDACTED_FIELDS = new Set(['passwordHash', 'password']);

/** Normalize Prisma values (Decimal, Date) into JSON-safe primitives and
 *  redact sensitive fields so secrets never land in the audit log. */
function toJson(value: unknown): any {
  if (value === null || value === undefined) return undefined;
  const plain = JSON.parse(JSON.stringify(value));
  if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
    for (const key of Object.keys(plain)) {
      if (REDACTED_FIELDS.has(key)) plain[key] = '***REDACTED***';
    }
  }
  return plain;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Query extension that records every create/update/delete on an audited model
 * to AuditLog, attributing it to the current request's user (via AuditContext).
 * Single update/delete capture the prior row for before/after diffs. Writes go
 * through the base `client`, which has no extension, so AuditLog writes (and the
 * before-state lookups) are never themselves audited — no recursion.
 */
const auditExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const action = ACTION_MAP[operation];
          if (!model || !action || !AUDITED_MODELS.has(model)) {
            return query(args);
          }

          const delegate = (client as Record<string, any>)[lower(model)];
          const where = (args as any)?.where;

          let before: any;
          if ((operation === 'update' || operation === 'delete') && where && delegate) {
            try {
              before = await delegate.findUnique({ where });
            } catch {
              before = undefined;
            }
          }

          const result: any = await query(args);

          try {
            const isMany = operation.endsWith('Many');
            const after =
              operation === 'delete' ? null : isMany ? (args as any)?.data : result;
            const entityId = isMany
              ? 'MANY'
              : String(result?.id ?? before?.id ?? 'unknown');

            await client.auditLog.create({
              data: {
                actorId: AuditContext.getActorId(),
                action,
                entity: model,
                entityId,
                before: toJson(before),
                after: toJson(after),
              },
            });
          } catch {
            // Never let audit failures break the underlying operation.
          }

          return result;
        },
      },
    },
  }),
);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    // Replace the instance with the audited (extended) client. The extension
    // proxy forwards unknown members (onModuleInit, $connect, etc.) to this base.
    return this.$extends(auditExtension) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }
}
