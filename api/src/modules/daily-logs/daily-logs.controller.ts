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
import { DailyLogsService } from './daily-logs.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';
import { ListDailyLogsDto } from './dto/list-daily-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('daily-logs')
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  // NOTE: 'summary' MUST be declared BEFORE ':id' to prevent shadowing.
  @Get('summary')
  getSummary(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.dailyLogsService.getSummary(projectId);
  }

  @Get()
  findAll(@Query() query: ListDailyLogsDto) {
    return this.dailyLogsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateDailyLogDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dailyLogsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailyLogsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dailyLogsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dailyLogsService.remove(id, userId);
  }
}
