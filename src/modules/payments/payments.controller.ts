import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // NOTE: 'summary' is declared BEFORE ':id' to prevent it from being shadowed.
  @Get('summary')
  getSummary(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.paymentsService.getSummary(projectId);
  }

  @Get()
  findAll(@Query() query: ListPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.remove(id, userId);
  }
}
