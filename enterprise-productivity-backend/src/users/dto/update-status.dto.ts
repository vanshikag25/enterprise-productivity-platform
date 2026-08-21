import { IsIn, ValidateIf } from 'class-validator';

export const MANUAL_USER_STATUSES = [
  'away',
  'busy',
  'in_meeting',
  'dnd',
] as const;

export type ManualUserStatus = (typeof MANUAL_USER_STATUSES)[number];

export class UpdateStatusDto {
  @ValidateIf((value: UpdateStatusDto) => value.status !== null)
  @IsIn([...MANUAL_USER_STATUSES])
  status: ManualUserStatus | null;
}
