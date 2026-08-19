import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_CONDITION_FIELDS,
  WORKFLOW_CONDITION_OPERATORS,
  workflowTriggerTypeEnum,
} from '../../database/schema/workflows.schema';

export class WorkflowConditionDto {
  @IsIn(WORKFLOW_CONDITION_FIELDS)
  field: string;

  @IsIn(WORKFLOW_CONDITION_OPERATORS)
  operator: string;

  @IsOptional()
  value?: string | number | string[];
}

export class WorkflowActionDto {
  @IsIn(WORKFLOW_ACTION_TYPES)
  type: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(workflowTriggerTypeEnum.enumValues)
  triggerType: string;

  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions?: WorkflowActionDto[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
