import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectMilestonesService } from './project-milestones.service';

@Module({
  imports: [DatabaseModule, StreamModule, NotificationsModule, ProjectsModule],
  providers: [ProjectMilestonesService],
  exports: [ProjectMilestonesService],
})
export class ProjectMilestonesModule {}
