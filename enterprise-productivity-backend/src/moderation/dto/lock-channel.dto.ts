import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LockChannelDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsBoolean()
  locked!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
