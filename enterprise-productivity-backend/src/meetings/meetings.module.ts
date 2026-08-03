import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, StreamModule, NotificationsModule],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
