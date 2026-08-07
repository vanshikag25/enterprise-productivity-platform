import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessageSourceModule } from '../message-source/message-source.module';

@Module({
  imports: [
    DatabaseModule,
    StreamModule,
    NotificationsModule,
    MessageSourceModule,
  ],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
