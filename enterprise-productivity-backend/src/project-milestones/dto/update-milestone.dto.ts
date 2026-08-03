import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsIn,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { MILESTONE_STATUSES } from './create-milestone.dto';

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsIn(MILESTONE_STATUSES) status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}

export class UpdateMilestoneStatusDto {
  @IsIn(MILESTONE_STATUSES) status: string;
}

export class UpdateMilestoneProgressDto {
  @IsInt() @Min(0) @Max(100) progress: number;
}
