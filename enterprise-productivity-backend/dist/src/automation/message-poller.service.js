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
var MessagePollerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePollerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const workflows_schema_1 = require("../database/schema/workflows.schema");
const stream_service_1 = require("../stream/stream.service");
const event_bus_service_1 = require("./event-bus/event-bus.service");
const string_utils_1 = require("./string-utils");
const MESSAGE_POLL_INITIAL_DELAY_MS = 15_000;
let MessagePollerService = MessagePollerService_1 = class MessagePollerService {
    constructor(db, configService, streamService, eventBus) {
        this.db = db;
        this.configService = configService;
        this.streamService = streamService;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(MessagePollerService_1.name);
        this.timer = null;
        this.cursors = new Map();
        this.seeded = false;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('automation.messagePollIntervalMs') ??
            30_000;
        this.timer = setInterval(() => {
            void this.poll().catch((err) => this.logger.error(`Message poll failed: ${err instanceof Error ? err.message : err}`));
        }, intervalMs);
        setTimeout(() => void this.poll().catch(() => undefined), MESSAGE_POLL_INITIAL_DELAY_MS);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async poll() {
        const workflows = await this.db
            .select()
            .from(workflows_schema_1.automationWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.enabled, true), (0, drizzle_orm_1.inArray)(workflows_schema_1.automationWorkflows.triggerType, [
            'message_received',
            'mention_received',
        ])));
        if (workflows.length === 0)
            return;
        const channelIds = new Set();
        const mentionUsers = new Set();
        let watchAll = false;
        for (const workflow of workflows) {
            const config = workflow.triggerConfig ?? {};
            if (config.channelId) {
                channelIds.add((0, string_utils_1.toDisplayString)(config.channelId));
            }
            else {
                watchAll = true;
            }
            if (config.mentionUser)
                mentionUsers.add((0, string_utils_1.toDisplayString)(config.mentionUser));
        }
        let channels;
        if (watchAll) {
            channels = await this.allChannelIds();
        }
        else {
            channels = Array.from(channelIds);
        }
        for (const channelId of channels) {
            try {
                await this.pollChannel(channelId, mentionUsers);
            }
            catch (err) {
                this.logger.warn(`Message poll skipped channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    async allChannelIds() {
        try {
            const channels = await this.streamService
                .getClient()
                .queryChannels({ type: 'messaging' }, { last_message_at: -1 }, { limit: 200 });
            return channels
                .map((channel) => channel.id)
                .filter((id) => Boolean(id));
        }
        catch (err) {
            this.logger.warn(`Failed to list channels for message polling: ${err}`);
            return [];
        }
    }
    async pollChannel(channelId, mentionUsers) {
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        const { messages } = await channel.query({ messages: { limit: 50 } });
        const regular = messages
            .filter((m) => !m.type || m.type === 'regular')
            .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
        const cursor = this.cursors.get(channelId);
        if (!cursor && !this.seeded) {
            const last = regular[regular.length - 1];
            if (last?.id)
                this.cursors.set(channelId, last.id);
            return;
        }
        this.seeded = true;
        const startIdx = cursor
            ? (() => {
                const idx = regular.findIndex((m) => m.id === cursor);
                return idx === -1 ? 0 : idx + 1;
            })()
            : 0;
        for (const message of regular.slice(startIdx)) {
            if (!message.id)
                continue;
            const text = message.text ?? '';
            const actor = message.user?.id ?? 'unknown';
            const payload = {
                messageId: message.id,
                messageText: text,
                channelId,
                actor,
                title: '',
            };
            this.eventBus.emit('message_received', `message:${message.id}`, payload);
            if (mentionUsers.size > 0) {
                const mentioned = Array.from(mentionUsers).find((user) => user && text.toLowerCase().includes(`@${user.toLowerCase()}`));
                if (mentioned) {
                    this.eventBus.emit('mention_received', `message:${message.id}`, {
                        ...payload,
                        mentionUser: mentioned,
                    });
                }
            }
            this.cursors.set(channelId, message.id);
        }
    }
};
exports.MessagePollerService = MessagePollerService;
exports.MessagePollerService = MessagePollerService = MessagePollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        config_1.ConfigService,
        stream_service_1.StreamService,
        event_bus_service_1.WorkflowEventBus])
], MessagePollerService);
//# sourceMappingURL=message-poller.service.js.map