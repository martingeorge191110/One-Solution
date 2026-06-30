import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListProjectsDto } from './dto/list-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

/** Allowed manual status transitions: from → set of valid next statuses */
const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [ProjectStatus.DRAFT],
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListProjectsDto) {
    const { search, clientId, status, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateProjectDto, userId: string) {
    // Validate client exists and is not deleted
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, deletedAt: null },
    });

    if (!client) {
      throw new BadRequestException(
        `Client ${dto.clientId} not found or has been deleted`,
      );
    }

    return this.prisma.project.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        location: dto.location,
        unitType: dto.unitType,
        description: dto.description,
        supervisionPercent: dto.supervisionPercent ?? 0,
        status: ProjectStatus.DRAFT,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: {
          select: { id: true, name: true, phone: true, email: true },
        },
        _count: {
          select: {
            quotations: { where: { deletedAt: null } },
            payments: { where: { deletedAt: null } },
            dailyLogs: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    await this.findOne(id);

    // If clientId is being changed, verify the new client exists
    if (dto.clientId !== undefined) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, deletedAt: null },
      });

      if (!client) {
        throw new BadRequestException(
          `Client ${dto.clientId} not found or has been deleted`,
        );
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateProjectStatusDto,
    userId: string,
  ) {
    const project = await this.findOne(id);
    const { status: newStatus } = dto;

    // ACTIVE can never be set manually
    if (newStatus === ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'A project is activated by approving its quotation',
      );
    }

    const allowed = ALLOWED_TRANSITIONS[project.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition project from ${project.status} to ${newStatus}`,
      );
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        status: newStatus,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  async getSummary() {
    const [projectsCount, byStatusRaw] = await Promise.all([
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<ProjectStatus, number> = {
      [ProjectStatus.DRAFT]: 0,
      [ProjectStatus.ACTIVE]: 0,
      [ProjectStatus.COMPLETED]: 0,
      [ProjectStatus.CANCELLED]: 0,
    };

    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count._all;
    }

    return {
      projectsCount,
      byStatus,
      activeCount: byStatus[ProjectStatus.ACTIVE],
    };
  }
}
