import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectAnnouncementsService } from './project-announcements.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, ProjectsModule],
  providers: [ProjectAnnouncementsService],
  exports: [ProjectAnnouncementsService],
})
export class ProjectAnnouncementsModule {}
