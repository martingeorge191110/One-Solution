import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDailyLogDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsDateString()
  logDate!: string;

  @IsOptional()
  @IsBoolean()
  isAdditional?: boolean = false;

  // Required when isAdditional === false
  @ValidateIf((o) => o.isAdditional === false || o.isAdditional === undefined)
  @IsString()
  @IsNotEmpty()
  termId?: string;

  @ValidateIf((o) => o.isAdditional === false || o.isAdditional === undefined)
  @IsString()
  @IsNotEmpty()
  itemId?: string;

  // Required when isAdditional === true
  @ValidateIf((o) => o.isAdditional === true)
  @IsString()
  @IsNotEmpty()
  additionalNameAr?: string;

  @IsOptional()
  @IsString()
  additionalNameEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
