import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListItemsDto } from './dto/list-items.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListItemsDto) {
    const { termId, search, isActive, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (termId) {
      where.termId = termId;
    }

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateItemDto, userId: string) {
    // Validate parent term exists and is not deleted
    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, deletedAt: null },
    });

    if (!term) {
      throw new BadRequestException(`Term ${dto.termId} not found or has been deleted`);
    }

    return this.prisma.item.create({
      data: {
        termId: dto.termId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        defaultUnit: dto.defaultUnit,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async update(id: string, dto: UpdateItemDto, userId: string) {
    await this.findOne(id);

    return this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.item.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }
}
