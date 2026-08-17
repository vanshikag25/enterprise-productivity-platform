import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class VideoTokenDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsIn(['dm', 'group'])
  kind: 'dm' | 'group';
}
