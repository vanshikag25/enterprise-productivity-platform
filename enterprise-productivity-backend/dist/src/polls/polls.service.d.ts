import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Poll } from '../database/schema/polls.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
export declare class PollsService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    private readonly streamService;
    private readonly notificationsService;
    private readonly usersService;
    private readonly logger;
    private autoCloseTimer;
    constructor(db: NodePgDatabase, streamService: StreamService, notificationsService: NotificationsService, usersService: UsersService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private client;
    private pollActionUrl;
    private channelMemberIds;
    private notifyMembers;
    private findOneByStreamPollId;
    private assertCanManage;
    private computeWinner;
    create(userId: string, dto: CreatePollDto): Promise<{
        streamPollId: string;
        messageId: string;
    }>;
    findForChannel(channelId: string): Promise<Poll[]>;
    resolve(streamPollId: string): Promise<Poll>;
    update(streamPollId: string, userId: string, dto: UpdatePollDto): Promise<Poll>;
    close(streamPollId: string, userId: string): Promise<Poll>;
    finalize(streamPollId: string): Promise<Poll>;
    remove(streamPollId: string, userId: string): Promise<void>;
    autoCloseExpired(): Promise<void>;
}
