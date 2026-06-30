import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingMode, ProjectStatus, QuotationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListQuotationsDto } from './dto/list-quotations.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

// ---------------------------------------------------------------------------
// Shared include shapes
// ---------------------------------------------------------------------------

/** Include for list responses: minimal project + line count. */
const LIST_INCLUDE = {
  project: { select: { id: true, name: true } },
  _count: { select: { lines: true } },
} as const;

/** Include for single-quotation responses: full project + lines + conditions. */
const FULL_INCLUDE = {
  lines: {
    include: { term: { select: { nameAr: true, nameEn: true } } },
    orderBy: { order: 'asc' as const },
  },
  conditions: {
    orderBy: { order: 'asc' as const },
  },
  project: {
    select: {
      id: true,
      name: true,
      location: true,
      unitType: true,
      status: true,
      supervisionPercent: true,
      client: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Financial helpers
// ---------------------------------------------------------------------------

/** Round a JS number to 2 decimal places (returns number, stored as Decimal). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface LineInput {
  pricingMode: PricingMode;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
}

function computeLineTotal(line: LineInput): number {
  if (line.pricingMode === PricingMode.UNIT) {
    const q = Number(line.quantity ?? 0);
    const p = Number(line.unitPrice ?? 0);
    return round2(q * p);
  }
  // LUMP_SUM
  return round2(Number(line.lineTotal ?? 0));
}

interface Totals {
  subtotal: number;
  supervisionAmount: number;
  grandTotal: number;
}

function computeTotals(lineTotals: number[], supervisionPercent: number): Totals {
  const subtotal = round2(lineTotals.reduce((acc, t) => acc + t, 0));
  const supervisionAmount = round2(subtotal * (supervisionPercent / 100));
  const grandTotal = round2(subtotal + supervisionAmount);
  return { subtotal, supervisionAmount, grandTotal };
}

// ---------------------------------------------------------------------------
// quotationNumber generation
// ---------------------------------------------------------------------------

/** Generate Q-YYYY-NNNN where NNNN is count-of-quotations-this-year + 1. */
async function generateQuotationNumber(
  prisma: PrismaService,
): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  // Count ALL quotations in this year (including deleted) so we never reuse a number.
  const count = await (prisma as any).quotation.count({
    where: {
      createdAt: { gte: yearStart, lt: yearEnd },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `Q-${year}-${seq}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // LIST
  // -------------------------------------------------------------------------

  async findAll(query: ListQuotationsDto) {
    const { projectId, status, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

  async create(dto: CreateQuotationDto, userId: string) {
    // 1. Validate project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, deletedAt: null },
    });
    if (!project) {
      throw new BadRequestException(
        `Project ${dto.projectId} not found or has been deleted`,
      );
    }

    // 2. Resolve supervisionPercent (snapshot from project if not supplied)
    const supervisionPercent =
      dto.supervisionPercent !== undefined && dto.supervisionPercent !== null
        ? dto.supervisionPercent
        : Number(project.supervisionPercent);

    // 3. Validate all termIds exist and are not deleted
    await this.validateTermIds(dto.lines.map((l) => l.termId));

    // 4. Validate conditionIds if supplied and fetch conditions for snapshotting
    const conditions = await this.fetchConditions(dto.conditionIds);

    // 5. Generate unique quotationNumber
    const quotationNumber = await generateQuotationNumber(this.prisma);

    // 6. Compute line totals and aggregate totals
    const lineTotals = dto.lines.map((l) => computeLineTotal(l));
    const totals = computeTotals(lineTotals, supervisionPercent);

    // 7. Build date
    const date = dto.date ? new Date(dto.date) : new Date();

    // 8. Create everything in a transaction
    const quotation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          projectId: dto.projectId,
          quotationNumber,
          date,
          status: QuotationStatus.DRAFT,
          supervisionPercent,
          subtotal: totals.subtotal,
          supervisionAmount: totals.supervisionAmount,
          grandTotal: totals.grandTotal,
          subject: dto.subject,
          notes: dto.notes,
          createdById: userId,
          updatedById: userId,
          lines: {
            create: dto.lines.map((line, idx) => ({
              termId: line.termId,
              order: line.order ?? idx,
              pricingMode: line.pricingMode,
              unit: line.unit,
              quantity:
                line.pricingMode === PricingMode.UNIT
                  ? line.quantity
                  : null,
              unitPrice:
                line.pricingMode === PricingMode.UNIT
                  ? line.unitPrice
                  : null,
              lineTotal: lineTotals[idx],
              descriptionAr: line.descriptionAr,
              descriptionEn: line.descriptionEn,
            })),
          },
          conditions: {
            create: conditions.map((c, idx) => ({
              order: c.order ?? idx,
              titleAr: c.titleAr,
              titleEn: c.titleEn,
              bodyAr: c.bodyAr,
              bodyEn: c.bodyEn,
            })),
          },
        },
        include: FULL_INCLUDE,
      });
      return created;
    });

    return quotation;
  }

  // -------------------------------------------------------------------------
  // FIND ONE
  // -------------------------------------------------------------------------

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: FULL_INCLUDE,
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    return quotation;
  }

  // -------------------------------------------------------------------------
  // UPDATE (PATCH)
  // -------------------------------------------------------------------------

  async update(id: string, dto: UpdateQuotationDto, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be edited');
    }

    // Resolve new supervisionPercent
    const supervisionPercent =
      dto.supervisionPercent !== undefined && dto.supervisionPercent !== null
        ? dto.supervisionPercent
        : Number(existing.supervisionPercent);

    const date = dto.date ? new Date(dto.date) : undefined;

    const quotation = await this.prisma.$transaction(async (tx) => {
      // If lines provided, replace them
      let subtotal = Number(existing.subtotal);
      let supervisionAmount = Number(existing.supervisionAmount);
      let grandTotal = Number(existing.grandTotal);

      if (dto.lines !== undefined) {
        // Validate termIds
        await this.validateTermIds(dto.lines.map((l) => l.termId));

        // Delete existing lines (cascade via DB onDelete:Cascade would handle
        // QuotationLine, but we're using explicit deleteMany to be safe in tx).
        await tx.quotationLine.deleteMany({ where: { quotationId: id } });

        // Recompute totals
        const lineTotals = dto.lines.map((l) => computeLineTotal(l));
        const newTotals = computeTotals(lineTotals, supervisionPercent);
        subtotal = newTotals.subtotal;
        supervisionAmount = newTotals.supervisionAmount;
        grandTotal = newTotals.grandTotal;

        // Create new lines
        await tx.quotationLine.createMany({
          data: dto.lines.map((line, idx) => ({
            quotationId: id,
            termId: line.termId,
            order: line.order ?? idx,
            pricingMode: line.pricingMode,
            unit: line.unit ?? null,
            quantity:
              line.pricingMode === PricingMode.UNIT
                ? (line.quantity ?? null)
                : null,
            unitPrice:
              line.pricingMode === PricingMode.UNIT
                ? (line.unitPrice ?? null)
                : null,
            lineTotal: lineTotals[idx],
            descriptionAr: line.descriptionAr ?? null,
            descriptionEn: line.descriptionEn ?? null,
          })),
        });
      } else if (dto.supervisionPercent !== undefined) {
        // Lines unchanged but supervisionPercent changed — recompute from existing lines
        const existingLines = await tx.quotationLine.findMany({
          where: { quotationId: id },
        });
        const lineTotals = existingLines.map((l) => Number(l.lineTotal));
        const newTotals = computeTotals(lineTotals, supervisionPercent);
        subtotal = newTotals.subtotal;
        supervisionAmount = newTotals.supervisionAmount;
        grandTotal = newTotals.grandTotal;
      }

      // If conditionIds provided, replace conditions
      if (dto.conditionIds !== undefined) {
        await tx.quotationCondition.deleteMany({ where: { quotationId: id } });
        const conditions = await this.fetchConditions(dto.conditionIds, tx as any);
        if (conditions.length > 0) {
          await tx.quotationCondition.createMany({
            data: conditions.map((c, idx) => ({
              quotationId: id,
              order: c.order ?? idx,
              titleAr: c.titleAr ?? null,
              titleEn: c.titleEn ?? null,
              bodyAr: c.bodyAr,
              bodyEn: c.bodyEn ?? null,
            })),
          });
        }
      }

      return tx.quotation.update({
        where: { id },
        data: {
          ...(date !== undefined ? { date } : {}),
          ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          supervisionPercent,
          subtotal,
          supervisionAmount,
          grandTotal,
          updatedById: userId,
        },
        include: FULL_INCLUDE,
      });
    });

    return quotation;
  }

  // -------------------------------------------------------------------------
  // DELETE (soft)
  // -------------------------------------------------------------------------

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status === QuotationStatus.APPROVED) {
      throw new BadRequestException(
        'Approved quotations cannot be deleted',
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // APPROVE
  // -------------------------------------------------------------------------

  async approve(id: string, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft quotations can be approved',
      );
    }

    const now = new Date();

    // Fetch the project to check if already activated
    const project = await this.prisma.project.findFirst({
      where: { id: existing.projectId },
      select: { activatedAt: true },
    });

    const quotation = await this.prisma.$transaction(async (tx) => {
      // Activate the project (preserve existing activatedAt if already set)
      await tx.project.update({
        where: { id: existing.projectId },
        data: {
          status: ProjectStatus.ACTIVE,
          activatedAt: project?.activatedAt ?? now,
          updatedById: userId,
        },
      });

      return tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.APPROVED,
          approvedAt: now,
          approvedById: userId,
          updatedById: userId,
        },
        include: FULL_INCLUDE,
      });
    });

    return quotation;
  }

  // -------------------------------------------------------------------------
  // REJECT
  // -------------------------------------------------------------------------

  async reject(id: string, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft quotations can be rejected',
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        updatedById: userId,
      },
      include: FULL_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Validate that all provided termIds exist and are not soft-deleted. */
  private async validateTermIds(termIds: string[]): Promise<void> {
    const unique = [...new Set(termIds)];
    const found = await this.prisma.term.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      const foundIds = new Set(found.map((t) => t.id));
      const missing = unique.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Term(s) not found or deleted: ${missing.join(', ')}`,
      );
    }
  }

  /** Fetch TermsConditions by ids in their original order. Validates they exist. */
  private async fetchConditions(
    conditionIds?: string[],
    tx?: any,
  ): Promise<
    Array<{
      order: number;
      titleAr: string | null;
      titleEn: string | null;
      bodyAr: string;
      bodyEn: string | null;
    }>
  > {
    if (!conditionIds || conditionIds.length === 0) return [];

    const client = tx ?? this.prisma;
    const rows = await client.termsCondition.findMany({
      where: { id: { in: conditionIds }, deletedAt: null },
      select: {
        id: true,
        order: true,
        titleAr: true,
        titleEn: true,
        bodyAr: true,
        bodyEn: true,
      },
    });

    if (rows.length !== conditionIds.length) {
      const foundIds = new Set(rows.map((r: { id: string }) => r.id));
      const missing = conditionIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `TermsCondition(s) not found or deleted: ${missing.join(', ')}`,
      );
    }

    // Preserve caller-supplied order (conditionIds array order)
    const idxMap = new Map(conditionIds.map((id, i) => [id, i]));
    rows.sort(
      (a: { id: string }, b: { id: string }) =>
        (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0),
    );

    return rows;
  }

}
