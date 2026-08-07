import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthObject } from '@clerk/backend';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard';
import { CurrentUser } from '../clerk/current-user.decorator';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

function requireUserId(auth: AuthObject): string {
  if (!auth.userId)
    throw new UnauthorizedException('Session has no resolvable userId');
  return auth.userId;
}

@Controller('bookmarks')
@UseGuards(ClerkAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  create(@CurrentUser() auth: AuthObject, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(requireUserId(auth), dto);
  }

  @Get()
  findAll(
    @CurrentUser() auth: AuthObject,
    @Query('channelId') channelId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookmarksService.findAll(requireUserId(auth), {
      channelId,
      search,
    });
  }

  @Get('by-message/:messageId')
  findByMessage(
    @CurrentUser() auth: AuthObject,
    @Param('messageId') messageId: string,
  ) {
    return this.bookmarksService.findByMessage(
      requireUserId(auth),
      messageId,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() auth: AuthObject, @Param('id') id: string) {
    return this.bookmarksService.remove(id, requireUserId(auth));
  }
}
