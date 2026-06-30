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
import { TermsConditionsService } from './terms-conditions.service';
import { ListTermsConditionsDto } from './dto/list-terms-conditions.dto';
import { CreateTermsConditionDto } from './dto/create-terms-condition.dto';
import { UpdateTermsConditionDto } from './dto/update-terms-condition.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('system-data/terms-conditions')
export class TermsConditionsController {
  constructor(private readonly termsConditionsService: TermsConditionsService) {}

  @Get()
  findAll(@Query() query: ListTermsConditionsDto) {
    return this.termsConditionsService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateTermsConditionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsConditionsService.create(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.termsConditionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTermsConditionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsConditionsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.termsConditionsService.remove(id, userId);
  }
}
