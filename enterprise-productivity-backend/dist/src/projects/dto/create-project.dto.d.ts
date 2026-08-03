export declare const PROJECT_MEMBER_ROLES: readonly ["owner", "manager", "member", "guest"];
export declare class CreateProjectDto {
    name: string;
    description?: string;
    avatarUrl?: string;
    memberIds?: string[];
}
