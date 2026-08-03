import { IsIn } from 'class-validator';
import { TASK_STATUSES } from './create-task.dto';

export class UpdateTaskStatusDto {
  @IsIn(TASK_STATUSES) status: string;
}
