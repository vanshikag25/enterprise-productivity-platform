import type { AuthObject } from '../auth/auth-object';
import { StreamService } from '../stream/stream.service';
import { ChatService, GroupInfo } from './chat.service';
interface CreateDirectChannelBody {
    targetUserId: string;
}
interface CreateGroupChannelBody {
    groupName: string;
    description?: string;
    memberIds: string[];
}
interface UpdateGroupBody {
    name?: string;
    description?: string;
}
interface UpdateGroupAvatarBody {
    avatarUrl: string;
}
export declare class ChatController {
    private readonly streamService;
    private readonly chatService;
    constructor(streamService: StreamService, chatService: ChatService);
    private uid;
    getToken(auth: AuthObject): {
        streamToken: string;
        apiKey: string;
    };
    createDirectChannel(auth: AuthObject, body: CreateDirectChannelBody): Promise<{
        channelId: string;
    }>;
    createGroupChannel(auth: AuthObject, body: CreateGroupChannelBody): Promise<{
        channelId: string;
        name: string | undefined;
        description: string | undefined;
        memberIds: string[];
    }>;
    getGroupInfo(auth: AuthObject, channelId: string): Promise<GroupInfo>;
    updateGroup(auth: AuthObject, channelId: string, body: UpdateGroupBody): Promise<GroupInfo>;
    updateGroupAvatar(auth: AuthObject, channelId: string, body: UpdateGroupAvatarBody): Promise<GroupInfo>;
    removeGroupAvatar(auth: AuthObject, channelId: string): Promise<GroupInfo>;
    addMember(auth: AuthObject, channelId: string, memberId: string): Promise<GroupInfo>;
    removeMember(auth: AuthObject, channelId: string, memberId: string): Promise<GroupInfo>;
    leaveGroup(auth: AuthObject, channelId: string): Promise<void>;
    assignModerator(auth: AuthObject, channelId: string, memberId: string): Promise<GroupInfo>;
    demoteModerator(auth: AuthObject, channelId: string, memberId: string): Promise<GroupInfo>;
}
export {};
