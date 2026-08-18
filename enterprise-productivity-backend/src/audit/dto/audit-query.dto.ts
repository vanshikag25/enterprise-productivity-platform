import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { auditActionTypeEnum } from '../../database/schema/audit-logs.schema';

export const AUDIT_SORTS = ['newest', 'oldest'] as const;

export class AuditListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(auditActionTypeEnum.enumValues)
  actionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  channelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsIn(AUDIT_SORTS)
  sort?: 'newest' | 'oldest';
}
