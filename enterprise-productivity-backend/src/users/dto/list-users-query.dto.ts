import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type UserSortField = 'firstName' | 'lastName' | 'email' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(['firstName', 'lastName', 'email', 'createdAt'])
  sortBy: UserSortField = 'firstName';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'asc';
}
