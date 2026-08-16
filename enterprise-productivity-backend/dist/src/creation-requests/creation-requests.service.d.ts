import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TasksService } from '../tasks/tasks.service';
import { MeetingsService } from '../meetings/meetings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreateCreationRequestDto } from './dto/create-creation-request.dto';
import { ReviewCreationRequestDto } from './dto/review-creation-request.dto';
export type CreationRequestStatus = 'pending' | 'approved' | 'rejected';
export interface CreationRequestItem {
    id: string;
    entityType: 'task' | 'meeting';
    status: CreationRequestStatus;
    title: string;
    payload: Record<string, unknown>;
    createdById: string;
    sourceChannelId: string | null;
    sourceMessageId: string | null;
    sourceSenderId: string | null;
    sourceChannelName: string | null;
    sourceMessageText: string | null;
    reviewedById: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ReviewResult {
    request: CreationRequestItem;
    entity: Record<string, unknown> | null;
}
export declare class CreationRequestsService {
    private readonly db;
    private readonly tasksService;
    private readonly meetingsService;
    private readonly notificationsService;
    private readonly usersService;
    private readonly logger;
    constructor(db: NodePgDatabase, tasksService: TasksService, meetingsService: MeetingsService, notificationsService: NotificationsService, usersService: UsersService);
    create(userId: string, dto: CreateCreationRequestDto): Promise<CreationRequestItem>;
    findAll(userId: string, entityType?: 'task' | 'meeting'): Promise<CreationRequestItem[]>;
    findOne(requestId: string, userId: string): Promise<CreationRequestItem>;
    approve(requestId: string, userId: string, dto: ReviewCreationRequestDto): Promise<ReviewResult>;
    reject(requestId: string, userId: string, dto: ReviewCreationRequestDto): Promise<CreationRequestItem>;
    private createEntity;
    private getRequest;
    private assertApprover;
    private notifyApprovers;
    private toItem;
}
