import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Channel as StreamChannel } from 'stream-chat';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { chatChannelAvatars } from '../database/schema/chat-channels.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { hasMinRole } from '../rbac/roles';

export type GroupRole = 'owner' | 'moderator' | 'member' | 'admin';
export type MemberRole = Exclude<GroupRole, 'admin'>;

export interface GroupMemberInfo {
  id: string;
  name: string | null;
  imageUrl: string | null;
  role: MemberRole;
}

export interface GroupInfo {
  channelId: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  createdById: string;
  currentUserRole: GroupRole;
  canManage: boolean;
  canManageModerators: boolean;
  members: GroupMemberInfo[];
}

interface UpdateGroupInput {
  name?: string;
  description?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async watchChannel(channelId: string): Promise<StreamChannel> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    await channel.watch();
    return channel;
  }

  private memberRole(
    member: {
      user?: { id?: string };
      is_moderator?: boolean;
      channel_role?: string;
    },
    createdById?: string,
  ): MemberRole {
    if (member.user?.id && member.user.id === createdById) return 'owner';
    if (
      member.is_moderator ||
      member.channel_role === 'channel_moderator' ||
      member.channel_role === 'moderator'
    ) {
      return 'moderator';
    }
    return 'member';
  }

  private async resolveRole(
    channel: StreamChannel,
    userId: string,
  ): Promise<GroupRole> {
    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (userId === data.created_by_id) return 'owner';

    const member = (channel.state.members ?? {})[userId];
    if (member) {
      const role = this.memberRole(member, data.created_by_id as string);
      if (role === 'moderator') return 'moderator';
    }

    const user = await this.usersService.findByClerkId(userId);
    if (user && hasMinRole(user.role, 'manager')) return 'admin';

    return 'member';
  }

  private assertCanManage(role: GroupRole): void {
    if (role !== 'owner' && role !== 'admin' && role !== 'moderator') {
      throw new ForbiddenException(
        'Only the group creator, a moderator, or an admin can manage this group.',
      );
    }
  }

  private assertCanManageModerators(role: GroupRole): void {
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenException(
        'Only the group creator or an admin can assign moderators.',
      );
    }
  }

  private async toGroupInfo(
    channel: StreamChannel,
    channelId: string,
    role: GroupRole,
  ): Promise<GroupInfo> {
    const data = (channel.data ?? {}) as Record<string, unknown>;
    const createdById = (data.created_by_id as string) ?? '';

    const members: GroupMemberInfo[] = Object.values(
      channel.state.members ?? {},
    ).map((m) => {
      const member = m as {
        user?: { id?: string; name?: string; image?: string };
        is_moderator?: boolean;
        channel_role?: string;
      };
      return {
        id: member.user?.id ?? '',
        name: member.user?.name ?? null,
        imageUrl: member.user?.image ?? null,
        role: this.memberRole(member, createdById),
      };
    });

    const avatarRow = await this.db
      .select()
      .from(chatChannelAvatars)
      .where(eq(chatChannelAvatars.channelId, channelId))
      .limit(1);

    return {
      channelId: channel.id ?? channelId,
      name: (data.name as string) ?? null,
      description: (data.description as string) ?? null,
      avatarUrl: avatarRow[0]?.avatarUrl ?? null,
      memberCount: members.length,
      createdById,
      currentUserRole: role,
      canManage: role === 'owner' || role === 'admin' || role === 'moderator',
      canManageModerators: role === 'owner' || role === 'admin',
      members,
    };
  }

  async getGroupInfo(channelId: string, userId: string): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    return this.toGroupInfo(channel, channelId, role);
  }

  async updateGroup(
    channelId: string,
    userId: string,
    changes: UpdateGroupInput,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManage(role);

    const set: Record<string, unknown> = {};
    if (changes.name !== undefined) set.name = changes.name;
    if (changes.description !== undefined)
      set.description = changes.description;

    if (Object.keys(set).length === 0) {
      throw new BadRequestException('Nothing to update.');
    }

    await channel.updatePartial({ set });
    return this.getGroupInfo(channelId, userId);
  }

  async updateGroupAvatar(
    channelId: string,
    userId: string,
    avatarUrl: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManage(role);

    await this.db
      .insert(chatChannelAvatars)
      .values({ channelId, avatarUrl, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: chatChannelAvatars.channelId,
        set: { avatarUrl, updatedAt: new Date() },
      });

    await channel.updatePartial({
      set: { image: avatarUrl } as unknown as Parameters<
        typeof channel.updatePartial
      >[0]['set'],
    });

    this.logger.log(`Group avatar updated: ${channelId}`);
    return this.getGroupInfo(channelId, userId);
  }

  async removeGroupAvatar(
    channelId: string,
    userId: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManage(role);

    await this.db
      .delete(chatChannelAvatars)
      .where(eq(chatChannelAvatars.channelId, channelId));

    await channel.updatePartial({
      set: { image: '' } as unknown as Parameters<
        typeof channel.updatePartial
      >[0]['set'],
    });

    this.logger.log(`Group avatar removed: ${channelId}`);
    return this.getGroupInfo(channelId, userId);
  }

  async addMember(
    channelId: string,
    userId: string,
    memberId: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManage(role);

    if ((channel.state.members ?? {})[memberId]) {
      throw new BadRequestException('User is already a member of this group.');
    }

    await channel.addMembers([memberId]);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    await this.notificationsService.create({
      userId: memberId,
      type: 'added_to_group',
      title: 'Added to group',
      description: (data.name as string) ?? 'a group',
      actionUrl: `/dashboard?channel=${channelId}`,
    });

    return this.getGroupInfo(channelId, userId);
  }

  async removeMember(
    channelId: string,
    userId: string,
    memberId: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManage(role);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (data.created_by_id === memberId) {
      throw new BadRequestException('The group creator cannot be removed.');
    }
    if (userId === memberId) {
      throw new BadRequestException(
        'You cannot remove yourself from the group.',
      );
    }
    const targetMember = (channel.state.members ?? {})[memberId];
    if (!targetMember) {
      throw new BadRequestException('User is not a member of this group.');
    }
    if (
      this.memberRole(targetMember, data.created_by_id as string) ===
        'moderator' &&
      role !== 'owner' &&
      role !== 'admin'
    ) {
      throw new ForbiddenException(
        'Only the group creator or an admin can remove a moderator.',
      );
    }

    await channel.removeMembers([memberId]);

    await this.notificationsService.create({
      userId: memberId,
      type: 'removed_from_group',
      title: 'Removed from group',
      description: (data.name as string) ?? 'a group',
    });

    return this.getGroupInfo(channelId, userId);
  }

  async leaveGroup(channelId: string, userId: string): Promise<void> {
    const channel = await this.watchChannel(channelId);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (data.created_by_id === userId) {
      throw new BadRequestException(
        'The group creator cannot leave the group. Delete it or transfer ownership instead.',
      );
    }

    await channel.removeMembers([userId]);
    this.logger.log(`User ${userId} left group ${channelId}`);
  }

  async assignModerator(
    channelId: string,
    userId: string,
    memberId: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManageModerators(role);

    if (!(channel.state.members ?? {})[memberId]) {
      throw new BadRequestException('User is not a member of this group.');
    }

    await channel.addModerators([memberId]);
    this.logger.log(`Moderator assigned: ${memberId} in ${channelId}`);

    return this.getGroupInfo(channelId, userId);
  }

  async demoteModerator(
    channelId: string,
    userId: string,
    memberId: string,
  ): Promise<GroupInfo> {
    const channel = await this.watchChannel(channelId);
    const role = await this.resolveRole(channel, userId);
    this.assertCanManageModerators(role);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (data.created_by_id === memberId) {
      throw new BadRequestException('The group creator cannot be demoted.');
    }
    if (userId === memberId) {
      throw new BadRequestException(
        'You cannot change your own moderator role.',
      );
    }
    if (!(channel.state.members ?? {})[memberId]) {
      throw new BadRequestException('User is not a member of this group.');
    }

    await channel.demoteModerators([memberId]);
    this.logger.log(`Moderator demoted: ${memberId} in ${channelId}`);

    return this.getGroupInfo(channelId, userId);
  }
}
