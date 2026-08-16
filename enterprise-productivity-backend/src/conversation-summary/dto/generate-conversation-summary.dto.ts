import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SummaryPeriodType } from '../conversation-summary.provider';

export class GenerateConversationSummaryDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsIn(['daily', 'weekly', 'manual'])
  periodType: SummaryPeriodType;

  @IsOptional()
  @IsISO8601()
  start?: string;

  @IsOptional()
  @IsISO8601()
  end?: string;
}
