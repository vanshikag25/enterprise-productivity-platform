export type UserSortField = 'firstName' | 'lastName' | 'email' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export declare class ListUsersQueryDto {
    search?: string;
    page: number;
    limit: number;
    sortBy: UserSortField;
    sortOrder: SortOrder;
}
