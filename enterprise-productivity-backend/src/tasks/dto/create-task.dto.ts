import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsISO8601,
} from 'class-validator';

export const TASK_STATUSES = [
  'Todo',
  'In Progress',
  'In Review',
  'Completed',
  'Closed',
] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export class CreateTaskDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUSES) status?: string;
  @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() assignee?: string;
  @IsOptional() @IsString() sourceChannelId?: string;
  @IsOptional() @IsString() sourceMessageId?: string;
  @IsOptional() @IsString() sourceSenderId?: string;
  @IsOptional() @IsString() sourceChannelName?: string;
  @IsOptional() @IsString() sourceMessageUrl?: string;
}
