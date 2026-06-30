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
import { TermsService } from './terms.service';
import { ListTermsDto } from './dto/list-terms.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('system-data/terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  findAll(@Query() query: ListTermsDto) {
    return this.termsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateTermDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.termsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsService.remove(id, userId);
  }
}
