export declare const UserRole: {
    readonly SUPER_ADMIN: "super_admin";
    readonly ORGANIZATION_OWNER: "organization_owner";
    readonly ADMIN: "admin";
    readonly MANAGER: "manager";
    readonly TEAM_LEAD: "team_lead";
    readonly EMPLOYEE: "employee";
    readonly GUEST: "guest";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const USER_ROLE_VALUES: UserRole[];
export declare const ROLE_RANK: Record<UserRole, number>;
export declare function isUserRole(value: string): value is UserRole;
export declare function hasMinRole(role: string, minimum: UserRole): boolean;
