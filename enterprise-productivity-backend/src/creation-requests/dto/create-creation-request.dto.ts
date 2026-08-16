import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

/** Any authenticated member can propose a task/meeting creation. */
export class CreateCreationRequestDto {
  @IsIn(['task', 'meeting'])
  entityType: 'task' | 'meeting';

  /** Entity fields: CreateTaskDto or CreateMeetingDto (source refs optional). */
  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  sourceChannelId?: string;

  @IsOptional()
  @IsString()
  sourceMessageId?: string;

  @IsOptional()
  @IsString()
  sourceSenderId?: string;

  @IsOptional()
  @IsString()
  sourceChannelName?: string;

  @IsOptional()
  @IsString()
  sourceMessageText?: string;
}