import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
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

@Controller('chat')
export class ChatController {
  constructor(
    private readonly streamService: StreamService,
    private readonly chatService: ChatService,
  ) {}

  private uid(auth: AuthObject): string {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return auth.userId;
  }

  @Get('token')
  @UseGuards(JwtAuthGuard)
  getToken(@CurrentUser() auth: AuthObject): {
    streamToken: string;
    apiKey: string;
  } {
    const userId = this.uid(auth);
    const streamToken = this.streamService.createUserToken(userId);
    const apiKey = this.streamService.getApiKey();

    return { streamToken, apiKey };
  }

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  async createDirectChannel(
    @CurrentUser() auth: AuthObject,
    @Body() body: CreateDirectChannelBody,
  ): Promise<{ channelId: string }> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    if (!body.targetUserId || typeof body.targetUserId !== 'string') {
      throw new BadRequestException('targetUserId is required.');
    }

    if (body.targetUserId === auth.userId) {
      throw new BadRequestException(
        'Cannot create a direct channel with yourself.',
      );
    }

    const channelId = await this.streamService.getOrCreateDirectChannel(
      auth.userId,
      body.targetUserId,
    );

    return { channelId };
  }

  @Post('group')
  @UseGuards(JwtAuthGuard)
  async createGroupChannel(
    @CurrentUser() auth: AuthObject,
    @Body() body: CreateGroupChannelBody,
  ): Promise<{
    channelId: string;
    name: string | undefined;
    description: string | undefined;
    memberIds: string[];
  }> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }

    if (!body.groupName || typeof body.groupName !== 'string') {
      throw new BadRequestException('groupName is required.');
    }

    if (
      body.description !== undefined &&
      typeof body.description !== 'string'
    ) {
      throw new BadRequestException('description must be a string.');
    }

    if (
      !Array.isArray(body.memberIds) ||
      body.memberIds.some((id) => typeof id !== 'string')
    ) {
      throw new BadRequestException('memberIds must be an array of strings.');
    }

    if (body.memberIds.length === 0) {
      throw new BadRequestException(
        'At least one other member is required to create a group.',
      );
    }

    const channel = await this.streamService.createGroupChannel(
      auth.userId,
      body.groupName,
      body.description,
      body.memberIds,
    );

    const channelData = channel.data as
      | {
          name?: string;
          description?: string;
        }
      | undefined;

    return {
      channelId: channel.id ?? '',
      name: channelData?.name,
      description: channelData?.description,
      memberIds: Object.keys(channel.state?.members ?? {}),
    };
  }

  @Get('groups/:channelId')
  @UseGuards(JwtAuthGuard)
  getGroupInfo(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
  ): Promise<GroupInfo> {
    return this.chatService.getGroupInfo(channelId, this.uid(auth));
  }

  @Patch('groups/:channelId')
  @UseGuards(JwtAuthGuard)
  updateGroup(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Body() body: UpdateGroupBody,
  ): Promise<GroupInfo> {
    return this.chatService.updateGroup(channelId, this.uid(auth), body);
  }

  @Put('groups/:channelId/avatar')
  @UseGuards(JwtAuthGuard)
  updateGroupAvatar(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Body() body: UpdateGroupAvatarBody,
  ): Promise<GroupInfo> {
    if (!body.avatarUrl || typeof body.avatarUrl !== 'string') {
      throw new BadRequestException('avatarUrl is required.');
    }
    return this.chatService.updateGroupAvatar(
      channelId,
      this.uid(auth),
      body.avatarUrl,
    );
  }

  @Delete('groups/:channelId/avatar')
  @UseGuards(JwtAuthGuard)
  removeGroupAvatar(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
  ): Promise<GroupInfo> {
    return this.chatService.removeGroupAvatar(channelId, this.uid(auth));
  }

  @Post('groups/:channelId/members/:memberId')
  @UseGuards(JwtAuthGuard)
  addMember(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupInfo> {
    return this.chatService.addMember(channelId, this.uid(auth), memberId);
  }

  @Delete('groups/:channelId/members/:memberId')
  @UseGuards(JwtAuthGuard)
  removeMember(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupInfo> {
    return this.chatService.removeMember(channelId, this.uid(auth), memberId);
  }

  @Post('groups/:channelId/leave')
  @UseGuards(JwtAuthGuard)
  leaveGroup(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
  ): Promise<void> {
    return this.chatService.leaveGroup(channelId, this.uid(auth));
  }

  @Post('groups/:channelId/moderators/:memberId')
  @UseGuards(JwtAuthGuard)
  assignModerator(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupInfo> {
    return this.chatService.assignModerator(
      channelId,
      this.uid(auth),
      memberId,
    );
  }

  @Delete('groups/:channelId/moderators/:memberId')
  @UseGuards(JwtAuthGuard)
  demoteModerator(
    @CurrentUser() auth: AuthObject,
    @Param('channelId') channelId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupInfo> {
    return this.chatService.demoteModerator(
      channelId,
      this.uid(auth),
      memberId,
    );
  }
}
