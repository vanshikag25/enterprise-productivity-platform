import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateNoteDto {
  @IsString() @IsNotEmpty() title: string;

  @IsString() @IsNotEmpty() content: string;

  @IsOptional() @IsString() sourceChannelId?: string;
  @IsOptional() @IsString() sourceMessageId?: string;
  @IsOptional() @IsString() sourceSenderId?: string;
  @IsOptional() @IsString() sourceChannelName?: string;
  @IsOptional() @IsString() sourceMessageText?: string;
}
