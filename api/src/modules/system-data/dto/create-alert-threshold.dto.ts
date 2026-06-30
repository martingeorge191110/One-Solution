import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertMode, AlertType } from '@prisma/client';

export class CreateAlertThresholdDto {
  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @IsEnum(AlertMode)
  @IsNotEmpty()
  mode!: AlertMode;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  value!: number;

  @IsOptional()
  @IsString()
  basis?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  projectId?: string;
}
