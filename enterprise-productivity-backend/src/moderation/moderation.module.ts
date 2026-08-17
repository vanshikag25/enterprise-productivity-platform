import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [
    DatabaseModule,
    StreamModule,
    UsersModule,
    ProjectsModule,
    NotificationsModule,
  ],
  providers: [ModerationService],
  controllers: [ModerationController],
})
export class ModerationModule {}
