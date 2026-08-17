import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class BanUserDto {
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  timeoutMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
