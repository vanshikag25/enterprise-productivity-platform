import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DetectActionsDto } from './dto/detect-actions.dto';
import { ResolveActionDto } from './dto/resolve-action.dto';
import {
  ActionDetectionService,
  DetectedActionItem,
} from './action-detection.service';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('chat/action-detection')
@UseGuards(JwtAuthGuard)
export class ActionDetectionController {
  constructor(
    private readonly actionDetectionService: ActionDetectionService,
  ) {}

  /** Analyses a new (or latest) message and returns stored detections. */
  @Post('analyze')
  analyze(
    @CurrentUser() auth: AuthObject,
    @Body() dto: DetectActionsDto,
  ): Promise<DetectedActionItem[]> {
    return this.actionDetectionService.analyze(
      dto.channelId,
      requireUserId(auth),
      dto.messageId,
    );
  }

  /** Lists actionable detections for a channel (members only). */
  @Get()
  list(
    @CurrentUser() auth: AuthObject,
    @Query('channelId') channelId: string,
  ): Promise<DetectedActionItem[]> {
    if (!channelId) throw new UnauthorizedException('channelId is required');
    return this.actionDetectionService.list(channelId, requireUserId(auth));
  }

  @Get(':id')
  findOne(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ): Promise<DetectedActionItem> {
    return this.actionDetectionService.findOne(id, requireUserId(auth));
  }

  /** Dismisses a suggestion for the requesting user. */
  @Post(':id/dismiss')
  dismiss(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ): Promise<DetectedActionItem> {
    return this.actionDetectionService.dismiss(id, requireUserId(auth));
  }

  /** Records that a suggestion was acted upon (audit + dedupe). */
  @Post(':id/resolve')
  resolve(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
    @Body() dto: ResolveActionDto,
  ): Promise<DetectedActionItem> {
    return this.actionDetectionService.resolve(id, requireUserId(auth), dto);
  }
}
