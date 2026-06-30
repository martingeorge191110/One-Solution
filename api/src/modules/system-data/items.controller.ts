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
import { ItemsService } from './items.service';
import { ListItemsDto } from './dto/list-items.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('system-data/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@Query() query: ListItemsDto) {
    return this.itemsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemsService.remove(id, userId);
  }
}
