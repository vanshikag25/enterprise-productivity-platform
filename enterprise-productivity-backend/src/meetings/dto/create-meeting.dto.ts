import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsArray,
  ArrayNotEmpty,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsIn,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return !isNaN(Date.parse(value));
  }
  defaultMessage() {
    return 'scheduledDate must be a valid date';
  }
}

export class CreateMeetingDto {
  @IsString() @IsNotEmpty() title: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() agenda?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];
  @IsOptional() @IsString() recordingLink?: string;
  @IsOptional() @IsString() meetingUrl?: string;
  @IsOptional() @IsIn(['Scheduled', 'Ongoing', 'Completed', 'Cancelled'])
  meetingStatus?: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';

  @IsISO8601() @Validate(IsFutureDateConstraint) scheduledDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be HH:mm',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:mm' })
  endTime: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  participants: string[];

  @IsOptional() @IsString() sourceChannelId?: string;
  @IsOptional() @IsString() sourceMessageId?: string;
  @IsOptional() @IsString() sourceSenderId?: string;
  @IsOptional() @IsString() sourceChannelName?: string;
}
