import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsBoolean() isPinned?: boolean;
}
