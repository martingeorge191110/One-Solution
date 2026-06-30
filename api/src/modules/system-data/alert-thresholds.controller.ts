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
import { AlertThresholdsService } from './alert-thresholds.service';
import { ListAlertThresholdsDto } from './dto/list-alert-thresholds.dto';
import { CreateAlertThresholdDto } from './dto/create-alert-threshold.dto';
import { UpdateAlertThresholdDto } from './dto/update-alert-threshold.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('system-data/alert-thresholds')
export class AlertThresholdsController {
  constructor(private readonly alertThresholdsService: AlertThresholdsService) {}

  @Get()
  findAll(@Query() query: ListAlertThresholdsDto) {
    return this.alertThresholdsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateAlertThresholdDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.alertThresholdsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertThresholdsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertThresholdDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.alertThresholdsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.alertThresholdsService.remove(id);
  }
}
