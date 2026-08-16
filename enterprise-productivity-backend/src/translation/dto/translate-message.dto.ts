import { IsNotEmpty, IsString } from 'class-validator';

export class TranslateMessageDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  targetLanguage: string;
}