import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyLogsReportDto } from './dto/daily-logs-report.dto';
import { FinalInvoiceReportDto } from './dto/final-invoice-report.dto';

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
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // GET /reports/daily-logs
  // -------------------------------------------------------------------------

  async getDailyLogsReport(query: DailyLogsReportDto) {
    const { projectId, from, to } = query;

    // 1. Verify project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        location: true,
        unitType: true,
        supervisionPercent: true,
        client: {
          select: { name: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // 2. Build date range filter for logDate
    const dateFilter: Record<string, Date> = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const where: Record<string, any> = {
      projectId,
      deletedAt: null,
    };
    if (Object.keys(dateFilter).length > 0) {
      where.logDate = dateFilter;
    }

    // 3. Fetch non-deleted logs in range, ordered chronologically
    const logs = await this.prisma.dailyLog.findMany({
      where,
      select: {
        id: true,
        logDate: true,
        isAdditional: true,
        additionalNameAr: true,
        additionalNameEn: true,
        quantity: true,
        unit: true,
        unitPrice: true,
        amount: true,
        createdAt: true,
        term: { select: { nameAr: true, nameEn: true } },
        item: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: [{ logDate: 'asc' }, { createdAt: 'asc' }],
    });

    // 4. Shape entries — no actor/user identity
    const entries = logs.map((log) => ({
      id: log.id,
      logDate: log.logDate,
      isAdditional: log.isAdditional,
      termNameAr: log.term?.nameAr ?? null,
      termNameEn: log.term?.nameEn ?? null,
      itemNameAr: log.item?.nameAr ?? null,
      itemNameEn: log.item?.nameEn ?? null,
      additionalNameAr: log.additionalNameAr ?? null,
      additionalNameEn: log.additionalNameEn ?? null,
      quantity: log.quantity !== null ? Number(log.quantity) : null,
      unit: log.unit ?? null,
      unitPrice: log.unitPrice !== null ? Number(log.unitPrice) : null,
      amount: Number(log.amount),
    }));

    // 5. Compute totals
    const totalSpent = round2(entries.reduce((acc, e) => acc + e.amount, 0));
    const termItemSpent = round2(
      entries
        .filter((e) => !e.isAdditional)
        .reduce((acc, e) => acc + e.amount, 0),
    );
    const additionalsSpent = round2(
      entries
        .filter((e) => e.isAdditional)
        .reduce((acc, e) => acc + e.amount, 0),
    );

    return {
      header: {
        project: {
          id: project.id,
          name: project.name,
          location: project.location ?? null,
          unitType: project.unitType ?? null,
          supervisionPercent: Number(project.supervisionPercent),
        },
        client: project.client ? { name: project.client.name } : null,
        from: from ?? null,
        to: to ?? null,
      },
      entries,
      totals: {
        count: entries.length,
        totalSpent,
        termItemSpent,
        additionalsSpent,
      },
    };
  }

  // -------------------------------------------------------------------------
  // GET /reports/final-invoice
  // -------------------------------------------------------------------------

  async getFinalInvoiceReport(query: FinalInvoiceReportDto) {
    const { projectId } = query;

    // 1. Verify project exists and is not deleted
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        location: true,
        unitType: true,
        supervisionPercent: true,
        client: {
          select: { name: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // 2. Fetch ALL non-deleted daily logs for this project
    const logs = await this.prisma.dailyLog.findMany({
      where: { projectId, deletedAt: null },
      select: {
        isAdditional: true,
        termId: true,
        itemId: true,
        additionalNameAr: true,
        additionalNameEn: true,
        quantity: true,
        amount: true,
        term: { select: { nameAr: true, nameEn: true } },
        item: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: [{ logDate: 'asc' }, { createdAt: 'asc' }],
    });

    // 3. Separate term/item logs from additional logs
    const termItemLogs = logs.filter((l) => !l.isAdditional);
    const additionalLogs = logs.filter((l) => l.isAdditional);

    // 4. Build term→item rollup (per-item totals across all days)
    //    Use a Map keyed by termId to preserve first-seen order
    const termMap = new Map<
      string,
      {
        termId: string;
        termNameAr: string;
        termNameEn: string | null;
        items: Map<
          string,
          {
            itemId: string;
            itemNameAr: string;
            itemNameEn: string | null;
            totalQuantity: number;
            totalAmount: number;
          }
        >;
      }
    >();

    for (const log of termItemLogs) {
      // termId and itemId are always present for non-additional logs
      const termId = log.termId as string;
      const itemId = log.itemId as string;

      if (!termMap.has(termId)) {
        termMap.set(termId, {
          termId,
          termNameAr: log.term?.nameAr ?? '',
          termNameEn: log.term?.nameEn ?? null,
          items: new Map(),
        });
      }

      const termEntry = termMap.get(termId)!;

      if (!termEntry.items.has(itemId)) {
        termEntry.items.set(itemId, {
          itemId,
          itemNameAr: log.item?.nameAr ?? '',
          itemNameEn: log.item?.nameEn ?? null,
          totalQuantity: 0,
          totalAmount: 0,
        });
      }

      const itemEntry = termEntry.items.get(itemId)!;
      itemEntry.totalQuantity += log.quantity !== null ? Number(log.quantity) : 0;
      itemEntry.totalAmount += Number(log.amount);
    }

    // 5. Serialize terms array with rounded values
    const terms = Array.from(termMap.values()).map((t) => {
      const items = Array.from(t.items.values()).map((i) => ({
        itemId: i.itemId,
        itemNameAr: i.itemNameAr,
        itemNameEn: i.itemNameEn,
        totalQuantity: round2(i.totalQuantity),
        totalAmount: round2(i.totalAmount),
      }));
      const termTotal = round2(items.reduce((acc, i) => acc + i.totalAmount, 0));
      return {
        termId: t.termId,
        termNameAr: t.termNameAr,
        termNameEn: t.termNameEn,
        items,
        termTotal,
      };
    });

    // 6. Group additional logs by additionalNameAr (sum quantity + amount)
    const additionalsMap = new Map<
      string,
      {
        nameAr: string;
        nameEn: string | null;
        totalQuantity: number;
        totalAmount: number;
      }
    >();

    for (const log of additionalLogs) {
      const key = log.additionalNameAr ?? '';
      if (!additionalsMap.has(key)) {
        additionalsMap.set(key, {
          nameAr: log.additionalNameAr ?? '',
          nameEn: log.additionalNameEn ?? null,
          totalQuantity: 0,
          totalAmount: 0,
        });
      }
      const entry = additionalsMap.get(key)!;
      entry.totalQuantity += log.quantity !== null ? Number(log.quantity) : 0;
      entry.totalAmount += Number(log.amount);
    }

    const additionals = Array.from(additionalsMap.values()).map((a) => ({
      nameAr: a.nameAr,
      nameEn: a.nameEn,
      totalQuantity: round2(a.totalQuantity),
      totalAmount: round2(a.totalAmount),
    }));

    // 7. Invoice math
    const termsTotalAmount = terms.reduce((acc, t) => acc + t.termTotal, 0);
    const additionalsTotalAmount = additionals.reduce(
      (acc, a) => acc + a.totalAmount,
      0,
    );
    const totalSpent = round2(termsTotalAmount + additionalsTotalAmount);
    const supervisionPercent = Number(project.supervisionPercent);
    const supervisionFee = round2((totalSpent * supervisionPercent) / 100);
    const invoiceTotal = round2(totalSpent + supervisionFee);

    return {
      header: {
        project: {
          id: project.id,
          name: project.name,
          location: project.location ?? null,
          unitType: project.unitType ?? null,
          supervisionPercent,
        },
        client: project.client ? { name: project.client.name } : null,
      },
      terms,
      additionals,
      totalSpent,
      supervisionPercent,
      supervisionFee,
      invoiceTotal,
    };
  }
}
