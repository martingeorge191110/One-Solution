import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuotationLineDto } from './create-quotation-line.dto';

export class CreateQuotationDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  supervisionPercent?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one line is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationLineDto)
  lines!: CreateQuotationLineDto[];

  // Opaque string ids (see CreateQuotationLineDto.termId note).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionIds?: string[];
}
