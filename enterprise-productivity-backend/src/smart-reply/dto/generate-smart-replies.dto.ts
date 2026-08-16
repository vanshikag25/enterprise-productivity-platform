import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateSmartRepliesDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;
}
