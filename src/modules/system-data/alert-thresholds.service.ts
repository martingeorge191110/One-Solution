import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAlertThresholdsDto } from './dto/list-alert-thresholds.dto';
import { CreateAlertThresholdDto } from './dto/create-alert-threshold.dto';
import { UpdateAlertThresholdDto } from './dto/update-alert-threshold.dto';

@Injectable()
export class AlertThresholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListAlertThresholdsDto) {
    const { projectId, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = {};

    if (projectId !== undefined) {
      if (projectId === 'global') {
        where.projectId = null;
      } else {
        where.projectId = projectId;
      }
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.alertThreshold.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.alertThreshold.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateAlertThresholdDto, userId: string) {
    const type = dto.type ?? AlertType.REMAINING_OPERATIONAL_LOW;
    const resolvedProjectId = dto.projectId ?? null;

    // Enforce @@unique([type, projectId]) — use findFirst for null projectId case
    // because Prisma cannot do unique lookups on null compound keys
    const existing = await this.prisma.alertThreshold.findFirst({
      where: {
        type,
        projectId: resolvedProjectId,
      },
    });

    if (existing) {
      const scope = resolvedProjectId ? `project ${resolvedProjectId}` : 'global';
      throw new ConflictException(
        `An alert threshold of type ${type} already exists for ${scope}`,
      );
    }

    return this.prisma.alertThreshold.create({
      data: {
        type,
        mode: dto.mode,
        value: dto.value,
        basis: dto.basis,
        isActive: dto.isActive ?? true,
        projectId: resolvedProjectId,
        createdById: userId,
      },
    });
  }

  async findOne(id: string) {
    const threshold = await this.prisma.alertThreshold.findUnique({
      where: { id },
    });

    if (!threshold) {
      throw new NotFoundException(`Alert threshold ${id} not found`);
    }

    return threshold;
  }

  async update(id: string, dto: UpdateAlertThresholdDto, userId: string) {
    await this.findOne(id);

    return this.prisma.alertThreshold.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // AlertThreshold has no deletedAt — hard delete
    return this.prisma.alertThreshold.delete({
      where: { id },
    });
  }
}
