import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListTermsConditionsDto } from './dto/list-terms-conditions.dto';
import { CreateTermsConditionDto } from './dto/create-terms-condition.dto';
import { UpdateTermsConditionDto } from './dto/update-terms-condition.dto';

@Injectable()
export class TermsConditionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListTermsConditionsDto) {
    const { search, isActive, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (search) {
      where.OR = [
        { titleAr: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { bodyAr: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.termsCondition.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.termsCondition.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateTermsConditionDto, userId: string) {
    return this.prisma.termsCondition.create({
      data: {
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
    });
  }

  async findOne(id: string) {
    const condition = await this.prisma.termsCondition.findFirst({
      where: { id, deletedAt: null },
    });

    if (!condition) {
      throw new NotFoundException(`Terms condition ${id} not found`);
    }

    return condition;
  }

  async update(id: string, dto: UpdateTermsConditionDto, userId: string) {
    await this.findOne(id);

    return this.prisma.termsCondition.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.termsCondition.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }
}
