import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  auditActionTypeEnum,
  auditEvents,
  type AuditActionType,
  type AuditEvent,
} from '../database/schema/audit-logs.schema';
import { hasMinRole } from '../rbac/roles';
import { getRequestContext } from './request-context';
import type {
  AuditEventDto,
  AuditListParams,
  AuditListResult,
  RecordAuditInput,
} from './audit.types';

type PgTx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

function serialize(event: AuditEvent): AuditEventDto {
  return {
    id: event.id,
    actionType: event.actionType,
    actorId: event.actorId,
    actorRole: event.actorRole,
    actorName: event.actorName,
    targetUserId: event.targetUserId,
    targetUserName: event.targetUserName,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    resourceName: event.resourceName,
    channelId: event.channelId,
    projectId: event.projectId,
    previousValue: event.previousValue,
    newValue: event.newValue,
    reason: event.reason,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    createdAt: event.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  /**
   * Appends a single immutable audit event. When `options.tx` is supplied the
   * insert runs inside that transaction so the audited action and its audit
   * record commit (or roll back) together.
   */
  async record(
    input: RecordAuditInput,
    options?: { tx?: PgTx },
  ): Promise<AuditEvent> {
    const db = options?.tx ?? this.db;
    const meta = getRequestContext();

    const [row] = await db
      .insert(auditEvents)
      .values({
        actionType: input.actionType,
        actorId: input.actorId,
        actorRole: input.actorRole,
        actorName: input.actorName ?? null,
        targetUserId: input.targetUserId ?? null,
        targetUserName: input.targetUserName ?? null,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        resourceName: input.resourceName ?? null,
        channelId: input.channelId ?? null,
        projectId: input.projectId ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        reason: input.reason ?? null,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      })
      .returning();

    return row;
  }

  actionTypes(): AuditActionType[] {
    return auditActionTypeEnum.enumValues;
  }

  async listLogs(
    actor: { role: string },
    params: AuditListParams,
  ): Promise<AuditListResult> {
    // Defense in depth: the controller guard also enforces this.
    if (!hasMinRole(actor.role, 'admin')) {
      throw new ForbiddenException(
        'Only Super Admins and Admins can view audit logs.',
      );
    }

    const conditions: SQL[] = [];

    if (params.actionType) {
      conditions.push(
        eq(auditEvents.actionType, params.actionType as AuditActionType),
      );
    }
    if (params.actorId) {
      conditions.push(eq(auditEvents.actorId, params.actorId));
    }
    if (params.channelId) {
      conditions.push(eq(auditEvents.channelId, params.channelId));
    }
    if (params.search) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(auditEvents.actorName, term),
          ilike(auditEvents.actorId, term),
          ilike(auditEvents.targetUserName, term),
          ilike(auditEvents.targetUserId, term),
          ilike(auditEvents.resourceName, term),
          ilike(auditEvents.resourceId, term),
          ilike(auditEvents.channelId, term),
        ) as SQL,
      );
    }
    if (params.startDate) {
      conditions.push(gte(auditEvents.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(auditEvents.createdAt, new Date(params.endDate)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy =
      params.sort === 'oldest'
        ? asc(auditEvents.createdAt)
        : desc(auditEvents.createdAt);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(auditEvents)
        .where(where)
        .orderBy(orderBy)
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditEvents)
        .where(where),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      items: rows.map(serialize),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  }
}
