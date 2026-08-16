import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TasksModule } from '../tasks/tasks.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { StreamModule } from '../stream/stream.module';
import { CreationRequestsService } from './creation-requests.service';
import { CreationRequestsController } from './creation-requests.controller';

@Module({
  imports: [
    DatabaseModule,
    TasksModule,
    MeetingsModule,
    NotificationsModule,
    UsersModule,
    StreamModule,
  ],
  controllers: [CreationRequestsController],
  providers: [CreationRequestsService],
  exports: [CreationRequestsService],
})
export class CreationRequestsModule {}