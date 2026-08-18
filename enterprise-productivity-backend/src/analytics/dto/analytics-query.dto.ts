import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const ANALYTICS_RANGES = ['7', '14', '30', '90', '180'] as const;

export class AnalyticsQueryDto {
  /** Number of days to look back. Ignored when startDate/endDate are supplied. */
  @IsOptional()
  @IsIn(ANALYTICS_RANGES)
  range?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  /** Project or department id; resolves to that team's channel. */
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  channelId?: string;
}

export class AnalyticsDetailQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}