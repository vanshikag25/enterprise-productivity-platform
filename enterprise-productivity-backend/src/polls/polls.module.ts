import { Module } from '@nestjs/common';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ClerkModule } from '../clerk/clerk.module';

@Module({
  imports: [
    ClerkModule,
    DatabaseModule,
    StreamModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [PollsController],
  providers: [PollsService],
  exports: [PollsService],
})
export class PollsModule {}
