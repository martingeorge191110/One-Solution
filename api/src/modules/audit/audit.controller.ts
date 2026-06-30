import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { ListAuditDto } from './dto/list-audit.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Roles(Role.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() query: ListAuditDto) {
    return this.auditService.findAll(query);
  }
}
