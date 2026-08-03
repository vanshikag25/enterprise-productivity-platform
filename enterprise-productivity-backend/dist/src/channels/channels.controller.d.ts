import type { AuthObject } from '@clerk/backend';
import { ChannelsService } from './channels.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/create-channel.dto';
export declare class ChannelsController {
    private readonly channelsService;
    constructor(channelsService: ChannelsService);
    create(auth: AuthObject, dto: CreateChannelDto): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    list(kind: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }[]>;
    findOne(id: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    update(auth: AuthObject, id: string, dto: UpdateChannelDto): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    remove(auth: AuthObject, id: string): Promise<void>;
    join(auth: AuthObject, id: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    leave(auth: AuthObject, id: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    listMembers(id: string): Promise<{
        id: string | undefined;
        name: string | undefined;
        imageUrl: string | undefined;
    }[]>;
    addMember(auth: AuthObject, id: string, memberId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
    removeMember(auth: AuthObject, id: string, memberId: string): Promise<{
        id: string | undefined;
        name: string;
        description: string;
        kind: string;
        departmentId: string;
        createdBy: string;
        createdAt: string;
        memberCount: number;
        frozen: boolean;
    }>;
}
