import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import type { WorkflowCondition } from '../database/schema/workflows.schema';
import { UsersService } from '../users/users.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { toDisplayString } from './string-utils';

/**
 * Evaluates a workflow's IF conditions against the trigger payload. Conditions
 * are ANDed: every condition must pass for the workflow to run.
 */
@Injectable()
export class ConditionEvaluatorService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
    private readonly access: ProjectAccessService,
  ) {}

  async evaluate(
    conditions: WorkflowCondition[],
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true;
    const ctx = await this.buildContext(payload);
    return conditions.every((condition) => this.evaluateOne(condition, ctx));
  }

  private async buildContext(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const ctx: Record<string, unknown> = { ...payload };

    if (payload.priority != null) ctx.taskPriority = payload.priority;
    if (payload.status != null) ctx.taskStatus = payload.status;

    const actor = payload.actor ? toDisplayString(payload.actor) : null;
    if (actor) {
      const user = await this.usersService.findByUsername(actor);
      if (user) {
        ctx.actorRole = user.role;
      }
      if (payload.projectId && typeof payload.projectId === 'string') {
        ctx.projectRole = await this.access.memberRole(
          payload.projectId,
          actor,
        );
      }
    }

    if (payload.userId && typeof payload.userId === 'string') {
      const user = await this.usersService.findByUsername(payload.userId);
      if (user) ctx.userRole = user.role;
    }

    return ctx;
  }

  private evaluateOne(
    condition: WorkflowCondition,
    ctx: Record<string, unknown>,
  ): boolean {
    const raw = ctx[condition.field];
    switch (condition.operator) {
      case 'eq':
        return this.eq(raw, condition.value);
      case 'neq':
        return !this.eq(raw, condition.value);
      case 'in': {
        const values = Array.isArray(condition.value)
          ? condition.value
          : [condition.value];
        return values.some((v) => this.eq(raw, v));
      }
      case 'contains':
        if (typeof raw !== 'string') return false;
        return raw
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      case 'withinDays': {
        if (raw == null) return false;
        const due = new Date(raw as string | Date).getTime();
        if (Number.isNaN(due)) return false;
        const days = Number(condition.value);
        if (Number.isNaN(days)) return false;
        const now = Date.now();
        const horizon = now + days * 86_400_000;
        return due >= now && due <= horizon;
      }
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        return this.compare(raw, condition.value, condition.operator);
      default:
        return false;
    }
  }

  private eq(raw: unknown, value: unknown): boolean {
    if (raw == null) return false;
    if (value == null) return false;
    if (
      typeof raw === 'number' ||
      typeof raw === 'boolean' ||
      typeof value === 'number'
    ) {
      return Number(raw) === Number(value);
    }
    return (
      toDisplayString(raw).toLowerCase() ===
      toDisplayString(value).toLowerCase()
    );
  }

  private compare(
    raw: unknown,
    value: unknown,
    op: 'gt' | 'gte' | 'lt' | 'lte',
  ): boolean {
    if (raw == null || value == null) return false;

    const rawNum = Number(raw);
    const valueNum = Number(value);
    if (!Number.isNaN(rawNum) && !Number.isNaN(valueNum)) {
      switch (op) {
        case 'gt':
          return rawNum > valueNum;
        case 'gte':
          return rawNum >= valueNum;
        case 'lt':
          return rawNum < valueNum;
        case 'lte':
          return rawNum <= valueNum;
      }
    }

    const rawDate = new Date(raw as string | Date).getTime();
    const valueDate = new Date(value as string | Date).getTime();
    if (!Number.isNaN(rawDate) && !Number.isNaN(valueDate)) {
      switch (op) {
        case 'gt':
          return rawDate > valueDate;
        case 'gte':
          return rawDate >= valueDate;
        case 'lt':
          return rawDate < valueDate;
        case 'lte':
          return rawDate <= valueDate;
      }
    }

    const a = toDisplayString(raw);
    const b = toDisplayString(value);
    switch (op) {
      case 'gt':
        return a > b;
      case 'gte':
        return a >= b;
      case 'lt':
        return a < b;
      case 'lte':
        return a <= b;
    }
  }
}
