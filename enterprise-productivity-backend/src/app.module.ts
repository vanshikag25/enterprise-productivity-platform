import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
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
import { ConversationSummaryModule } from './conversation-summary/conversation-summary.module';
import { SmartReplyModule } from './smart-reply/smart-reply.module';
import { ActionDetectionModule } from './action-detection/action-detection.module';
import { CreationRequestsModule } from './creation-requests/creation-requests.module';
import { NlSearchModule } from './nl-search/nl-search.module';
import { SentimentModule } from './sentiment/sentiment.module';
import { TranslationModule } from './translation/translation.module';
import { VideoModule } from './video/video.module';
import { ModerationModule } from './moderation/moderation.module';
import { AutomationModule } from './automation/automation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { RequestContextMiddleware } from './audit/request-context';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    AuthModule,
    DatabaseModule,
    UsersModule,
    StreamModule,
    AnalyticsModule,
    AuditModule,
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
    ConversationSummaryModule,
    SmartReplyModule,
    ActionDetectionModule,
    CreationRequestsModule,
    NlSearchModule,
    SentimentModule,
    TranslationModule,
    VideoModule,
    ModerationModule,
    AutomationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
