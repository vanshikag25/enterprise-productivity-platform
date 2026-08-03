import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}
