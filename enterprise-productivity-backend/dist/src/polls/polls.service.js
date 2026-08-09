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
var PollsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const stream_chat_1 = require("stream-chat");
const drizzle_provider_1 = require("../database/drizzle.provider");
const polls_schema_1 = require("../database/schema/polls.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
const users_service_1 = require("../users/users.service");
const roles_1 = require("../rbac/roles");
const AUTO_CLOSE_INTERVAL_MS = 60_000;
const AUTO_CLOSE_INITIAL_DELAY_MS = 5_000;
let PollsService = PollsService_1 = class PollsService {
    constructor(db, streamService, notificationsService, usersService) {
        this.db = db;
        this.streamService = streamService;
        this.notificationsService = notificationsService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(PollsService_1.name);
        this.autoCloseTimer = null;
    }
    onModuleInit() {
        this.autoCloseTimer = setInterval(() => {
            void this.autoCloseExpired().catch((err) => this.logger.error(`Failed to auto-close expired polls: ${err instanceof Error ? err.message : err}`));
        }, AUTO_CLOSE_INTERVAL_MS);
        setTimeout(() => void this.autoCloseExpired().catch(() => undefined), AUTO_CLOSE_INITIAL_DELAY_MS);
    }
    onModuleDestroy() {
        if (this.autoCloseTimer)
            clearInterval(this.autoCloseTimer);
    }
    client() {
        return this.streamService.getClient();
    }
    pollActionUrl(channelId, messageId) {
        return `/dashboard?channel=${encodeURIComponent(channelId)}&message=${encodeURIComponent(messageId)}`;
    }
    async channelMemberIds(channelId) {
        try {
            const { members } = await this.client()
                .channel('messaging', channelId)
                .queryMembers({}, {}, { limit: 100 });
            return members
                .map((member) => member.user_id)
                .filter((id) => Boolean(id));
        }
        catch (err) {
            this.logger.warn(`Failed to query members for channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            return [];
        }
    }
    async notifyMembers(channelId, excludeUserId, input) {
        const memberIds = (await this.channelMemberIds(channelId)).filter((id) => id !== excludeUserId);
        if (memberIds.length === 0)
            return;
        await this.notificationsService.createMany(memberIds.map((userId) => ({ ...input, userId })));
    }
    async findOneByStreamPollId(streamPollId) {
        const [poll] = await this.db
            .select()
            .from(polls_schema_1.polls)
            .where((0, drizzle_orm_1.eq)(polls_schema_1.polls.streamPollId, streamPollId));
        if (!poll)
            throw new common_1.NotFoundException(`Poll ${streamPollId} not found`);
        return poll;
    }
    async assertCanManage(poll, userId) {
        if (poll.createdBy === userId)
            return;
        const user = await this.usersService.findByUsername(userId);
        if (user && (0, roles_1.hasMinRole)(user.role, 'manager'))
            return;
        throw new common_1.ForbiddenException('Only the poll creator, Manager, or a higher role can manage this poll');
    }
    async computeWinner(streamPollId) {
        try {
            const { poll } = await this.client().getPoll(streamPollId);
            const maxVotes = Math.max(0, ...poll.options.map((option) => option.vote_count ?? 0));
            if (maxVotes === 0)
                return [];
            return poll.options
                .filter((option) => (option.vote_count ?? 0) === maxVotes)
                .map((option) => option.text);
        }
        catch (err) {
            this.logger.warn(`Failed to compute winner for poll ${streamPollId}: ${err instanceof Error ? err.message : err}`);
            return [];
        }
    }
    async create(userId, dto) {
        const question = dto.question.trim();
        const options = Array.from(new Set(dto.options.map((option) => option.trim()).filter(Boolean)));
        if (options.length < 2)
            throw new common_1.BadRequestException('Polls need at least two options');
        const multipleAnswers = Boolean(dto.multipleAnswers);
        const created = await this.client().createPoll({
            name: question,
            options: options.map((text, position) => ({ text, position })),
            voting_visibility: dto.anonymous
                ? stream_chat_1.VotingVisibility.anonymous
                : stream_chat_1.VotingVisibility.public,
            enforce_unique_vote: !multipleAnswers,
            max_votes_allowed: multipleAnswers ? options.length : 1,
            allow_answers: false,
            allow_user_suggested_options: false,
            user_id: userId,
        });
        const streamPollId = created.poll.id;
        const message = await this.client()
            .channel('messaging', dto.channelId)
            .sendMessage({
            text: question,
            user_id: userId,
            poll_id: streamPollId,
        });
        const messageId = message.message.id;
        await this.db
            .insert(polls_schema_1.polls)
            .values({
            streamPollId,
            channelId: dto.channelId,
            messageId,
            question,
            createdBy: userId,
            deadline: dto.deadline ? new Date(dto.deadline) : null,
        })
            .execute();
        await this.notifyMembers(dto.channelId, userId, {
            type: 'poll_created',
            title: 'New poll',
            description: question,
            actionUrl: this.pollActionUrl(dto.channelId, messageId),
        });
        this.logger.log(`Poll ${streamPollId} created in channel ${dto.channelId} by ${userId}`);
        return { streamPollId, messageId };
    }
    async findForChannel(channelId) {
        await this.autoCloseExpired();
        return this.db
            .select()
            .from(polls_schema_1.polls)
            .where((0, drizzle_orm_1.eq)(polls_schema_1.polls.channelId, channelId))
            .orderBy(polls_schema_1.polls.createdAt);
    }
    async resolve(streamPollId) {
        return this.findOneByStreamPollId(streamPollId);
    }
    async update(streamPollId, userId, dto) {
        if (dto.question === undefined && dto.options === undefined)
            throw new common_1.BadRequestException('Nothing to update');
        const poll = await this.findOneByStreamPollId(streamPollId);
        if (poll.createdBy !== userId)
            throw new common_1.ForbiddenException('Only the poll creator can edit this poll');
        if (poll.closedAt)
            throw new common_1.BadRequestException('This poll is already closed');
        const current = await this.client().getPoll(streamPollId);
        if (current.poll.is_closed)
            throw new common_1.BadRequestException('This poll is already closed');
        const totalVotes = current.poll.options.reduce((sum, option) => sum + (option.vote_count ?? 0), 0);
        if (totalVotes > 0)
            throw new common_1.BadRequestException('A poll can only be edited before anyone has voted');
        const question = dto.question?.trim() ?? poll.question;
        const options = dto.options
            ? Array.from(new Set(dto.options.map((option) => option.trim()).filter(Boolean)))
            : undefined;
        if (options && options.length < 2)
            throw new common_1.BadRequestException('Polls need at least two options');
        const set = {};
        if (question !== poll.question)
            set.name = question;
        if (options)
            set.options = options.map((text, position) => ({ text, position }));
        if (Object.keys(set).length > 0) {
            await this.client().partialUpdatePoll(streamPollId, { set }, userId);
        }
        if (set.name) {
            try {
                await this.client().updateMessage({
                    id: poll.messageId,
                    text: question,
                });
            }
            catch (err) {
                this.logger.warn(`Failed to update poll message text: ${err instanceof Error ? err.message : err}`);
            }
        }
        const [updated] = await this.db
            .update(polls_schema_1.polls)
            .set({ question, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(polls_schema_1.polls.id, poll.id))
            .returning();
        return updated;
    }
    async close(streamPollId, userId) {
        const poll = await this.findOneByStreamPollId(streamPollId);
        if (poll.closedAt)
            return poll;
        await this.assertCanManage(poll, userId);
        try {
            await this.client().closePoll(streamPollId, userId);
        }
        catch (err) {
            this.logger.warn(`Failed to close poll ${streamPollId} in Stream: ${err instanceof Error ? err.message : err}`);
        }
        return this.finalize(streamPollId);
    }
    async finalize(streamPollId) {
        const poll = await this.findOneByStreamPollId(streamPollId);
        if (poll.closedAt)
            return poll;
        const winnerTexts = await this.computeWinner(streamPollId);
        const closedAt = new Date();
        const [updated] = await this.db
            .update(polls_schema_1.polls)
            .set({ closedAt, updatedAt: closedAt })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(polls_schema_1.polls.id, poll.id), (0, drizzle_orm_1.isNull)(polls_schema_1.polls.closedAt)))
            .returning();
        if (!updated)
            return poll;
        const base = {
            description: poll.question,
            actionUrl: this.pollActionUrl(poll.channelId, poll.messageId),
        };
        await this.notifyMembers(poll.channelId, '', {
            type: 'poll_closed',
            title: 'Poll closed',
            ...base,
        });
        if (winnerTexts.length > 0) {
            const winnerLabel = winnerTexts.length === 1 ? winnerTexts[0] : winnerTexts.join(', ');
            await this.notifyMembers(poll.channelId, '', {
                type: 'poll_winner',
                title: `Winner: ${winnerLabel}`,
                ...base,
            });
        }
        this.logger.log(`Poll ${streamPollId} finalized`);
        return this.findOneByStreamPollId(streamPollId);
    }
    async remove(streamPollId, userId) {
        const poll = await this.findOneByStreamPollId(streamPollId);
        await this.assertCanManage(poll, userId);
        try {
            await this.client().deletePoll(streamPollId, userId);
        }
        catch (err) {
            this.logger.warn(`Failed to delete poll ${streamPollId} in Stream: ${err instanceof Error ? err.message : err}`);
        }
        try {
            await this.client().deleteMessage(poll.messageId, true);
        }
        catch (err) {
            this.logger.warn(`Failed to delete poll message ${poll.messageId}: ${err instanceof Error ? err.message : err}`);
        }
        await this.db.delete(polls_schema_1.polls).where((0, drizzle_orm_1.eq)(polls_schema_1.polls.id, poll.id)).execute();
        this.logger.log(`Poll ${streamPollId} deleted by ${userId}`);
    }
    async autoCloseExpired() {
        const due = await this.db
            .select()
            .from(polls_schema_1.polls)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(polls_schema_1.polls.closedAt), (0, drizzle_orm_1.lt)(polls_schema_1.polls.deadline, new Date())))
            .execute();
        for (const poll of due) {
            try {
                await this.client().closePoll(poll.streamPollId);
            }
            catch (err) {
                this.logger.warn(`Auto-close failed for poll ${poll.streamPollId}: ${err instanceof Error ? err.message : err}`);
            }
            await this.finalize(poll.streamPollId);
        }
        if (due.length > 0) {
            this.logger.log(`Auto-closed ${due.length} expired poll(s).`);
        }
    }
};
exports.PollsService = PollsService;
exports.PollsService = PollsService = PollsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        notifications_service_1.NotificationsService,
        users_service_1.UsersService])
], PollsService);
//# sourceMappingURL=polls.service.js.map