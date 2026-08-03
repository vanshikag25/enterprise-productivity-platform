import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export const PROJECT_MEMBER_ROLES = [
  'owner',
  'manager',
  'member',
  'guest',
] as const;

export class CreateProjectDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
}
