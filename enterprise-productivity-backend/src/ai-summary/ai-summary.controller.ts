import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { AiSummaryService } from './ai-summary.service';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('projects/:projectId/ai-summary')
@UseGuards(ClerkAuthGuard)
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
