import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListClientsDto } from './dto/list-clients.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListClientsDto) {
    const { search, page = 1, pageSize = 20 } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          _count: {
            select: {
              projects: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreateClientDto, userId: string) {
    return this.prisma.client.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            supervisionPercent: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto, userId: string) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    const projectCount = await this.prisma.project.count({
      where: { clientId: id, deletedAt: null },
    });

    if (projectCount > 0) {
      throw new ConflictException(
        'Cannot delete a client that still has projects',
      );
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  async getSummary() {
    const clientsCount = await this.prisma.client.count({
      where: { deletedAt: null },
    });

    return { clientsCount };
  }
}
