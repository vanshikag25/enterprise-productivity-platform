import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SmartReplyService } from './smart-reply.service';
import { GenerateSmartRepliesDto } from './dto/generate-smart-replies.dto';

@Controller('chat/smart-replies')
@UseGuards(JwtAuthGuard)
export class SmartReplyController {
  constructor(private readonly smartReplyService: SmartReplyService) {}

  @Post()
  generate(
    @CurrentUser() auth: AuthObject,
    @Body() dto: GenerateSmartRepliesDto,
  ) {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return this.smartReplyService.getReplies(dto.channelId, auth.userId);
  }
}
