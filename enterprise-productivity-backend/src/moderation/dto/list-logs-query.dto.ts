import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn([
    'message_delete',
    'user_mute',
    'user_unmute',
    'member_remove',
    'user_ban',
    'user_unban',
    'channel_lock',
    'channel_unlock',
    'report_review',
    'report_resolve',
    'report_dismiss',
  ])
  actionType?: string;
}
