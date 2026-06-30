import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getGlobalSummary() {
    return this.dashboardService.getGlobalSummary();
  }

  @Get('project/:projectId')
  getProjectFinancials(@Param('projectId') projectId: string) {
    return this.dashboardService.getProjectFinancials(projectId);
  }
}
