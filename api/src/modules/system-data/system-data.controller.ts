import { Controller, Get } from '@nestjs/common';
import { SystemDataService } from './system-data.service';

@Controller('system-data')
export class SystemDataController {
  constructor(private readonly systemDataService: SystemDataService) {}

  @Get('summary')
  getSummary() {
    return this.systemDataService.getSummary();
  }
}
