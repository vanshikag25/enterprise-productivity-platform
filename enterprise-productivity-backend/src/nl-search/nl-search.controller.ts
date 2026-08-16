import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '../auth/auth-object';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NlSearchService, NlSearchResponse } from './nl-search.service';

interface AiSearchBody {
  query?: unknown;
}

@Controller('search')
export class NlSearchController {
  constructor(private readonly nlSearchService: NlSearchService) {}

  @Post('ai')
  @UseGuards(JwtAuthGuard)
  async aiSearch(
    @CurrentUser() auth: AuthObject,
    @Body() body: AiSearchBody,
  ): Promise<NlSearchResponse> {
    if (!auth.userId) {
      throw new UnauthorizedException('Session has no resolvable userId');
    }
    if (typeof body.query !== 'string' || body.query.trim().length < 2) {
      throw new BadRequestException(
        'query must be a non-empty string of at least 2 characters.',
      );
    }
    return this.nlSearchService.search(auth.userId, body.query.trim());
  }
}