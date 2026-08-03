import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export const MILESTONE_STATUSES = [
  'planned',
  'in_progress',
  'completed',
  'delayed',
] as const;

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsIn(MILESTONE_STATUSES) status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}
