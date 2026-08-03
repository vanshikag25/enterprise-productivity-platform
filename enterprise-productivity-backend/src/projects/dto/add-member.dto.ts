import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { PROJECT_MEMBER_ROLES } from './create-project.dto';

export class AddMemberDto {
  @IsString() @IsNotEmpty() memberId: string;
  @IsOptional() @IsIn(PROJECT_MEMBER_ROLES) role?: string;
}

export class UpdateMemberRoleDto {
  @IsIn(PROJECT_MEMBER_ROLES) role: string;
}
