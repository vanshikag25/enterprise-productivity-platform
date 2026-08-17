import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReportDto {
  @IsIn(['review', 'resolve', 'dismiss'])
  action!: 'review' | 'resolve' | 'dismiss';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
