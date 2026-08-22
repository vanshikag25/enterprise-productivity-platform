import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
}
export class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
}
