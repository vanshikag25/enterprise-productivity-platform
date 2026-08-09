import { IsString, Matches } from 'class-validator';

export class ChangeUsernameDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{3,50}$/, {
    message:
      'Username may only contain letters, numbers, dots, dashes and underscores (3–50 chars)',
  })
  username!: string;
}