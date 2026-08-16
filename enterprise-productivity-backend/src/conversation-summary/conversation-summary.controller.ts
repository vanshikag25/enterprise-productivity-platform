import {
  Body,
  Controller,
  Get,
  Post,
  BadRequestException,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationSummaryService } from './conversation-summary.service';
import { GenerateConversationSummaryDto } from './dto/generate-conversation-summary.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

function requireChannelId(channelId: string | undefined): string {
  if (!channelId)
    throw new BadRequestException('channelId is required as a query parameter');
  return channelId;
}

@Controller('chat/summaries')
@UseGuards(JwtAuthGuard)
export class ConversationSummaryController {
  constructor(
    private readonly conversationSummaryService: ConversationSummaryService,
  ) {}

  @Get()
  list(
    @CurrentUser() auth: AuthObject,
    @Query('channelId') channelId: string | undefined,
  ) {
    return this.conversationSummaryService.listSummaries(
      requireChannelId(channelId),
      requireUserId(auth),
    );
  }

  @Get('daily')
  getDaily(
    @CurrentUser() auth: AuthObject,
    @Query('channelId') channelId: string | undefined,
  ) {
    return this.conversationSummaryService.getCurrent(
      requireChannelId(channelId),
      requireUserId(auth),
      'daily',
    );
  }

  @Get('weekly')
  getWeekly(
    @CurrentUser() auth: AuthObject,
    @Query('channelId') channelId: string | undefined,
  ) {
    return this.conversationSummaryService.getCurrent(
      requireChannelId(channelId),
      requireUserId(auth),
      'weekly',
    );
  }

  @Post('generate')
  generate(
    @CurrentUser() auth: AuthObject,
    @Body() dto: GenerateConversationSummaryDto,
  ) {
    return this.conversationSummaryService.generate(
      dto.channelId,
      requireUserId(auth),
      dto,
    );
  }
}
