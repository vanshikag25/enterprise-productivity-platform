import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { projectMembers } from '../database/schema/projects.schema';
import type {
  Workflow,
  WorkflowAction,
  WorkflowActionResult,
} from '../database/schema/workflows.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';
import { RemindersService } from '../reminders/reminders.service';
import { ProjectMilestonesService } from '../project-milestones/project-milestones.service';
import { ConversationSummaryService } from '../conversation-summary/conversation-summary.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { automationContext } from './automation-context';
import { toDisplayString } from './string-utils';

/**
 * Executes the THEN actions of a workflow. Each action runs inside an
 * automation context (so its side effects do not re-trigger workflows) and
 * failures are isolated per action: one failing action is recorded in the
 * execution's actionResults without aborting the remaining actions.
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
    private readonly remindersService: RemindersService,
    private readonly milestonesService: ProjectMilestonesService,
    private readonly conversationSummaryService: ConversationSummaryService,
    private readonly aiSummaryService: AiSummaryService,
  ) {}

  async executeAll(
    workflow: Workflow,
    payload: Record<string, unknown>,
  ): Promise<WorkflowActionResult[]> {
    const results: WorkflowActionResult[] = [];
    for (const action of workflow.actions ?? []) {
      try {
        const detail = await automationContext.run(() =>
          this.runAction(workflow, action, payload),
        );
        results.push({ type: action.type, ok: true, detail });
      } catch (err) {
        results.push({
          type: action.type,
          ok: false,
          error: err instanceof Error ? err.message : toDisplayString(err),
        });
      }
    }
    return results;
  }

  private async runAction(
    workflow: Workflow,
    action: WorkflowAction,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
        return this.createTasksFromActionItems(
          workflow,
          action.config,
          payload,
        );
      case 'archiveDiscussion':
        return this.archiveDiscussion(action.config, payload);
      default:
        throw new Error(
          `Unsupported action type: ${toDisplayString(action.type)}`,
        );
    }
  }

  // --- notify ---------------------------------------------------------------

  private async notify(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rawUsers = Array.isArray(config.users)
      ? config.users.map((u) => toDisplayString(u))
      : [toDisplayString(config.users)];
    const recipients = await this.resolveUsers(rawUsers, payload);
    const title = this.interpolate(
      toDisplayString(config.title) || 'Notification',
      payload,
    );
    const description =
      config.description != null
        ? this.interpolate(toDisplayString(config.description), payload)
        : undefined;
    const actionUrl =
      config.actionUrl != null
        ? this.interpolate(toDisplayString(config.actionUrl), payload)
        : undefined;

    if (recipients.length === 0) return { recipients: 0, title };
    await this.notificationsService.createMany(
      recipients.map((userId) => ({
        userId,
        type: 'workflow',
        title,
        description,
        actionUrl,
      })),
    );
    return { recipients: recipients.length, title };
  }

  // --- chatMessage ------------------------------------------------------------

  private async chatMessage(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const channelId = this.resolveChannelId(config, payload);
    if (!channelId) throw new Error('No channel resolved for this action');
    const text = this.interpolate(toDisplayString(config.text), payload);
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

  // --- createTask --------------------------------------------------------------

  private async createTask(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const title = this.interpolate(toDisplayString(config.title), payload);
    if (!title) throw new Error('createTask requires a title');
    const assignee = this.resolveSingleUser(config.assignee, payload);
    const dueDate = this.resolveDate(config.dueDate, payload);

    const task = await this.tasksService.create(workflow.createdBy, {
      title,
      description:
        config.description != null
          ? this.interpolate(toDisplayString(config.description), payload)
          : undefined,
      priority:
        config.priority != null ? toDisplayString(config.priority) : undefined,
      dueDate: dueDate ?? undefined,
      assignee: assignee ?? undefined,
    });
    return { taskId: task.id, title: task.title };
  }

  // --- createReminder -----------------------------------------------------------

  private async createReminder(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const title = this.interpolate(toDisplayString(config.title), payload);
    if (!title) throw new Error('createReminder requires a title');
    const scheduledFor = this.resolveDate(config.scheduledFor, payload);
    if (!scheduledFor) throw new Error('createReminder requires scheduledFor');
    const user =
      this.resolveSingleUser(config.userId, payload) ?? workflow.createdBy;

    const reminder = await this.remindersService.create(user, {
      title,
      scheduledFor,
      priority:
        config.priority != null ? toDisplayString(config.priority) : undefined,
      notes:
        config.notes != null
          ? this.interpolate(toDisplayString(config.notes), payload)
          : undefined,
    });
    return { reminderId: reminder.id, userId: user, title };
  }

  // --- updateTaskStatus ---------------------------------------------------------

  private async updateTaskStatus(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rawTaskId = toDisplayString(config.taskId) || 'source';
    const taskId =
      rawTaskId === 'source'
        ? payload.taskId
          ? toDisplayString(payload.taskId)
          : null
        : rawTaskId;
    if (!taskId) throw new Error('No task resolved for this action');
    const status = toDisplayString(config.status);
    if (!status) throw new Error('updateTaskStatus requires a status');

    const task = await this.tasksService.findOne(taskId);
    const actingUser =
      [toDisplayString(payload.actor), workflow.createdBy, task.createdBy].find(
        (u) => u === task.createdBy || u === task.assignee,
      ) ?? task.createdBy;

    const updated = await this.tasksService.updateStatus(
      taskId,
      actingUser,
      status,
    );
    return { taskId, status: updated.status };
  }

  // --- updateMilestoneStatus ------------------------------------------------------

  private async updateMilestoneStatus(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const projectId = this.resolveId(config.projectId, payload.projectId);
    if (!projectId) throw new Error('No project resolved for this action');
    const milestoneId = this.resolveId(config.milestoneId, payload.milestoneId);
    if (!milestoneId) throw new Error('No milestone resolved for this action');
    const status = toDisplayString(config.status);
    if (!status) throw new Error('updateMilestoneStatus requires a status');

    const actingUser = toDisplayString(payload.actor) || workflow.createdBy;
    const updated = await this.milestonesService.updateStatus(
      projectId,
      actingUser,
      milestoneId,
      status,
    );
    return { milestoneId, status: updated.status };
  }

  // --- aiSummary ------------------------------------------------------------------

  private async aiSummary(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const actingUser = toDisplayString(payload.actor) || workflow.createdBy;
    const scope = toDisplayString(config.scope) || 'channel';

    if (scope === 'project') {
      const projectId = this.resolveId(config.projectId, payload.projectId);
      if (!projectId) throw new Error('No project resolved for this action');
      const result = await this.aiSummaryService.generate(
        projectId,
        actingUser,
      );
      await this.maybeNotify(
        config.notifyUsers,
        payload,
        `AI summary ready: ${result.overview.slice(0, 120)}`,
        `/projects/${projectId}`,
      );
      return {
        scope,
        projectId,
        provider: result.provider,
        actionItems: result.actionItems.length,
      };
    }

    const channelId = this.resolveChannelId(config, payload);
    if (!channelId) throw new Error('No channel resolved for this action');
    const summary = await this.conversationSummaryService.generate(
      channelId,
      actingUser,
      {
        channelId,
        periodType: 'manual',
      },
    );
    await this.maybeNotify(
      config.notifyUsers,
      payload,
      `AI summary ready: ${summary.overview.slice(0, 120)}`,
      `/dashboard?channel=${encodeURIComponent(channelId)}`,
    );
    return {
      scope: 'channel',
      channelId,
      provider: summary.provider,
      actionItems: summary.actionItems.length,
    };
  }

  // --- createTasksFromActionItems ---------------------------------------------------

  private async createTasksFromActionItems(
    workflow: Workflow,
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const channelId = this.resolveChannelId(config, payload);
    if (!channelId) throw new Error('No channel resolved for this action');
    const actingUser = toDisplayString(payload.actor) || workflow.createdBy;
    const summary = await this.conversationSummaryService.generate(
      channelId,
      actingUser,
      {
        channelId,
        periodType: 'manual',
      },
    );
    const items = summary.actionItems ?? [];
    const maxItems = config.maxItems ? Number(config.maxItems) : 5;
    const selected = items.slice(0, maxItems);
    const assignee = this.resolveSingleUser(config.assignee, payload);

    const created: { id: string; title: string }[] = [];
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

  // --- archiveDiscussion ------------------------------------------------------------

  private async archiveDiscussion(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const channelId = this.resolveChannelId(config, payload);
    if (!channelId) throw new Error('No channel resolved for this action');
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    await channel.updatePartial({
      set: {
        frozen: true,
        archived: true,
      } as unknown as Parameters<typeof channel.updatePartial>[0]['set'],
    });
    return { channelId, archived: true };
  }

  // --- shared helpers ---------------------------------------------------------------

  private resolveChannelId(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): string | null {
    const raw = toDisplayString(config.channelId) || 'source';
    if (raw === 'source') {
      return payload.channelId ? toDisplayString(payload.channelId) : null;
    }
    return raw;
  }

  private resolveId(
    configValue: unknown,
    payloadValue: unknown,
  ): string | null {
    const raw = toDisplayString(configValue) || 'source';
    if (raw === 'source') {
      return payloadValue ? toDisplayString(payloadValue) : null;
    }
    return raw;
  }

  private resolveSingleUser(
    value: unknown,
    payload: Record<string, unknown>,
  ): string | null | undefined {
    const token = toDisplayString(value).trim();
    if (!token) return undefined;
    switch (token) {
      case 'assignee':
        return payload.assignee ? toDisplayString(payload.assignee) : undefined;
      case 'creator':
        return payload.createdBy
          ? toDisplayString(payload.createdBy)
          : undefined;
      case 'actor':
        return payload.actor ? toDisplayString(payload.actor) : undefined;
      case 'organizer':
        return payload.meetingOrganizer
          ? toDisplayString(payload.meetingOrganizer)
          : undefined;
      default:
        return token;
    }
  }

  private resolveDate(
    value: unknown,
    payload: Record<string, unknown>,
  ): string | null {
    if (value == null) return null;
    const raw = this.interpolate(toDisplayString(value), payload).trim();
    if (!raw) return null;
    if (raw === 'source') {
      return payload.dueDate ? toDisplayString(payload.dueDate) : null;
    }
    if (raw.startsWith('in:')) {
      const days = parseInt(raw.slice(3), 10);
      if (Number.isNaN(days)) return null;
      return new Date(Date.now() + days * 86_400_000).toISOString();
    }
    return raw;
  }

  private async resolveUsers(
    tokens: string[],
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const users: string[] = [];
    for (const token of tokens) {
      if (!token) continue;
      switch (token) {
        case 'assignee':
          if (payload.assignee) users.push(toDisplayString(payload.assignee));
          break;
        case 'creator':
          if (payload.createdBy) users.push(toDisplayString(payload.createdBy));
          break;
        case 'organizer':
          if (payload.meetingOrganizer) {
            users.push(toDisplayString(payload.meetingOrganizer));
          }
          break;
        case 'actor':
          if (payload.actor) users.push(toDisplayString(payload.actor));
          break;
        case 'participants':
          if (Array.isArray(payload.participants)) {
            users.push(...payload.participants.map((p) => toDisplayString(p)));
          }
          break;
        case 'members':
          if (Array.isArray(payload.members)) {
            users.push(...payload.members.map((m) => toDisplayString(m)));
          } else if (payload.projectId) {
            const rows = await this.db
              .select({ userId: projectMembers.userId })
              .from(projectMembers)
              .where(
                eq(
                  projectMembers.projectId,
                  toDisplayString(payload.projectId),
                ),
              );
            users.push(...rows.map((r) => r.userId));
          }
          break;
        default:
          users.push(token);
      }
    }
    return Array.from(new Set(users)).filter(Boolean);
  }

  private async maybeNotify(
    notifyUsers: unknown,
    payload: Record<string, unknown>,
    description: string,
    actionUrl: string,
  ): Promise<void> {
    const tokens = Array.isArray(notifyUsers)
      ? notifyUsers.map(toDisplayString)
      : [];
    if (tokens.length === 0) return;
    const users = await this.resolveUsers(tokens, payload);
    if (users.length === 0) return;
    await this.notificationsService.createMany(
      users.map((userId) => ({
        userId,
        type: 'workflow',
        title: 'AI summary ready',
        description,
        actionUrl,
      })),
    );
  }

  private interpolate(text: string, payload: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      return toDisplayString(payload[key]);
    });
  }
}
