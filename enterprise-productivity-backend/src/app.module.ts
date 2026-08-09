import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { StreamModule } from './stream/stream.module';
import { TasksModule } from './tasks/tasks.module';
import { MeetingsModule } from './meetings/meetings.module';
import { DepartmentsModule } from './departments/departments.module';
import { ChannelsModule } from './channels/channels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProjectsModule } from './projects/projects.module';
import { ProjectAnnouncementsModule } from './project-announcements/project-announcements.module';
import { ProjectDocumentsModule } from './project-documents/project-documents.module';
import { ProjectMilestonesModule } from './project-milestones/project-milestones.module';
import { AiSummaryModule } from './ai-summary/ai-summary.module';
import { NotesModule } from './notes/notes.module';
import { RemindersModule } from './reminders/reminders.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { MessageSourceModule } from './message-source/message-source.module';
import { PollsModule } from './polls/polls.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    AuthModule,
    DatabaseModule,
    UsersModule,
    StreamModule,
    TasksModule,
    MeetingsModule,
    DepartmentsModule,
    ChannelsModule,
    NotificationsModule,
    ProjectsModule,
    ProjectAnnouncementsModule,
    ProjectDocumentsModule,
    ProjectMilestonesModule,
    AiSummaryModule,
    MessageSourceModule,
    NotesModule,
    RemindersModule,
    BookmarksModule,
    PollsModule,
  ],
})
export class AppModule {}
