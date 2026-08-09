import type { AuthObject } from '../auth/auth-object';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
export declare class PollsController {
    private readonly pollsService;
    constructor(pollsService: PollsService);
    create(auth: AuthObject, dto: CreatePollDto): Promise<{
        streamPollId: string;
        messageId: string;
    }>;
    findForChannel(channelId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string;
        createdBy: string;
        messageId: string;
        streamPollId: string;
        question: string;
        deadline: Date | null;
        closedAt: Date | null;
    }[]>;
    resolve(streamPollId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string;
        createdBy: string;
        messageId: string;
        streamPollId: string;
        question: string;
        deadline: Date | null;
        closedAt: Date | null;
    }>;
    update(auth: AuthObject, streamPollId: string, dto: UpdatePollDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string;
        createdBy: string;
        messageId: string;
        streamPollId: string;
        question: string;
        deadline: Date | null;
        closedAt: Date | null;
    }>;
    close(auth: AuthObject, streamPollId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string;
        createdBy: string;
        messageId: string;
        streamPollId: string;
        question: string;
        deadline: Date | null;
        closedAt: Date | null;
    }>;
    finalize(streamPollId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        channelId: string;
        createdBy: string;
        messageId: string;
        streamPollId: string;
        question: string;
        deadline: Date | null;
        closedAt: Date | null;
    }>;
    remove(auth: AuthObject, streamPollId: string): Promise<void>;
}
