import { IsIn } from 'class-validator';

export const MEETING_STATUSES = [
  'Scheduled',
  'Ongoing',
  'Completed',
  'Cancelled',
] as const;

export class UpdateMeetingStatusDto {
  @IsIn(MEETING_STATUSES)
  status: string;
}
