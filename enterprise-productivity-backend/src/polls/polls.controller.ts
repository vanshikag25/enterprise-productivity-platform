import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('polls')
@UseGuards(ClerkAuthGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreatePollDto) {
    return this.pollsService.create(requireUserId(auth), dto);
  }

  @Get('channel/:channelId')
  findForChannel(@Param('channelId') channelId: string) {
    return this.pollsService.findForChannel(channelId);
  }

  @Get('stream/:streamPollId')
  resolve(@Param('streamPollId') streamPollId: string) {
    return this.pollsService.resolve(streamPollId);
  }

  @Patch('stream/:streamPollId')
  update(
    @CurrentUser() auth: AuthObject,
    @Param('streamPollId') streamPollId: string,
    @Body() dto: UpdatePollDto,
  ) {
    return this.pollsService.update(streamPollId, requireUserId(auth), dto);
  }

  @Post('stream/:streamPollId/close')
  close(
    @CurrentUser() auth: AuthObject,
    @Param('streamPollId') streamPollId: string,
  ) {
    return this.pollsService.close(streamPollId, requireUserId(auth));
  }

  @Post('stream/:streamPollId/finalize')
  finalize(@Param('streamPollId') streamPollId: string) {
    return this.pollsService.finalize(streamPollId);
  }

  @Delete('stream/:streamPollId')
  remove(
    @CurrentUser() auth: AuthObject,
    @Param('streamPollId') streamPollId: string,
  ) {
    return this.pollsService.remove(streamPollId, requireUserId(auth));
  }
}
