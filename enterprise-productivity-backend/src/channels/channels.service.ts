import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ChannelData } from 'stream-chat';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import type { User } from '../database/schema/users.schema';
import type {
  AuditActionType,
  AuditResourceType,
} from '../database/schema/audit-logs.schema';
import { hasMinRole, type UserRole } from '../rbac/roles';
import { CreateChannelDto, UpdateChannelDto } from './dto/create-channel.dto';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly streamService: StreamService,
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

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
      departmentId?: string;
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
        [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
        actor.username,
      targetUserId: fields.targetUserId ?? null,
      targetUserName: fields.targetUserName ?? null,
      resourceType: fields.resourceType ?? 'channel',
      resourceId: fields.resourceId ?? null,
      resourceName: fields.resourceName ?? null,
      channelId: fields.channelId ?? null,
      previousValue: fields.previousValue ?? null,
      newValue: fields.newValue ?? null,
      reason: fields.reason ?? null,
    });
  }

  private async requireRole(userId: string, minimum: UserRole) {
    const user = await this.usersService.findByUsername(userId);
    if (!user || !hasMinRole(user.role, minimum)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }

  private toSummary(channel: {
    id?: string;
    data?: unknown;
    state: { members: Record<string, unknown> };
  }) {
    const data = (channel.data ?? {}) as Record<string, unknown>;
    return {
      id: channel.id,
      name: data.name as string,
      description: (data.description as string) ?? '',
      kind: data.channel_kind as string,
      departmentId: (data.department_id as string) ?? null,
      createdBy: data.created_by_id as string,
      createdAt: data.created_at as string,
      memberCount: Object.keys(channel.state.members ?? {}).length,
      frozen: Boolean(data.frozen),
    };
  }

  async create(userId: string, dto: CreateChannelDto) {
    await this.requireRole(userId, 'manager');

    let members: string[];
    let departmentId: string | undefined;

    if (dto.kind === 'department') {
      if (!dto.departmentId)
        throw new BadRequestException('departmentId is required');
      const dept = await this.departmentsService.findOne(dto.departmentId);
      members = Array.from(new Set([userId, ...dept.memberIds]));
      departmentId = dept.id;
    } else {
      members = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
    }

    const channelId = randomUUID();
    const customData: Record<string, unknown> = {
      name: dto.name,
      description: dto.description ?? '',
      channel_kind: dto.kind,
      created_by_id: userId,
      members,
      ...(departmentId ? { department_id: departmentId } : {}),
    };

    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId, customData as unknown as ChannelData);
    await channel.create();

    if (dto.kind === 'announcement') {
      try {
        await channel.addModerators([userId]);
      } catch (err) {
        this.logger.warn(`Failed to set moderator: ${err}`);
      }
    }

    if (dto.kind === 'department' && departmentId) {
      await this.departmentsService.setChannelId(departmentId, channel.id!);
    }

    await this.audit('channel_create', await this.loadActor(userId), {
      resourceType: 'channel',
      resourceId: channel.id,
      resourceName: dto.name,
      channelId: channel.id,
      departmentId,
      newValue: {
        kind: dto.kind,
        name: dto.name,
        description: dto.description ?? '',
        memberCount: members.length,
      },
    });

    await this.notificationsService.createMany(
      members
        .filter((m) => m !== userId)
        .map((m) => ({
          userId: m,
          type:
            dto.kind === 'department'
              ? 'added_to_department'
              : 'added_to_group',
          title:
            dto.kind === 'department'
              ? 'Added to department channel'
              : 'Added to group',
          description: dto.name,
          actionUrl:
            dto.kind === 'department'
              ? '/department-channels'
              : dto.kind === 'announcement'
                ? '/announcements'
                : '/organization-channels',
        })),
    );

    return this.toSummary(channel);
  }

  async list(kind: string) {
    const response = await this.streamService
      .getClient()
      .queryChannels(
        { type: 'messaging', channel_kind: kind } as unknown as Record<
          string,
          unknown
        >,
        {},
        { limit: 100 },
      );
    return response.map((c) => this.toSummary(c));
  }

  private async getWatchedChannel(id: string) {
    const channel = this.streamService.getClient().channel('messaging', id);
    await channel.watch();
    return channel;
  }

  async findOne(id: string) {
    const channel = await this.getWatchedChannel(id);
    return this.toSummary(channel);
  }

  private async requireCreatorOrPrivileged(id: string, userId: string) {
    const channel = await this.getWatchedChannel(id);
    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (data.created_by_id === userId) return channel;
    const user = await this.usersService.findByUsername(userId);
    if (user && hasMinRole(user.role, 'manager')) return channel;
    throw new ForbiddenException(
      'Only the creator, Manager, or a higher role can perform this action',
    );
  }

  async update(id: string, userId: string, dto: UpdateChannelDto) {
    const channel = await this.requireCreatorOrPrivileged(id, userId);
    await channel.updatePartial({ set: { ...dto } as Record<string, unknown> });
    return this.toSummary(channel);
  }

  async remove(id: string, userId: string): Promise<void> {
    const channel = await this.requireCreatorOrPrivileged(id, userId);
    const data = (channel.data ?? {}) as Record<string, unknown>;
    await channel.delete();

    await this.audit('channel_delete', await this.loadActor(userId), {
      resourceType: 'channel',
      resourceId: id,
      resourceName: (data.name as string) ?? null,
      channelId: id,
    });
  }

  async join(id: string, userId: string) {
    const channel = await this.getWatchedChannel(id);
    await channel.addMembers([userId]);
    const data = (channel.data ?? {}) as Record<string, unknown>;

    await this.audit('user_join', await this.loadActor(userId), {
      targetUserId: userId,
      resourceType: 'channel',
      resourceId: id,
      resourceName: (data.name as string) ?? null,
      channelId: id,
    });

    return this.toSummary(channel);
  }

  async leave(id: string, userId: string) {
    const channel = await this.getWatchedChannel(id);
    const data = (channel.data ?? {}) as Record<string, unknown>;
    await channel.removeMembers([userId]);

    await this.audit('user_leave', await this.loadActor(userId), {
      targetUserId: userId,
      resourceType: 'channel',
      resourceId: id,
      resourceName: (data.name as string) ?? null,
      channelId: id,
    });

    return this.toSummary(channel);
  }

  async addMember(id: string, userId: string, memberId: string) {
    await this.requireCreatorOrPrivileged(id, userId);
    const channel = await this.getWatchedChannel(id);
    await channel.addMembers([memberId]);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    const kind = data.channel_kind as string;
    await this.notificationsService.create({
      userId: memberId,
      type: kind === 'department' ? 'added_to_department' : 'added_to_group',
      title:
        kind === 'department'
          ? 'Added to department channel'
          : 'Added to group',
      description: data.name as string,
      actionUrl:
        kind === 'department'
          ? '/department-channels'
          : '/organization-channels',
    });

    await this.audit('user_join', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName:
        (channel.state.members ?? {})[memberId]?.user?.name ?? null,
      resourceType: 'channel',
      resourceId: id,
      resourceName: (data.name as string) ?? null,
      channelId: id,
    });

    return this.toSummary(channel);
  }

  async removeMember(id: string, userId: string, memberId: string) {
    await this.requireCreatorOrPrivileged(id, userId);
    const channel = await this.getWatchedChannel(id);
    const data = (channel.data ?? {}) as Record<string, unknown>;
    const targetMember = (channel.state.members ?? {})[memberId];
    await channel.removeMembers([memberId]);

    await this.audit('member_remove', await this.loadActor(userId), {
      targetUserId: memberId,
      targetUserName: targetMember?.user?.name ?? null,
      resourceType: 'channel',
      resourceId: id,
      resourceName: (data.name as string) ?? null,
      channelId: id,
    });

    return this.toSummary(channel);
  }

  async listMembers(id: string) {
    const channel = await this.getWatchedChannel(id);
    return Object.values(channel.state.members ?? {}).map((m) => {
      const member = m as {
        user?: { id?: string; name?: string; image?: string };
      };
      return {
        id: member.user?.id,
        name: member.user?.name,
        imageUrl: member.user?.image,
      };
    });
  }
}
