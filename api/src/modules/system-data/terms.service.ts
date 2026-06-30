import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListTermsDto } from './dto/list-terms.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListTermsDto) {
    const { search, isActive, includeItems, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

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

    const include = includeItems
      ? {
          items: {
            where: { deletedAt: null },
            orderBy: [{ order: 'asc' as const }, { createdAt: 'desc' as const }],
          },
        }
      : {
          _count: {
            select: {
              items: { where: { deletedAt: null } },
            },
          },
        };

    const [data, total] = await Promise.all([
      this.prisma.term.findMany({
        where,
        include,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.term.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateTermDto, userId: string) {
    return this.prisma.term.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        description: dto.description,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async findOne(id: string) {
    const term = await this.prisma.term.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!term) {
      throw new NotFoundException(`Term ${id} not found`);
    }

    return term;
  }

  async update(id: string, dto: UpdateTermDto, userId: string) {
    await this.findOne(id);

    return this.prisma.term.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    const now = new Date();

    // Cascade soft-delete all non-deleted items belonging to this term
    await this.prisma.item.updateMany({
      where: { termId: id, deletedAt: null },
      data: {
        deletedAt: now,
        deletedById: userId,
      },
    });

    return this.prisma.term.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedById: userId,
      },
    });
  }
}
