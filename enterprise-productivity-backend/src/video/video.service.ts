import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtModuleOptions } from '@nestjs/jwt';
import { StreamService } from '../stream/stream.service';
import { hasMinRole, UserRole } from '../rbac/roles';
import type { VideoTokenDto } from './dto/video-token.dto';

export interface VideoTokenResponse {
  apiKey: string;
  userId: string;
  token: string;
  /** Stream ids of the chat channel members (used to ring the call). */
  memberIds: string[];
}

export interface VideoConnectResponse {
  apiKey: string;
  userId: string;
  token: string;
}

interface VideoCredentials {
  apiKey: string;
  secret: string;
}

@Injectable()
export class VideoService implements OnModuleInit {
  private readonly logger = new Logger(VideoService.name);
  private cachedCredentials: VideoCredentials | null = null;
  private cachedJwt: JwtService | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCallMembersCanJoinBackstage();
  }

  /**
   * Group meetings use backstage mode (participants join a "waiting room"
   * until the host starts the meeting). Stream only lets users with the
   * `join-backstage` capability enter a backstage call, and the project's
   * `default` call type grants that capability to no call-level role.
   * Idempotently add it to the `call_member` role so everyone invited to a
   * meeting can wait in the backstage. Fails silently — this is best-effort
   * and the errors surface only if the capability is still missing.
   */
  private async ensureCallMembersCanJoinBackstage(): Promise<void> {
    try {
      const credentials = this.getCredentials();
      const token = this.getJwt(credentials.secret).sign({ server: true });
      const base = `https://video.stream-io-api.com/api/v2/video/calltypes/default?api_key=${credentials.apiKey}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'stream-auth-type': 'jwt',
        'Content-Type': 'application/json',
      };

      const response = await fetch(base, { headers });
      if (!response.ok) {
        this.logger.warn(
          `Could not read the "default" call type (${response.status}), check Stream Video credentials`,
        );
        return;
      }

      const body = (await response.json()) as {
        grants?: Record<string, string[]>;
      };
      const grants = body.grants;
      const callMemberGrants = grants?.call_member;
      if (!Array.isArray(callMemberGrants)) {
        this.logger.warn('The "default" call type has no call_member grants');
        return;
      }

      if (callMemberGrants.includes('join-backstage')) {
        this.logger.log(
          'call_member role already allows joining the backstage',
        );
        return;
      }

      const update: Record<string, string[]> = { ...(grants ?? {}) };
      update.call_member = [...callMemberGrants, 'join-backstage'];

      const updateResponse = await fetch(base, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ grants: update }),
      });
      if (updateResponse.ok) {
        this.logger.log(
          'Granted call_member the join-backstage capability on the "default" call type',
        );
      } else {
        this.logger.warn(
          `Could not update the "default" call type (${updateResponse.status})`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Backstage capability setup skipped: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Issues a short-lived Stream Video client token for `userId` scoped to a
   * single chat conversation. Access mirrors the rest of the chat feature:
   *
   * - The requester must already be a member of the given chat channel. This
   *   means only people who can already see the conversation can join a call
   *   tied to it (DM or group).
   * - Starting a group call additionally requires at least the Team Lead
   *   role, matching the frontend `create_meeting` permission.
   *
   * The returned token is an HS256 JWT signed with the Stream Video app
   * secret and carries the `user_id` claim, as required by GetStream for
   * client tokens. The `memberIds` let the caller ring the other members.
   */
  async issueVideoToken(
    userId: string,
    role: string | undefined,
    dto: VideoTokenDto,
  ): Promise<VideoTokenResponse> {
    if (dto.kind === 'group' && !hasMinRole(role ?? '', UserRole.TEAM_LEAD)) {
      throw new ForbiddenException(
        'Starting a group call requires at least the Team Lead role',
      );
    }

    const memberIds = await this.resolveChannelMembers(dto.channelId, userId);

    const credentials = this.getCredentials();
    const token = this.getJwt(credentials.secret).sign({ user_id: userId });

    return {
      apiKey: credentials.apiKey,
      userId,
      token,
      memberIds,
    };
  }

  /**
   * Issues a generic video client token for an authenticated user. This is the
   * video counterpart of the chat token endpoint and is used to keep the video
   * client connected so incoming calls can be received anywhere in the app.
   * Call-level authorization (who can ring / join a call) is enforced by the
   * `memberIds` returned from {@link issueVideoToken} plus the call member list
   * sent to GetStream when a call is created.
   */
  async connect(userId: string): Promise<VideoConnectResponse> {
    const credentials = this.getCredentials();
    const token = this.getJwt(credentials.secret).sign({ user_id: userId });

    return Promise.resolve({
      apiKey: credentials.apiKey,
      userId,
      token,
    });
  }

  // --- Helpers --------------------------------------------------------------

  private async resolveChannelMembers(
    channelId: string,
    userId: string,
  ): Promise<string[]> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    try {
      const response = await channel.query({
        members: { limit: 100 },
        messages: { limit: 1 },
      });
      const members = response.members
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id));
      if (!members.includes(userId)) {
        throw new ForbiddenException(
          'You are not a member of this conversation',
        );
      }
      return members;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(
        `Failed to describe channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(`Conversation ${channelId} not found`);
    }
  }

  private getCredentials(): VideoCredentials {
    if (this.cachedCredentials) return this.cachedCredentials;

    const apiKey = this.configService.get<string>('video.apiKey');
    const secret = this.configService.get<string>('video.secret');

    if (!apiKey || !secret) {
      throw new ServiceUnavailableException(
        'Video calls are not configured (STREAM_API_KEY / STREAM_SECRET missing)',
      );
    }

    this.cachedCredentials = { apiKey, secret };
    return this.cachedCredentials;
  }

  private getJwt(secret: string): JwtService {
    if (this.cachedJwt) return this.cachedJwt;

    const options: JwtModuleOptions = {
      secret,
      signOptions: {
        algorithm: 'HS256',
        expiresIn: '24h',
      },
    };

    this.cachedJwt = new JwtService(options);
    return this.cachedJwt;
  }
}
