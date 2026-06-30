import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';
import { ListDailyLogsDto } from './dto/list-daily-logs.dto';

// ---------------------------------------------------------------------------
// Shared include shape for responses
// ---------------------------------------------------------------------------

const LOG_INCLUDE = {
  term: { select: { nameAr: true, nameEn: true } },
  item: { select: { nameAr: true, nameEn: true } },
} as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DailyLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // LIST
  // -------------------------------------------------------------------------

  async findAll(query: ListDailyLogsDto) {
    const { projectId, from, to, termId, isAdditional, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (projectId) where.projectId = projectId;
    if (termId) where.termId = termId;
    if (isAdditional !== undefined) where.isAdditional = isAdditional;

    if (from || to) {
      where.logDate = {};
      if (from) where.logDate.gte = new Date(from);
      if (to) {
        // inclusive: extend to end of day
        const toDate = new Date(to);
        toDate.setUTCHours(23, 59, 59, 999);
        where.logDate.lte = toDate;
      }
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.dailyLog.findMany({
        where,
        include: LOG_INCLUDE,
        orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.dailyLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

  async create(dto: CreateDailyLogDto, userId: string) {
    const isAdditional = dto.isAdditional ?? false;

    // 1. Validate project exists, not deleted, and is ACTIVE
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!project) {
      throw new BadRequestException(
        `Project ${dto.projectId} not found or has been deleted`,
      );
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'Daily logs can only be recorded for an active project',
      );
    }

    // 2. Conditional validation: term+item vs additional
    let resolvedTermId: string | null = null;
    let resolvedItemId: string | null = null;
    let resolvedAdditionalNameAr: string | null = null;
    let resolvedAdditionalNameEn: string | null = null;

    if (!isAdditional) {
      // termId and itemId are required (enforced by class-validator @ValidateIf too,
      // but we double-check here for clear error messages)
      if (!dto.termId || !dto.itemId) {
        throw new BadRequestException(
          'termId and itemId are required for non-additional daily logs',
        );
      }

      // Load item and verify it exists, is not deleted, and belongs to the given term
      const item = await this.prisma.item.findFirst({
        where: { id: dto.itemId, deletedAt: null },
        select: { id: true, termId: true },
      });

      if (!item) {
        throw new BadRequestException(
          `Item ${dto.itemId} not found or has been deleted`,
        );
      }

      if (item.termId !== dto.termId) {
        throw new BadRequestException(
          'Item does not belong to the given term',
        );
      }

      resolvedTermId = dto.termId;
      resolvedItemId = dto.itemId;
    } else {
      // isAdditional === true: additionalNameAr required
      if (!dto.additionalNameAr) {
        throw new BadRequestException(
          'additionalNameAr is required for additional daily logs',
        );
      }

      resolvedAdditionalNameAr = dto.additionalNameAr;
      resolvedAdditionalNameEn = dto.additionalNameEn ?? null;
    }

    // 3. Create the log
    return this.prisma.dailyLog.create({
      data: {
        projectId: dto.projectId,
        logDate: new Date(dto.logDate),
        isAdditional,
        termId: resolvedTermId,
        itemId: resolvedItemId,
        additionalNameAr: resolvedAdditionalNameAr,
        additionalNameEn: resolvedAdditionalNameEn,
        quantity: dto.quantity ?? null,
        unit: dto.unit ?? null,
        unitPrice: dto.unitPrice ?? null,
        amount: dto.amount,
        notes: dto.notes ?? null,
        createdById: userId,
        updatedById: userId,
      },
      include: LOG_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // FIND ONE
  // -------------------------------------------------------------------------

  async findOne(id: string) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id, deletedAt: null },
      include: LOG_INCLUDE,
    });

    if (!log) {
      throw new NotFoundException(`DailyLog ${id} not found`);
    }

    return log;
  }

  // -------------------------------------------------------------------------
  // UPDATE (PATCH)
  // -------------------------------------------------------------------------

  async update(id: string, dto: UpdateDailyLogDto, userId: string) {
    const existing = await this.findOne(id);

    // Determine effective isAdditional after patch
    const isAdditional =
      dto.isAdditional !== undefined ? dto.isAdditional : existing.isAdditional;

    // If term/item are being changed (or isAdditional is being toggled), re-validate
    let resolvedTermId = existing.termId;
    let resolvedItemId = existing.itemId;
    let resolvedAdditionalNameAr = existing.additionalNameAr;
    let resolvedAdditionalNameEn = existing.additionalNameEn;

    if (!isAdditional) {
      // Either term/item changing or isAdditional toggling to false
      const newTermId = dto.termId ?? existing.termId;
      const newItemId = dto.itemId ?? existing.itemId;

      // Only re-validate if something changed relating to term/item
      if (
        dto.termId !== undefined ||
        dto.itemId !== undefined ||
        dto.isAdditional === false
      ) {
        if (!newTermId || !newItemId) {
          throw new BadRequestException(
            'termId and itemId are required for non-additional daily logs',
          );
        }

        const item = await this.prisma.item.findFirst({
          where: { id: newItemId, deletedAt: null },
          select: { id: true, termId: true },
        });

        if (!item) {
          throw new BadRequestException(
            `Item ${newItemId} not found or has been deleted`,
          );
        }

        if (item.termId !== newTermId) {
          throw new BadRequestException(
            'Item does not belong to the given term',
          );
        }
      }

      resolvedTermId = newTermId;
      resolvedItemId = newItemId;

      if (dto.isAdditional === false) {
        // Clear additional fields when toggling to non-additional
        resolvedAdditionalNameAr = null;
        resolvedAdditionalNameEn = null;
      }
    } else {
      // isAdditional === true
      if (dto.isAdditional === true) {
        // Toggling to additional — require additionalNameAr
        if (!dto.additionalNameAr && !existing.additionalNameAr) {
          throw new BadRequestException(
            'additionalNameAr is required for additional daily logs',
          );
        }
        // Clear term/item
        resolvedTermId = null;
        resolvedItemId = null;
      }

      resolvedAdditionalNameAr =
        dto.additionalNameAr !== undefined
          ? dto.additionalNameAr
          : existing.additionalNameAr;
      resolvedAdditionalNameEn =
        dto.additionalNameEn !== undefined
          ? dto.additionalNameEn
          : existing.additionalNameEn;
    }

    return this.prisma.dailyLog.update({
      where: { id },
      data: {
        ...(dto.logDate !== undefined ? { logDate: new Date(dto.logDate) } : {}),
        isAdditional,
        termId: resolvedTermId,
        itemId: resolvedItemId,
        additionalNameAr: resolvedAdditionalNameAr,
        additionalNameEn: resolvedAdditionalNameEn,
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: userId,
      },
      include: LOG_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // DELETE (soft)
  // -------------------------------------------------------------------------

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.dailyLog.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------

  async getSummary(projectId: string) {
    const logs = await this.prisma.dailyLog.findMany({
      where: { projectId, deletedAt: null },
      select: {
        amount: true,
        isAdditional: true,
        logDate: true,
      },
    });

    const logsCount = logs.length;

    const totalSpent = round2(
      logs.reduce((acc, l) => acc + Number(l.amount), 0),
    );

    const termItemSpent = round2(
      logs
        .filter((l) => !l.isAdditional)
        .reduce((acc, l) => acc + Number(l.amount), 0),
    );

    const additionalsSpent = round2(
      logs
        .filter((l) => l.isAdditional)
        .reduce((acc, l) => acc + Number(l.amount), 0),
    );

    const lastLogDate =
      logs.length > 0
        ? logs.reduce((latest, l) =>
            l.logDate > latest.logDate ? l : latest,
          ).logDate
        : null;

    return {
      logsCount,
      totalSpent,
      termItemSpent,
      additionalsSpent,
      lastLogDate,
    };
  }
}
