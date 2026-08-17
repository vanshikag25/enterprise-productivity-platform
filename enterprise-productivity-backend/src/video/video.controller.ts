import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VideoTokenDto } from './dto/video-token.dto';
import {
  VideoConnectResponse,
  VideoService,
  VideoTokenResponse,
} from './video.service';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('connect')
  connect(@CurrentUser() auth: AuthObject): Promise<VideoConnectResponse> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return this.videoService.connect(auth.userId);
  }

  @Post('token')
  issueToken(
    @CurrentUser() auth: AuthObject,
    @Req() request: Request & { user?: { role?: string } | undefined },
    @Body() dto: VideoTokenDto,
  ): Promise<VideoTokenResponse> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return this.videoService.issueVideoToken(
      auth.userId,
      request.user?.role,
      dto,
    );
  }
}
