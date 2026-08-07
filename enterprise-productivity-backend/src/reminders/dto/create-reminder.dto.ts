import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsIn,
} from 'class-validator';

export const REMINDER_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export class CreateReminderDto {
  @IsString() @IsNotEmpty() title: string;

  @IsISO8601() scheduledFor: string;

  @IsOptional() @IsIn(REMINDER_PRIORITIES) priority?: string;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsString() sourceChannelId?: string;
  @IsOptional() @IsString() sourceMessageId?: string;
  @IsOptional() @IsString() sourceSenderId?: string;
  @IsOptional() @IsString() sourceChannelName?: string;
}
