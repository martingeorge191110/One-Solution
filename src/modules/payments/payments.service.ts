import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';

// ---------------------------------------------------------------------------
// Financial helpers
// ---------------------------------------------------------------------------

/** Round a JS number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Markup-consistent split:
 *   f = 1 + S/100
 *   operationalAmount = amount / f
 *   supervisionAmount = amount - operationalAmount
 */
function computeSplit(
  amount: number,
  supervisionPercent: number,
): { operationalAmount: number; supervisionAmount: number } {
  const f = 1 + supervisionPercent / 100;
  const operationalAmount = round2(amount / f);
  const supervisionAmount = round2(amount - operationalAmount);
  return { operationalAmount, supervisionAmount };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // LIST
  // -------------------------------------------------------------------------

  async findAll(query: ListPaymentsDto) {
    const { projectId, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (projectId) {
      where.projectId = projectId;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

  async create(dto: CreatePaymentDto, userId: string) {
    // 1. Validate project exists, not deleted, and is ACTIVE
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, deletedAt: null },
      select: { id: true, status: true, supervisionPercent: true },
    });

    if (!project) {
      throw new BadRequestException(
        `Project ${dto.projectId} not found or has been deleted`,
      );
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'Payments can only be recorded for an active project',
      );
    }

    // 2. Snapshot supervisionPercent from the project
    const supervisionPercent = Number(project.supervisionPercent);

    // 3. Compute the markup-consistent split
    const amount = dto.amount;
    const { operationalAmount, supervisionAmount } = computeSplit(
      amount,
      supervisionPercent,
    );

    // 4. Create the payment
    return this.prisma.payment.create({
      data: {
        projectId: dto.projectId,
        amount,
        paidAt: new Date(dto.paidAt),
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
        supervisionPercent,
        operationalAmount,
        supervisionAmount,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // FIND ONE
  // -------------------------------------------------------------------------

  async findOne(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  // -------------------------------------------------------------------------
  // UPDATE (PATCH)
  // -------------------------------------------------------------------------

  async update(id: string, dto: UpdatePaymentDto, userId: string) {
    const existing = await this.findOne(id);

    // Recompute split only if amount is being changed, using the STORED supervisionPercent
    let operationalAmount = Number(existing.operationalAmount);
    let supervisionAmount = Number(existing.supervisionAmount);

    if (dto.amount !== undefined) {
      const storedPercent = Number(existing.supervisionPercent);
      const split = computeSplit(dto.amount, storedPercent);
      operationalAmount = split.operationalAmount;
      supervisionAmount = split.supervisionAmount;
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.paidAt !== undefined ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        operationalAmount,
        supervisionAmount,
        updatedById: userId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // DELETE (soft)
  // -------------------------------------------------------------------------

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.payment.update({
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
    const payments = await this.prisma.payment.findMany({
      where: { projectId, deletedAt: null },
      select: {
        amount: true,
        operationalAmount: true,
        supervisionAmount: true,
        paidAt: true,
      },
    });

    const paymentsCount = payments.length;
    const totalCollected = round2(
      payments.reduce((acc, p) => acc + Number(p.amount), 0),
    );
    const totalOperationalCollected = round2(
      payments.reduce((acc, p) => acc + Number(p.operationalAmount), 0),
    );
    const totalSupervisionEarned = round2(
      payments.reduce((acc, p) => acc + Number(p.supervisionAmount), 0),
    );

    const lastPaymentDate =
      payments.length > 0
        ? payments.reduce((latest, p) =>
            p.paidAt > latest.paidAt ? p : latest,
          ).paidAt
        : null;

    return {
      paymentsCount,
      totalCollected: Number(totalCollected),
      totalOperationalCollected: Number(totalOperationalCollected),
      totalSupervisionEarned: Number(totalSupervisionEarned),
      lastPaymentDate,
    };
  }
}
