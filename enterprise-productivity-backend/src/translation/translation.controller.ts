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
import { TranslateMessageDto } from './dto/translate-message.dto';
import { TranslationService, TranslationResponse } from './translation.service';

@Controller('chat/translate')
@UseGuards(JwtAuthGuard)
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  translate(
    @CurrentUser() auth: AuthObject,
    @Body() dto: TranslateMessageDto,
  ): Promise<TranslationResponse> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    return this.translationService.translate(
      dto.channelId,
      dto.messageId,
      auth.userId,
      dto.targetLanguage,
    );
  }
}