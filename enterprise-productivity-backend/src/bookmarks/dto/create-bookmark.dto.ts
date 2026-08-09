import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @IsString() @IsNotEmpty() sourceChannelId: string;

  @IsString() @IsNotEmpty() sourceMessageId: string;

  @IsOptional() @IsString() sourceSenderId?: string;
  @IsOptional() @IsString() sourceChannelName?: string;
  @IsOptional() @IsString() sourceMessageText?: string;
  @IsOptional() @IsString() sourceSenderName?: string;
}
