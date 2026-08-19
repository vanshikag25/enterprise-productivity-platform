import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, inArray, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { tasks } from '../database/schema/tasks.schema';
import { projectMilestones } from '../database/schema/project-milestones.schema';
import { WorkflowEventBus } from './event-bus/event-bus.service';

const SWEEP_INITIAL_DELAY_MS = 30_000;

/**
 * Detects conditions that are time-based rather than event-driven: tasks that
 * passed their due date (task_overdue) and milestones that passed their due
 * date (milestone_delayed). Emits at most one event per entity per UTC day so
 * reminders can re-fire daily while dedup stays effective.
 */
@Injectable()
export class WorkflowSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSweepService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly eventBus: WorkflowEventBus,
  ) {}

  onModuleInit() {
    const intervalMs =
      this.configService.get<number>('automation.taskSweepIntervalMs') ??
      3_600_000;
    this.timer = setInterval(() => {
      void this.sweep().catch((err) =>
        this.logger.error(
          `Automation sweep failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }, intervalMs);

    setTimeout(
      () => void this.sweep().catch(() => undefined),
      SWEEP_INITIAL_DELAY_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep(): Promise<void> {
    const dayKey = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const overdueTasks = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.status, ['Todo', 'In Progress', 'In Review']),
          lt(tasks.dueDate, now),
        ),
      );

    for (const task of overdueTasks) {
      this.eventBus.emit('task_overdue', `task:${task.id}:${dayKey}`, {
        taskId: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        createdBy: task.createdBy,
        channelId: task.streamChannelId,
        dueDate: task.dueDate?.toISOString(),
        projectId: null,
        actor: task.assignee ?? task.createdBy,
      });
    }

    const delayedMilestones = await this.db
      .select()
      .from(projectMilestones)
      .where(
        and(
          inArray(projectMilestones.status, ['planned', 'in_progress']),
          lt(projectMilestones.dueDate, now),
        ),
      );

    for (const milestone of delayedMilestones) {
      this.eventBus.emit(
        'milestone_delayed',
        `milestone:${milestone.id}:${dayKey}`,
        {
          milestoneId: milestone.id,
          title: milestone.title,
          milestoneStatus: milestone.status,
          milestoneProgress: milestone.progress,
          milestoneDueDate: milestone.dueDate?.toISOString(),
          projectId: milestone.projectId,
          channelId: milestone.streamChannelId,
          actor: milestone.ownerId,
        },
      );
    }
  }
}
