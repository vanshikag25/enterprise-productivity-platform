import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class AddReactionDto {
  @IsString() @IsNotEmpty() emoji: string;
}

export class SetPinnedDto {
  @IsBoolean() isPinned: boolean;
}
