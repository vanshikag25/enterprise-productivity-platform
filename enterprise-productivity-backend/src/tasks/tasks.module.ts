import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, StreamModule, NotificationsModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
