import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsUUID,
} from 'class-validator';

export const CHANNEL_KINDS = [
  'organization',
  'announcement',
  'department',
] as const;

export class CreateChannelDto {
  @IsIn(CHANNEL_KINDS) kind: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
  @IsOptional() @IsUUID() departmentId?: string;
}
export class UpdateChannelDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}
