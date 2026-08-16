import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { SentimentService, SentimentAnalysisResponse } from './sentiment.service';

interface SentimentStatusBody {
  enabled?: unknown;
}

interface SentimentAnalyzeBody {
  projectId?: unknown;
  days?: unknown;
}

@Controller('sentiment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  private uid(auth: AuthObject): string {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return auth.userId;
  }

  @Get('status')
  async status(): Promise<{ enabled: boolean }> {
    return { enabled: await this.sentimentService.getEnabled() };
  }

  @Put('status')
  async setStatus(
    @CurrentUser() auth: AuthObject,
    @Body() body: SentimentStatusBody,
  ): Promise<{ enabled: boolean }> {
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean.');
    }
    const enabled = await this.sentimentService.setEnabled(
      this.uid(auth),
      body.enabled,
    );
    return { enabled };
  }

  @Post('analyze')
  async analyze(
    @CurrentUser() auth: AuthObject,
    @Body() body: SentimentAnalyzeBody,
  ): Promise<SentimentAnalysisResponse> {
    if (typeof body.projectId !== 'string' || body.projectId.trim() === '') {
      throw new BadRequestException('projectId is required.');
    }
    let days = 14;
    if (body.days !== undefined) {
      if (typeof body.days !== 'number' || !Number.isFinite(body.days)) {
        throw new BadRequestException('days must be a number.');
      }
      days = Math.min(90, Math.max(1, Math.floor(body.days)));
    }
    return this.sentimentService.analyzeProject(
      this.uid(auth),
      body.projectId.trim(),
      days,
    );
  }
}