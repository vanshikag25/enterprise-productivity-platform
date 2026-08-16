import { IsOptional, IsString } from 'class-validator';

export class ResolveActionDto {
  /**
   * Type of entity created from the suggestion (task | meeting | reminder |
   * decision | follow_up). Used for RBAC checks and auditing. The DB uses the
   * same values as aiDetectedActions.intentType.
   */
  @IsOptional()
  @IsString()
  entityType?: string;

  /** Id of the created entity (task/meeting/reminder id) when applicable. */
  @IsOptional()
  @IsString()
  entityId?: string;

  /** Optional free-form note recorded for auditing. */
  @IsOptional()
  @IsString()
  note?: string;
}
