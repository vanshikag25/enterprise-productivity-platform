export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_OWNER: 'organization_owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_VALUES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ORGANIZATION_OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.TEAM_LEAD,
  UserRole.EMPLOYEE,
  UserRole.GUEST,
];

export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ORGANIZATION_OWNER]: 90,
  [UserRole.ADMIN]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.TEAM_LEAD]: 50,
  [UserRole.EMPLOYEE]: 30,
  [UserRole.GUEST]: 10,
};

export function isUserRole(value: string): value is UserRole {
  return value in ROLE_RANK;
}

export function hasMinRole(role: string, minimum: UserRole): boolean {
  if (!isUserRole(role)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
