import {
  Body,
  Controller,
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
import { NotificationsService } from './notifications.service';

function uid(auth: AuthObject): string {
  if (!auth.userId) throw new UnauthorizedException();
  return auth.userId;
}

interface SelfNotificationBody {
  type: string;
  title: string;
  description?: string;
  actionUrl?: string;
}

@Controller('notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get() findMine(@CurrentUser() auth: AuthObject) {
    return this.notificationsService.findMine(uid(auth));
  }

  @Get('unread-count') unreadCount(@CurrentUser() auth: AuthObject) {
    return this.notificationsService.unreadCount(uid(auth));
  }

  @Patch(':id/read') markRead(
    @CurrentUser() auth: AuthObject,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(id, uid(auth));
  }

  @Patch('read-all') markAllRead(@CurrentUser() auth: AuthObject) {
    return this.notificationsService.markAllRead(uid(auth));
  }

  // Recipient is always the caller — no spoofing possible.
  @Post('self')
  createSelf(
    @CurrentUser() auth: AuthObject,
    @Body() body: SelfNotificationBody,
  ) {
    return this.notificationsService.create({ userId: uid(auth), ...body });
  }
}
