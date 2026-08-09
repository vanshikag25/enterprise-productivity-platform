import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SeedService } from './seed.service';
import { StreamController } from '../stream/stream.controller';
import { UsersController } from '../users/users.controller';
import { ChatController } from '../chat/chat.controller';
import { ChatService } from '../chat/chat.service';
import { TasksController } from '../tasks/tasks.controller';
import { MeetingsController } from '../meetings/meetings.controller';
import { DepartmentsController } from '../departments/departments.controller';
import { ChannelsController } from '../channels/channels.controller';
import { NotificationsController } from '../notifications/notifications.controller';
import { RolesGuard } from '../rbac/roles.guard';
import { UsersModule } from '../users/users.module';
import { StreamModule } from '../stream/stream.module';
import { TasksModule } from '../tasks/tasks.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ChannelsModule } from '../channels/channels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../database/database.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectAnnouncementsModule } from '../project-announcements/project-announcements.module';
import { ProjectDocumentsModule } from '../project-documents/project-documents.module';
import { ProjectMilestonesModule } from '../project-milestones/project-milestones.module';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';
import { ProjectsController } from '../projects/projects.controller';
import { ProjectAnnouncementsController } from '../project-announcements/project-announcements.controller';
import { ProjectDocumentsController } from '../project-documents/project-documents.controller';
import { ProjectMilestonesController } from '../project-milestones/project-milestones.controller';
import { AiSummaryController } from '../ai-summary/ai-summary.controller';
import { NotesModule } from '../notes/notes.module';
import { NotesController } from '../notes/notes.controller';
import { RemindersModule } from '../reminders/reminders.module';
import { RemindersController } from '../reminders/reminders.controller';
import { BookmarksModule } from '../bookmarks/bookmarks.module';
import { BookmarksController } from '../bookmarks/bookmarks.controller';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    StreamModule,
    TasksModule,
    MeetingsModule,
    DepartmentsModule,
    ChannelsModule,
    NotificationsModule,
    DatabaseModule,
    ProjectsModule,
    ProjectAnnouncementsModule,
    ProjectDocumentsModule,
    ProjectMilestonesModule,
    AiSummaryModule,
    NotesModule,
    RemindersModule,
    BookmarksModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('auth.jwtSecret') ?? 'change-me-in-production',
        signOptions: {
          expiresIn: config.get<string>('auth.jwtExpiresIn') ?? '7d',
          algorithm: 'HS256',
          issuer: 'enterprise-productivity',
        } as JwtModuleOptions['signOptions'],
      }),
    }),
  ],
  controllers: [
    AuthController,
    StreamController,
    UsersController,
    ChatController,
    TasksController,
    MeetingsController,
    DepartmentsController,
    ChannelsController,
    NotificationsController,
    ProjectsController,
    ProjectAnnouncementsController,
    ProjectDocumentsController,
    ProjectMilestonesController,
    AiSummaryController,
    NotesController,
    RemindersController,
    BookmarksController,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    SeedService,
    ChatService,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}