export declare const CHANNEL_KINDS: readonly ["organization", "announcement", "department"];
export declare class CreateChannelDto {
    kind: string;
    name: string;
    description?: string;
    memberIds?: string[];
    departmentId?: string;
}
export declare class UpdateChannelDto {
    name?: string;
    description?: string;
}
