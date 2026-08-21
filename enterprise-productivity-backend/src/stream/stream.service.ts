import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  StreamChat,
  Channel as StreamChannelType,
  ChannelData,
  type UserResponse,
} from 'stream-chat';
import { User } from '../database/schema/users.schema';

type StreamUserWithStatus = UserResponse & { status?: string | null };

interface GroupChannelData {
  name: string;
  description?: string;
  members: string[];
  created_by_id: string;
}

export interface UserPresence {
  online: boolean;
  lastActive: string | null;
  status: string | null;
}

@Injectable()
export class StreamService implements OnModuleInit {
  private readonly logger = new Logger(StreamService.name);
  private client!: StreamChat;
  private apiKey!: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('stream.apiKey');
    const apiSecret = this.configService.get<string>('stream.secret');

    if (!apiKey || !apiSecret) {
      throw new Error(
        'STREAM_API_KEY or STREAM_SECRET is missing. Check your .env file.',
      );
    }

    this.apiKey = apiKey;
    this.client = StreamChat.getInstance(apiKey, apiSecret);

    this.logger.log('Stream Chat server client initialized.');

    await this.ensureAdminCanUseFrozenChannels();
    await this.ensureEveryoneMentionEnabled();
    await this.ensurePollsEnabled();
  }

  private async ensurePollsEnabled() {
    try {
      const channelType = await this.client.getChannelType('messaging');
      if (!channelType.polls) {
        await this.client.updateChannelType('messaging', { polls: true });
        this.logger.log('Enabled polls for messaging channels.');
      }
    } catch (err) {
      this.logger.warn(`Failed to enable polls for messaging channels: ${err}`);
    }
  }

  private async ensureEveryoneMentionEnabled() {
    try {
      const { grants } = await this.client.getChannelType('messaging');
      const updatedGrants: Record<string, string[]> = {};

      for (const [role, capabilities] of Object.entries(grants ?? {})) {
        if (!capabilities.includes('send-message')) continue;
        const needsChannel = !capabilities.includes('notify-channel');
        const needsHere = !capabilities.includes('notify-here');
        const needsUpload = !capabilities.includes('upload-file');
        if (needsChannel || needsHere || needsUpload) {
          updatedGrants[role] = [
            ...capabilities,
            ...(needsChannel ? ['notify-channel'] : []),
            ...(needsHere ? ['notify-here'] : []),
            ...(needsUpload ? ['upload-file'] : []),
          ];
        }
      }

      if (Object.keys(updatedGrants).length > 0) {
        await this.client.updateChannelType('messaging', {
          grants: { ...grants, ...updatedGrants },
        });
        this.logger.log(
          'Enabled @channel / @here mentions and file uploads for messaging channels.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to enable chat capabilities for messaging channels: ${err}`,
      );
    }
  }

  private async ensureAdminCanUseFrozenChannels() {
    try {
      const { grants } = await this.client.getChannelType('messaging');
      const adminGrants = grants?.admin ?? [];

      if (!adminGrants.includes('use-frozen-channel')) {
        await this.client.updateChannelType('messaging', {
          grants: { ...grants, admin: [...adminGrants, 'use-frozen-channel'] },
        });
        this.logger.log('Granted admin role use-frozen-channel permission.');
      }
    } catch (err) {
      this.logger.warn(`Failed to configure frozen-channel permission: ${err}`);
    }
  }

  getClient(): StreamChat {
    return this.client;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  async syncUser(user: User): Promise<void> {
    const name = [user.firstName, user.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ');

    const streamUser: StreamUserWithStatus = {
      id: user.username,
      name: name || undefined,
      image: user.imageUrl ?? undefined,
      role: user.role === 'admin' ? 'admin' : 'user',
      status: user.status ?? undefined,
    };

    await this.client.upsertUser(streamUser);

    this.logger.log(`Stream user synced: ${user.username}`);
  }

  async setUserStatus(username: string, status: string | null): Promise<void> {
    const setFields = status
      ? ({ status } as unknown as Partial<UserResponse>)
      : {};
    const unsetFields = (status ? [] : ['status']) as unknown as Array<
      keyof UserResponse
    >;

    await this.client.partialUpdateUser({
      id: username,
      set: setFields,
      unset: unsetFields,
    });

    this.logger.log(
      `Stream user status updated: ${username} -> ${status ?? 'auto'}`,
    );
  }

  createUserToken(username: string): string {
    return this.client.createToken(username);
  }

  async getOrCreateDirectChannel(
    userId: string,
    targetUserId: string,
  ): Promise<string> {
    const channel = this.client.channel('messaging', {
      members: [userId, targetUserId],
      created_by_id: userId,
    });

    await channel.create();

    if (!channel.id) {
      throw new Error(
        'Stream did not return a channel id after channel.create().',
      );
    }

    this.logger.log(
      `Direct channel ready: ${channel.id} (${userId} <-> ${targetUserId})`,
    );

    return channel.id;
  }

  async createGroupChannel(
    userId: string,
    groupName: string,
    description: string | undefined,
    memberIds: string[],
  ): Promise<StreamChannelType> {
    const uniqueMembers = Array.from(new Set([userId, ...memberIds]));
    const channelId = randomUUID();

    const groupData: GroupChannelData = {
      name: groupName,
      ...(description !== undefined ? { description } : {}),
      members: uniqueMembers,
      created_by_id: userId,
    };

    const channel = this.client.channel(
      'messaging',
      channelId,
      groupData as unknown as ChannelData,
    );

    await channel.create();

    if (!channel.id) {
      throw new Error(
        'Stream did not return a channel id after group channel.create().',
      );
    }

    this.logger.log(
      `Group channel created: ${channel.id} ("${groupName}", ${uniqueMembers.length} members)`,
    );

    return channel;
  }

  async getUsersPresence(
    usernames: string[],
  ): Promise<Map<string, UserPresence>> {
    const presenceMap = new Map<string, UserPresence>();

    if (usernames.length === 0) {
      return presenceMap;
    }

    const response = await this.client.queryUsers({ id: { $in: usernames } });

    for (const streamUser of response.users) {
      const statusField = (streamUser as StreamUserWithStatus).status;
      presenceMap.set(streamUser.id, {
        online: Boolean(streamUser.online),
        lastActive: streamUser.last_active ?? null,
        status: typeof statusField === 'string' ? statusField : null,
      });
    }

    return presenceMap;
  }
}
