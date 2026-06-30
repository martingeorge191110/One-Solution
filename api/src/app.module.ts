import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { TokenModule } from './common/token/token.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { Public } from './common/decorators/public.decorator';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SystemDataModule } from './modules/system-data/system-data.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DailyLogsModule } from './modules/daily-logs/daily-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TokenModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    SystemDataModule,
    QuotationsModule,
    PaymentsModule,
    DailyLogsModule,
    ReportsModule,
    AuditModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Binds the acting user into AsyncLocalStorage for the Prisma audit hook.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
