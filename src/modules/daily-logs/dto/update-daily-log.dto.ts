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

export class UpdateDailyLogDto {
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @IsOptional()
  @IsBoolean()
  isAdditional?: boolean;

  // When isAdditional is being set to false in this patch, termId/itemId required
  @ValidateIf((o) => o.isAdditional === false)
  @IsString()
  @IsNotEmpty()
  termId?: string;

  @ValidateIf((o) => o.isAdditional === false)
  @IsString()
  @IsNotEmpty()
  itemId?: string;

  // When isAdditional is being set to true, additionalNameAr required
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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
