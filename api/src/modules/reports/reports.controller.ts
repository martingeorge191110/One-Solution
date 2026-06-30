import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DailyLogsReportDto } from './dto/daily-logs-report.dto';
import { FinalInvoiceReportDto } from './dto/final-invoice-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-logs')
  getDailyLogsReport(@Query() query: DailyLogsReportDto) {
    return this.reportsService.getDailyLogsReport(query);
  }

  @Get('final-invoice')
  getFinalInvoiceReport(@Query() query: FinalInvoiceReportDto) {
    return this.reportsService.getFinalInvoiceReport(query);
  }
}
