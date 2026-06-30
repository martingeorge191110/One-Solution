import { IsNotEmpty, IsString } from 'class-validator';

export class FinalInvoiceReportDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
