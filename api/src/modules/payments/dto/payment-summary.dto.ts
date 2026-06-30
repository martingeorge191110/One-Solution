import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentSummaryDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
