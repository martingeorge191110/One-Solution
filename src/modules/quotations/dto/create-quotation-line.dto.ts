import {
  IsEnum,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingMode } from '@prisma/client';

export class CreateQuotationLineDto {
  // Entity ids are opaque strings (seed data uses readable ids, user-created
  // rows get uuids) — validate as a non-empty string, not strictly a UUID.
  @IsString()
  @IsNotEmpty()
  termId!: string;

  @IsEnum(PricingMode)
  pricingMode!: PricingMode;

  @IsOptional()
  @IsString()
  unit?: string;

  /** Required when pricingMode = UNIT; must be > 0 */
  @ValidateIf((o) => o.pricingMode === PricingMode.UNIT)
  @IsNumber()
  @Min(0.000001, { message: 'quantity must be greater than 0 for UNIT pricing' })
  @Type(() => Number)
  quantity?: number;

  /** Required when pricingMode = UNIT; must be >= 0 */
  @ValidateIf((o) => o.pricingMode === PricingMode.UNIT)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  /** Required when pricingMode = LUMP_SUM; must be >= 0 */
  @ValidateIf((o) => o.pricingMode === PricingMode.LUMP_SUM)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lineTotal?: number;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}
