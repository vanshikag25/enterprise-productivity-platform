import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  entityCreationRequests,
  EntityCreationRequest,
} from '../database/schema/entity-creation-requests.schema';
import { TasksService } from '../tasks/tasks.service';
import { MeetingsService } from '../meetings/meetings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { hasMinRole, ROLE_RANK, UserRole } from '../rbac/roles';
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

@Injectable()
export class CreationRequestsService {
  private readonly logger = new Logger(CreationRequestsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly tasksService: TasksService,
    private readonly meetingsService: MeetingsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // --- Create --------------------------------------------------------------

  /** Any authenticated member can propose a task/meeting creation. */
  async create(
    userId: string,
    dto: CreateCreationRequestDto,
  ): Promise<CreationRequestItem> {
    const title = String(dto.payload.title ?? '').trim();
    if (!title) {
      throw new BadRequestException('Request payload must include a title.');
    }

    const [request] = await this.db
      .insert(entityCreationRequests)
      .values({
        entityType: dto.entityType,
        title: title.slice(0, 512),
        payload: dto.payload,
        createdById: userId,
        sourceChannelId: dto.sourceChannelId ?? null,
        sourceMessageId: dto.sourceMessageId ?? null,
        sourceSenderId: dto.sourceSenderId ?? null,
        sourceChannelName: dto.sourceChannelName ?? null,
        sourceMessageText: dto.sourceMessageText ?? null,
      })
      .returning();

    void this.notifyApprovers(request);
    this.logger.log(
      `Creation request ${request.id} (${request.entityType}) created by ${userId}`,
    );
    return this.toItem(request);
  }

  // --- Listing --------------------------------------------------------------

  /**
   * Team leads see every request so they can approve/reject from the
   * directory; other members only see their own submissions.
   */
  async findAll(
    userId: string,
    entityType?: 'task' | 'meeting',
  ): Promise<CreationRequestItem[]> {
    const user = await this.usersService.findByUsername(userId);
    const isApprover = Boolean(
      user && hasMinRole(user.role, UserRole.TEAM_LEAD),
    );

    const conditions = [
      ...(entityType
        ? [eq(entityCreationRequests.entityType, entityType)]
        : []),
      ...(isApprover
        ? []
        : [eq(entityCreationRequests.createdById, userId)]),
    ];

    const rows = await this.db
      .select()
      .from(entityCreationRequests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(entityCreationRequests.createdAt));

    return rows.map((r) => this.toItem(r));
  }

  async findOne(requestId: string, userId: string): Promise<CreationRequestItem> {
    const request = await this.getRequest(requestId);
    const user = await this.usersService.findByUsername(userId);
    const isApprover = Boolean(
      user && hasMinRole(user.role, UserRole.TEAM_LEAD),
    );
    if (!isApprover && request.createdById !== userId) {
      throw new ForbiddenException('You cannot view this request');
    }
    return this.toItem(request);
  }

  // --- Review ----------------------------------------------------------------

  async approve(
    requestId: string,
    userId: string,
    dto: ReviewCreationRequestDto,
  ): Promise<ReviewResult> {
    const request = await this.getRequest(requestId);
    await this.assertApprover(userId);
    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been reviewed.');
    }

    const entity = await this.createEntity(request);

    const [updated] = await this.db
      .update(entityCreationRequests)
      .set({
        status: 'approved',
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(entityCreationRequests.id, requestId))
      .returning();

    await this.notificationsService.create({
      userId: request.createdById,
      type: 'creation_request_approved',
      title:
        request.entityType === 'meeting'
          ? 'Meeting request approved'
          : 'Task request approved',
      description: `"${request.title}" was approved and created.`,
      actionUrl: request.entityType === 'meeting' ? '/meetings' : '/tasks',
    });

    this.logger.log(
      `Creation request ${requestId} approved by ${userId}; entity ${JSON.stringify(entity)}`,
    );
    return { request: this.toItem(updated), entity };
  }

  async reject(
    requestId: string,
    userId: string,
    dto: ReviewCreationRequestDto,
  ): Promise<CreationRequestItem> {
    const request = await this.getRequest(requestId);
    await this.assertApprover(userId);
    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been reviewed.');
    }

    const [updated] = await this.db
      .update(entityCreationRequests)
      .set({
        status: 'rejected',
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(entityCreationRequests.id, requestId))
      .returning();

    await this.notificationsService.create({
      userId: request.createdById,
      type: 'creation_request_rejected',
      title:
        request.entityType === 'meeting'
          ? 'Meeting request declined'
          : 'Task request declined',
      description: `"${request.title}" was declined.`,
      actionUrl: request.entityType === 'meeting' ? '/meetings' : '/tasks',
    });

    this.logger.log(`Creation request ${requestId} rejected by ${userId}`);
    return this.toItem(updated);
  }

  // --- Entity creation on approval -----------------------------------------

  private async createEntity(
    request: EntityCreationRequest,
  ): Promise<Record<string, unknown>> {
    const payload = request.payload as Record<string, string | string[]>;
    const source = {
      sourceChannelId: request.sourceChannelId ?? undefined,
      sourceMessageId: request.sourceMessageId ?? undefined,
      sourceSenderId: request.sourceSenderId ?? undefined,
      sourceChannelName: request.sourceChannelName ?? undefined,
    };

    if (request.entityType === 'meeting') {
      const participants = Array.isArray(payload.participants)
        ? (payload.participants as string[])
        : [];
      if (!participants.length) {
        throw new BadRequestException(
          'Meeting request payload must include participants.',
        );
      }
      const title = String(payload.title ?? '').trim();
      const scheduledDate = String(payload.scheduledDate ?? '');
      const startTime = String(payload.startTime ?? '');
      const endTime = String(payload.endTime ?? '');
      if (!title || !scheduledDate || !startTime || !endTime) {
        throw new BadRequestException(
          'Meeting request payload is missing required fields.',
        );
      }
      const meeting = await this.meetingsService.create(request.createdById, {
        title,
        description:
          typeof payload.description === 'string' ? payload.description : undefined,
        scheduledDate,
        startTime,
        endTime,
        participants,
        ...source,
      });
      return { type: 'meeting', id: meeting.id, title: meeting.title };
    }

    const title = String(payload.title ?? '').trim();
    if (!title) {
      throw new BadRequestException('Task request payload must include a title.');
    }
    const task = await this.tasksService.create(request.createdById, {
      title,
      description:
        typeof payload.description === 'string' ? payload.description : undefined,
      status: typeof payload.status === 'string' ? payload.status : undefined,
      priority:
        typeof payload.priority === 'string' ? payload.priority : undefined,
      dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : undefined,
      assignee: typeof payload.assignee === 'string' ? payload.assignee : undefined,
      ...source,
    });
    return { type: 'task', id: task.id, title: task.title };
  }

  // --- Helpers ---------------------------------------------------------------

  private async getRequest(requestId: string): Promise<EntityCreationRequest> {
    const [row] = await this.db
      .select()
      .from(entityCreationRequests)
      .where(eq(entityCreationRequests.id, requestId))
      .limit(1);
    if (!row) throw new NotFoundException(`Request ${requestId} not found`);
    return row;
  }

  private async assertApprover(userId: string): Promise<void> {
    const user = await this.usersService.findByUsername(userId);
    const minimum: UserRole = UserRole.TEAM_LEAD;
    if (!user || !hasMinRole(user.role, minimum)) {
      throw new ForbiddenException(
        'Only team leads and above can review creation requests.',
      );
    }
  }

  private async notifyApprovers(request: EntityCreationRequest): Promise<void> {
    try {
      const users = await this.usersService.findAllExcept(request.createdById);
      const approvers = users.filter(
        (u) => ROLE_RANK[u.role] >= ROLE_RANK[UserRole.TEAM_LEAD],
      );
      if (approvers.length === 0) return;
      await this.notificationsService.createMany(
        approvers.map((u) => ({
          userId: u.username,
          type: 'creation_request',
          title:
            request.entityType === 'meeting'
              ? 'Meeting creation request'
              : 'Task creation request',
          description: `"${request.title}" awaits your approval.`,
          actionUrl:
            request.entityType === 'meeting' ? '/meetings' : '/tasks',
        })),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify approvers for ${request.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private toItem(request: EntityCreationRequest): CreationRequestItem {
    return {
      id: request.id,
      entityType: request.entityType,
      status: request.status as CreationRequestStatus,
      title: request.title,
      payload: request.payload,
      createdById: request.createdById,
      sourceChannelId: request.sourceChannelId ?? null,
      sourceMessageId: request.sourceMessageId ?? null,
      sourceSenderId: request.sourceSenderId ?? null,
      sourceChannelName: request.sourceChannelName ?? null,
      sourceMessageText: request.sourceMessageText ?? null,
      reviewedById: request.reviewedById ?? null,
      reviewedAt: request.reviewedAt
        ? request.reviewedAt.toISOString()
        : null,
      reviewNote: request.reviewNote ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}