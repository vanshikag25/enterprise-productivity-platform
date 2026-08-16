import { IsOptional, IsString } from 'class-validator';

export class ReviewCreationRequestDto {
  /** Optional note recorded alongside the review decision. */
  @IsOptional()
  @IsString()
  note?: string;
}