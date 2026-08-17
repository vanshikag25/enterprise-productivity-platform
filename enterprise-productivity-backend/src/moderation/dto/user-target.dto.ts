import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UserTargetDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
