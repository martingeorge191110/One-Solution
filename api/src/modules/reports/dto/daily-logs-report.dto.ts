import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DailyLogsReportDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
