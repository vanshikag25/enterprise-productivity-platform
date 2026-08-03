import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsService } from './projects.service';
import { ProjectAccessService } from './project-access.service';

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule, NotificationsModule],
  providers: [ProjectsService, ProjectAccessService],
  exports: [ProjectAccessService, ProjectsService],
})
export class ProjectsModule {}
