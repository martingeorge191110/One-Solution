import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      termsCount,
      itemsCount,
      conditionsCount,
      thresholdsCount,
      activeTermsCount,
      activeItemsCount,
    ] = await Promise.all([
      this.prisma.term.count({ where: { deletedAt: null } }),
      this.prisma.item.count({ where: { deletedAt: null } }),
      this.prisma.termsCondition.count({ where: { deletedAt: null } }),
      this.prisma.alertThreshold.count(),
      this.prisma.term.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.item.count({ where: { deletedAt: null, isActive: true } }),
    ]);

    return {
      termsCount,
      itemsCount,
      conditionsCount,
      thresholdsCount,
      activeTermsCount,
      activeItemsCount,
    };
  }
}
