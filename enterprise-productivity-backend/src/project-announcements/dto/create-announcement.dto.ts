import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsBoolean() isPinned?: boolean;
}
