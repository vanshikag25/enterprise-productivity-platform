import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DetectActionsDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  /** Optional specific message to analyse. Defaults to the newest message. */
  @IsOptional()
  @IsString()
  messageId?: string;
}
