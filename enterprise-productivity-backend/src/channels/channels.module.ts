import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StreamModule, UsersModule, DepartmentsModule, NotificationsModule],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
