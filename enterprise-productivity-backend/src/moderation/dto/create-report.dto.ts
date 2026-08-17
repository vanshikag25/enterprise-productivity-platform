import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @IsIn(['message', 'user'])
  targetType!: 'message' | 'user';

  @IsOptional()
  @IsString()
  targetMessageId?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  channelName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
