import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { ListQuotationsDto } from './dto/list-quotations.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  findAll(@Query() query: ListQuotationsDto) {
    return this.quotationsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.remove(id, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.approve(id, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.reject(id, userId);
  }
}
