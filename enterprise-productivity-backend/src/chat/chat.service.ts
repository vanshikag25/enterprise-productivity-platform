import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Channel as StreamChannel } from 'stream-chat';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { chatChannelAvatars } from '../database/schema/chat-channels.schema';
import type { User } from '../database/schema/users.schema';
import type {
  AuditActionType,
  AuditResourceType,
} from '../database/schema/audit-logs.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import { AuditService } from '../audit/audit.service';
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
    private readonly moderationService: ModerationService,
    private readonly auditService: AuditService,
  ) {}

  private async watchChannel(channelId: string): Promise<StreamChannel> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    await channel.watch();
    return channel;
  }

  private async loadActor(userId: string): Promise<User> {
    const user = await this.usersService.findByUsername(userId);
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return user;
  }

  private async audit(
    actionType: AuditActionType,
    actor: User,
    fields: {
      targetUserId?: string | null;
      targetUserName?: string | null;
      resourceType?: AuditResourceType;
      resourceId?: string | null;
      resourceName?: string | null;
      channelId?: string | null;
      projectId?: string | null;
      previousValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
      reason?: string;
    },
  ): Promise<void> {
    await this.auditService.record({
      actionType,
      actorId: actor.username,
      actorRole: actor.role,
      actorName:
        `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() ||
        actor.username,
      targetUserId: fields.targetUserId ?? null,
      targetUserName: fields.targetUserName ?? null,
      resourceType: fields.resourceType ?? 'channel',
      resourceId: fields.resourceId ?? null,
      resourceName: fields.resourceName ?? null,
      channelId: fields.channelId ?? null,
      projectId: fields.projectId ?? null,
      previousValue: fields.previousValue ?? null,
      newValue: fields.newValue ?? null,
      reason: fields.reason ?? null,
    });
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

    const user = await this.usersService.findByUsername(userId);
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

    await this.audit('user_join', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName:
        (channel.state.members ?? {})[memberId]?.user?.name ?? null,
      resourceType: 'channel',
      resourceId: channelId,
      resourceName: (data.name as string) ?? null,
      channelId,
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

    await this.audit('member_remove', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName: targetMember.user?.name ?? null,
      resourceType: 'channel',
      resourceId: channelId,
      resourceName: (data.name as string) ?? null,
      channelId,
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

    await this.audit('user_leave', await this.loadActor(userId), {
      targetUserId: userId,
      resourceType: 'channel',
      resourceId: channelId,
      resourceName: (data.name as string) ?? null,
      channelId,
    });
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

    const data = (channel.data ?? {}) as Record<string, unknown>;
    await this.audit('moderator_action', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName:
        (channel.state.members ?? {})[memberId]?.user?.name ?? null,
      resourceType: 'channel',
      resourceId: channelId,
      resourceName: (data.name as string) ?? null,
      channelId,
      newValue: { memberRole: 'moderator', action: 'assign' },
    });

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

    await this.audit('moderator_action', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName:
        (channel.state.members ?? {})[memberId]?.user?.name ?? null,
      resourceType: 'channel',
      resourceId: channelId,
      resourceName: (data.name as string) ?? null,
      channelId,
      newValue: { memberRole: 'member', action: 'demote' },
    });

    return this.getGroupInfo(channelId, userId);
  }

  private channelIdOf(cid?: string): string | undefined {
    if (!cid) return undefined;
    return cid.includes(':') ? cid.split(':')[1] : cid;
  }

  private messageOwnerId(message: {
    user?: { id?: string; username?: string };
    user_id?: string;
    userId?: string;
  }): string | null {
    return (
      message.user?.id ??
      message.user_id ??
      message.user?.username ??
      message.userId ??
      null
    );
  }

  /**
   * Edits a message through the backend so the change is captured in the audit
   * trail. Only the message author may edit their own message.
   */
  async editMessage(
    userId: string,
    messageId: string,
    text: string,
  ): Promise<{ id: string; updated: boolean }> {
    const client = this.streamService.getClient();
    const result = await client.getMessage(messageId);
    const message = result.message as {
      id: string;
      text?: string;
      user?: { id?: string; username?: string };
      user_id?: string;
      userId?: string;
      channel?: { cid?: string };
    };
    const ownerId = this.messageOwnerId(message);

    if (!ownerId || ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    await client.updateMessage({ id: messageId, text, user_id: userId });

    await this.audit('message_edit', await this.loadActor(userId), {
      resourceType: 'message',
      resourceId: messageId,
      channelId: this.channelIdOf(message.channel?.cid),
      previousValue: { text: message.text ?? '' },
      newValue: { text },
    });

    return { id: messageId, updated: true };
  }

  /**
   * Deletes a message. The author may delete their own message; other users
   * must have moderation permission, which ModerationService enforces (and
   * audits) itself, so the audit record is never duplicated.
   */
  async deleteMessage(
    userId: string,
    messageId: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const client = this.streamService.getClient();
    const result = await client.getMessage(messageId);
    const message = result.message as {
      id: string;
      deleted_at?: string | null;
      user?: { id?: string; username?: string };
      user_id?: string;
      userId?: string;
      channel?: { cid?: string };
    };
    const channelId = this.channelIdOf(message.channel?.cid);
    const actor = await this.loadActor(userId);
    const ownerId = this.messageOwnerId(message);
    const isOwner = !!ownerId && ownerId === userId;

    // Clients soft-delete through Stream first and call this endpoint
    // afterwards for the audit trail, so the message may already be deleted;
    // Stream rejects a repeated delete with code 16.
    const alreadyDeleted = !!message.deleted_at;

    if (isOwner) {
      if (!alreadyDeleted) {
        await client.deleteMessage(messageId, { hardDelete: false });
      }
      await this.audit('message_delete', actor, {
        resourceType: 'message',
        resourceId: messageId,
        channelId,
        newValue: { deleted: true },
      });
      return { id: messageId, deleted: true };
    }

    if (!alreadyDeleted) {
      await this.moderationService.deleteMessage(
        actor,
        messageId,
        'Deleted by request.',
      );
    } else {
      await this.audit('message_delete', actor, {
        resourceType: 'message',
        resourceId: messageId,
        channelId,
        newValue: { deleted: true },
      });
    }
    return { id: messageId, deleted: true };
  }
}
