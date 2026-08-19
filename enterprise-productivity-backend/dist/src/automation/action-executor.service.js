"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ActionExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExecutorService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const projects_schema_1 = require("../database/schema/projects.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
const tasks_service_1 = require("../tasks/tasks.service");
const reminders_service_1 = require("../reminders/reminders.service");
const project_milestones_service_1 = require("../project-milestones/project-milestones.service");
const conversation_summary_service_1 = require("../conversation-summary/conversation-summary.service");
const ai_summary_service_1 = require("../ai-summary/ai-summary.service");
const automation_context_1 = require("./automation-context");
const string_utils_1 = require("./string-utils");
let ActionExecutorService = ActionExecutorService_1 = class ActionExecutorService {
    constructor(db, streamService, notificationsService, tasksService, remindersService, milestonesService, conversationSummaryService, aiSummaryService) {
        this.db = db;
        this.streamService = streamService;
        this.notificationsService = notificationsService;
        this.tasksService = tasksService;
        this.remindersService = remindersService;
        this.milestonesService = milestonesService;
        this.conversationSummaryService = conversationSummaryService;
        this.aiSummaryService = aiSummaryService;
        this.logger = new common_1.Logger(ActionExecutorService_1.name);
    }
    async executeAll(workflow, payload) {
        const results = [];
        for (const action of workflow.actions ?? []) {
            try {
                const detail = await automation_context_1.automationContext.run(() => this.runAction(workflow, action, payload));
                results.push({ type: action.type, ok: true, detail });
            }
            catch (err) {
                results.push({
                    type: action.type,
                    ok: false,
                    error: err instanceof Error ? err.message : (0, string_utils_1.toDisplayString)(err),
                });
            }
        }
        return results;
    }
    async runAction(workflow, action, payload) {
        switch (action.type) {
            case 'notify':
                return this.notify(workflow, action.config, payload);
            case 'chatMessage':
                return this.chatMessage(workflow, action.config, payload);
            case 'createTask':
                return this.createTask(workflow, action.config, payload);
            case 'createReminder':
                return this.createReminder(workflow, action.config, payload);
            case 'updateTaskStatus':
                return this.updateTaskStatus(workflow, action.config, payload);
            case 'updateMilestoneStatus':
                return this.updateMilestoneStatus(workflow, action.config, payload);
            case 'aiSummary':
                return this.aiSummary(workflow, action.config, payload);
            case 'createTasksFromActionItems':
                return this.createTasksFromActionItems(workflow, action.config, payload);
            case 'archiveDiscussion':
                return this.archiveDiscussion(action.config, payload);
            default:
                throw new Error(`Unsupported action type: ${(0, string_utils_1.toDisplayString)(action.type)}`);
        }
    }
    async notify(workflow, config, payload) {
        const rawUsers = Array.isArray(config.users)
            ? config.users.map((u) => (0, string_utils_1.toDisplayString)(u))
            : [(0, string_utils_1.toDisplayString)(config.users)];
        const recipients = await this.resolveUsers(rawUsers, payload);
        const title = this.interpolate((0, string_utils_1.toDisplayString)(config.title) || 'Notification', payload);
        const description = config.description != null
            ? this.interpolate((0, string_utils_1.toDisplayString)(config.description), payload)
            : undefined;
        const actionUrl = config.actionUrl != null
            ? this.interpolate((0, string_utils_1.toDisplayString)(config.actionUrl), payload)
            : undefined;
        if (recipients.length === 0)
            return { recipients: 0, title };
        await this.notificationsService.createMany(recipients.map((userId) => ({
            userId,
            type: 'workflow',
            title,
            description,
            actionUrl,
        })));
        return { recipients: recipients.length, title };
    }
    async chatMessage(workflow, config, payload) {
        const channelId = this.resolveChannelId(config, payload);
        if (!channelId)
            throw new Error('No channel resolved for this action');
        const text = this.interpolate((0, string_utils_1.toDisplayString)(config.text), payload);
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        const result = await channel.sendMessage({
            text,
            user_id: workflow.createdBy,
        });
        return {
            channelId,
            messageId: result.message?.id ?? null,
        };
    }
    async createTask(workflow, config, payload) {
        const title = this.interpolate((0, string_utils_1.toDisplayString)(config.title), payload);
        if (!title)
            throw new Error('createTask requires a title');
        const assignee = this.resolveSingleUser(config.assignee, payload);
        const dueDate = this.resolveDate(config.dueDate, payload);
        const task = await this.tasksService.create(workflow.createdBy, {
            title,
            description: config.description != null
                ? this.interpolate((0, string_utils_1.toDisplayString)(config.description), payload)
                : undefined,
            priority: config.priority != null ? (0, string_utils_1.toDisplayString)(config.priority) : undefined,
            dueDate: dueDate ?? undefined,
            assignee: assignee ?? undefined,
        });
        return { taskId: task.id, title: task.title };
    }
    async createReminder(workflow, config, payload) {
        const title = this.interpolate((0, string_utils_1.toDisplayString)(config.title), payload);
        if (!title)
            throw new Error('createReminder requires a title');
        const scheduledFor = this.resolveDate(config.scheduledFor, payload);
        if (!scheduledFor)
            throw new Error('createReminder requires scheduledFor');
        const user = this.resolveSingleUser(config.userId, payload) ?? workflow.createdBy;
        const reminder = await this.remindersService.create(user, {
            title,
            scheduledFor,
            priority: config.priority != null ? (0, string_utils_1.toDisplayString)(config.priority) : undefined,
            notes: config.notes != null
                ? this.interpolate((0, string_utils_1.toDisplayString)(config.notes), payload)
                : undefined,
        });
        return { reminderId: reminder.id, userId: user, title };
    }
    async updateTaskStatus(workflow, config, payload) {
        const rawTaskId = (0, string_utils_1.toDisplayString)(config.taskId) || 'source';
        const taskId = rawTaskId === 'source'
            ? payload.taskId
                ? (0, string_utils_1.toDisplayString)(payload.taskId)
                : null
            : rawTaskId;
        if (!taskId)
            throw new Error('No task resolved for this action');
        const status = (0, string_utils_1.toDisplayString)(config.status);
        if (!status)
            throw new Error('updateTaskStatus requires a status');
        const task = await this.tasksService.findOne(taskId);
        const actingUser = [(0, string_utils_1.toDisplayString)(payload.actor), workflow.createdBy, task.createdBy].find((u) => u === task.createdBy || u === task.assignee) ?? task.createdBy;
        const updated = await this.tasksService.updateStatus(taskId, actingUser, status);
        return { taskId, status: updated.status };
    }
    async updateMilestoneStatus(workflow, config, payload) {
        const projectId = this.resolveId(config.projectId, payload.projectId);
        if (!projectId)
            throw new Error('No project resolved for this action');
        const milestoneId = this.resolveId(config.milestoneId, payload.milestoneId);
        if (!milestoneId)
            throw new Error('No milestone resolved for this action');
        const status = (0, string_utils_1.toDisplayString)(config.status);
        if (!status)
            throw new Error('updateMilestoneStatus requires a status');
        const actingUser = (0, string_utils_1.toDisplayString)(payload.actor) || workflow.createdBy;
        const updated = await this.milestonesService.updateStatus(projectId, actingUser, milestoneId, status);
        return { milestoneId, status: updated.status };
    }
    async aiSummary(workflow, config, payload) {
        const actingUser = (0, string_utils_1.toDisplayString)(payload.actor) || workflow.createdBy;
        const scope = (0, string_utils_1.toDisplayString)(config.scope) || 'channel';
        if (scope === 'project') {
            const projectId = this.resolveId(config.projectId, payload.projectId);
            if (!projectId)
                throw new Error('No project resolved for this action');
            const result = await this.aiSummaryService.generate(projectId, actingUser);
            await this.maybeNotify(config.notifyUsers, payload, `AI summary ready: ${result.overview.slice(0, 120)}`, `/projects/${projectId}`);
            return {
                scope,
                projectId,
                provider: result.provider,
                actionItems: result.actionItems.length,
            };
        }
        const channelId = this.resolveChannelId(config, payload);
        if (!channelId)
            throw new Error('No channel resolved for this action');
        const summary = await this.conversationSummaryService.generate(channelId, actingUser, {
            channelId,
            periodType: 'manual',
        });
        await this.maybeNotify(config.notifyUsers, payload, `AI summary ready: ${summary.overview.slice(0, 120)}`, `/dashboard?channel=${encodeURIComponent(channelId)}`);
        return {
            scope: 'channel',
            channelId,
            provider: summary.provider,
            actionItems: summary.actionItems.length,
        };
    }
    async createTasksFromActionItems(workflow, config, payload) {
        const channelId = this.resolveChannelId(config, payload);
        if (!channelId)
            throw new Error('No channel resolved for this action');
        const actingUser = (0, string_utils_1.toDisplayString)(payload.actor) || workflow.createdBy;
        const summary = await this.conversationSummaryService.generate(channelId, actingUser, {
            channelId,
            periodType: 'manual',
        });
        const items = summary.actionItems ?? [];
        const maxItems = config.maxItems ? Number(config.maxItems) : 5;
        const selected = items.slice(0, maxItems);
        const assignee = this.resolveSingleUser(config.assignee, payload);
        const created = [];
        for (const item of selected) {
            const task = await this.tasksService.create(workflow.createdBy, {
                title: item.length > 240 ? `${item.slice(0, 237)}...` : item,
                description: `Created automatically by workflow "${workflow.name}" from conversation action items.`,
                assignee: assignee ?? undefined,
                sourceChannelId: channelId,
            });
            created.push({ id: task.id, title: task.title });
        }
        return { created: created.length, channelId, actionItems: selected.length };
    }
    async archiveDiscussion(config, payload) {
        const channelId = this.resolveChannelId(config, payload);
        if (!channelId)
            throw new Error('No channel resolved for this action');
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        await channel.updatePartial({
            set: {
                frozen: true,
                archived: true,
            },
        });
        return { channelId, archived: true };
    }
    resolveChannelId(config, payload) {
        const raw = (0, string_utils_1.toDisplayString)(config.channelId) || 'source';
        if (raw === 'source') {
            return payload.channelId ? (0, string_utils_1.toDisplayString)(payload.channelId) : null;
        }
        return raw;
    }
    resolveId(configValue, payloadValue) {
        const raw = (0, string_utils_1.toDisplayString)(configValue) || 'source';
        if (raw === 'source') {
            return payloadValue ? (0, string_utils_1.toDisplayString)(payloadValue) : null;
        }
        return raw;
    }
    resolveSingleUser(value, payload) {
        const token = (0, string_utils_1.toDisplayString)(value).trim();
        if (!token)
            return undefined;
        switch (token) {
            case 'assignee':
                return payload.assignee ? (0, string_utils_1.toDisplayString)(payload.assignee) : undefined;
            case 'creator':
                return payload.createdBy
                    ? (0, string_utils_1.toDisplayString)(payload.createdBy)
                    : undefined;
            case 'actor':
                return payload.actor ? (0, string_utils_1.toDisplayString)(payload.actor) : undefined;
            case 'organizer':
                return payload.meetingOrganizer
                    ? (0, string_utils_1.toDisplayString)(payload.meetingOrganizer)
                    : undefined;
            default:
                return token;
        }
    }
    resolveDate(value, payload) {
        if (value == null)
            return null;
        const raw = this.interpolate((0, string_utils_1.toDisplayString)(value), payload).trim();
        if (!raw)
            return null;
        if (raw === 'source') {
            return payload.dueDate ? (0, string_utils_1.toDisplayString)(payload.dueDate) : null;
        }
        if (raw.startsWith('in:')) {
            const days = parseInt(raw.slice(3), 10);
            if (Number.isNaN(days))
                return null;
            return new Date(Date.now() + days * 86_400_000).toISOString();
        }
        return raw;
    }
    async resolveUsers(tokens, payload) {
        const users = [];
        for (const token of tokens) {
            if (!token)
                continue;
            switch (token) {
                case 'assignee':
                    if (payload.assignee)
                        users.push((0, string_utils_1.toDisplayString)(payload.assignee));
                    break;
                case 'creator':
                    if (payload.createdBy)
                        users.push((0, string_utils_1.toDisplayString)(payload.createdBy));
                    break;
                case 'organizer':
                    if (payload.meetingOrganizer) {
                        users.push((0, string_utils_1.toDisplayString)(payload.meetingOrganizer));
                    }
                    break;
                case 'actor':
                    if (payload.actor)
                        users.push((0, string_utils_1.toDisplayString)(payload.actor));
                    break;
                case 'participants':
                    if (Array.isArray(payload.participants)) {
                        users.push(...payload.participants.map((p) => (0, string_utils_1.toDisplayString)(p)));
                    }
                    break;
                case 'members':
                    if (Array.isArray(payload.members)) {
                        users.push(...payload.members.map((m) => (0, string_utils_1.toDisplayString)(m)));
                    }
                    else if (payload.projectId) {
                        const rows = await this.db
                            .select({ userId: projects_schema_1.projectMembers.userId })
                            .from(projects_schema_1.projectMembers)
                            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, (0, string_utils_1.toDisplayString)(payload.projectId)));
                        users.push(...rows.map((r) => r.userId));
                    }
                    break;
                default:
                    users.push(token);
            }
        }
        return Array.from(new Set(users)).filter(Boolean);
    }
    async maybeNotify(notifyUsers, payload, description, actionUrl) {
        const tokens = Array.isArray(notifyUsers)
            ? notifyUsers.map(string_utils_1.toDisplayString)
            : [];
        if (tokens.length === 0)
            return;
        const users = await this.resolveUsers(tokens, payload);
        if (users.length === 0)
            return;
        await this.notificationsService.createMany(users.map((userId) => ({
            userId,
            type: 'workflow',
            title: 'AI summary ready',
            description,
            actionUrl,
        })));
    }
    interpolate(text, payload) {
        return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
            return (0, string_utils_1.toDisplayString)(payload[key]);
        });
    }
};
exports.ActionExecutorService = ActionExecutorService;
exports.ActionExecutorService = ActionExecutorService = ActionExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        notifications_service_1.NotificationsService,
        tasks_service_1.TasksService,
        reminders_service_1.RemindersService,
        project_milestones_service_1.ProjectMilestonesService,
        conversation_summary_service_1.ConversationSummaryService,
        ai_summary_service_1.AiSummaryService])
], ActionExecutorService);
//# sourceMappingURL=action-executor.service.js.map