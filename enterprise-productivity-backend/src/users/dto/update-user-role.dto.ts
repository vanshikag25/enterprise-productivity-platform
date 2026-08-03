import { IsIn } from 'class-validator';
import { USER_ROLE_VALUES, type UserRole } from '../../rbac/roles';

export class UpdateUserRoleDto {
  @IsIn(USER_ROLE_VALUES)
  role!: UserRole;
}
