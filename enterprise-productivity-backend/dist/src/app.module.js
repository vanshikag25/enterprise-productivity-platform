"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_module_1 = require("./config/config.module");
const health_module_1 = require("./health/health.module");
const auth_module_1 = require("./auth/auth.module");
const database_module_1 = require("./database/database.module");
const users_module_1 = require("./users/users.module");
const stream_module_1 = require("./stream/stream.module");
const tasks_module_1 = require("./tasks/tasks.module");
const meetings_module_1 = require("./meetings/meetings.module");
const departments_module_1 = require("./departments/departments.module");
const channels_module_1 = require("./channels/channels.module");
const notifications_module_1 = require("./notifications/notifications.module");
const projects_module_1 = require("./projects/projects.module");
const project_announcements_module_1 = require("./project-announcements/project-announcements.module");
const project_documents_module_1 = require("./project-documents/project-documents.module");
const project_milestones_module_1 = require("./project-milestones/project-milestones.module");
const ai_summary_module_1 = require("./ai-summary/ai-summary.module");
const notes_module_1 = require("./notes/notes.module");
const reminders_module_1 = require("./reminders/reminders.module");
const bookmarks_module_1 = require("./bookmarks/bookmarks.module");
const message_source_module_1 = require("./message-source/message-source.module");
const polls_module_1 = require("./polls/polls.module");
const conversation_summary_module_1 = require("./conversation-summary/conversation-summary.module");
const smart_reply_module_1 = require("./smart-reply/smart-reply.module");
const action_detection_module_1 = require("./action-detection/action-detection.module");
const creation_requests_module_1 = require("./creation-requests/creation-requests.module");
const nl_search_module_1 = require("./nl-search/nl-search.module");
const sentiment_module_1 = require("./sentiment/sentiment.module");
const translation_module_1 = require("./translation/translation.module");
const video_module_1 = require("./video/video.module");
const moderation_module_1 = require("./moderation/moderation.module");
const analytics_module_1 = require("./analytics/analytics.module");
const audit_module_1 = require("./audit/audit.module");
const request_context_1 = require("./audit/request-context");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_context_1.RequestContextMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            database_module_1.DatabaseModule,
            users_module_1.UsersModule,
            stream_module_1.StreamModule,
            analytics_module_1.AnalyticsModule,
            audit_module_1.AuditModule,
            tasks_module_1.TasksModule,
            meetings_module_1.MeetingsModule,
            departments_module_1.DepartmentsModule,
            channels_module_1.ChannelsModule,
            notifications_module_1.NotificationsModule,
            projects_module_1.ProjectsModule,
            project_announcements_module_1.ProjectAnnouncementsModule,
            project_documents_module_1.ProjectDocumentsModule,
            project_milestones_module_1.ProjectMilestonesModule,
            ai_summary_module_1.AiSummaryModule,
            message_source_module_1.MessageSourceModule,
            notes_module_1.NotesModule,
            reminders_module_1.RemindersModule,
            bookmarks_module_1.BookmarksModule,
            polls_module_1.PollsModule,
            conversation_summary_module_1.ConversationSummaryModule,
            smart_reply_module_1.SmartReplyModule,
            action_detection_module_1.ActionDetectionModule,
            creation_requests_module_1.CreationRequestsModule,
            nl_search_module_1.NlSearchModule,
            sentiment_module_1.SentimentModule,
            translation_module_1.TranslationModule,
            video_module_1.VideoModule,
            moderation_module_1.ModerationModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map