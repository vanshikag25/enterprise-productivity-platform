import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiSummaryService } from './ai-summary.service';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects/:projectId/ai-summary')
@UseGuards(JwtAuthGuard)
export class AiSummaryController {
  constructor(private readonly aiSummaryService: AiSummaryService) {}

  @Get()
  generate(
    @CurrentUser() auth: AuthObject,
    @Param('projectId') projectId: string,
  ) {
    return this.aiSummaryService.generate(projectId, requireUserId(auth));
  }
}
