import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { workflowExecutions } from '../database/schema/workflows.schema';
import { AutomationService } from './automation.service';

/**
 * In-process FIFO execution queue with bounded retry with exponential backoff.
 * Runs one execution at a time to avoid stampeding the database, and re-queues
 * executions left in pending/retried state after a restart.
 */
@Injectable()
export class WorkflowQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowQueueService.name);
  private readonly queue: string[] = [];
  private processing = false;
  private readonly retryTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly automationService: AutomationService,
  ) {}

  onModuleInit() {
    void this.recoverPending().catch((err) =>
      this.logger.error(`Failed to recover pending executions: ${err}`),
    );
  }

  onModuleDestroy() {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
  }

  enqueue(executionId: string): void {
    this.queue.push(executionId);
    void this.process();
  }

  private scheduleRetry(executionId: string, retryCount: number): void {
    const base =
      this.configService.get<number>('automation.retryBackoffMs') ?? 5_000;
    const delay = base * 2 ** (retryCount - 1);
    this.logger.warn(
      `Execution ${executionId} will be retried (attempt ${retryCount}) in ${delay}ms`,
    );
    const timer = setTimeout(() => {
      this.retryTimers.delete(executionId);
      this.enqueue(executionId);
    }, delay);
    this.retryTimers.set(executionId, timer);
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const executionId = this.queue.shift();
        if (!executionId) continue;
        try {
          const result =
            await this.automationService.executeExecution(executionId);
          if (result?.status === 'retried') {
            this.scheduleRetry(executionId, result.retryCount);
          }
        } catch (err) {
          this.logger.error(
            `Execution ${executionId} crashed: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async recoverPending(): Promise<void> {
    const rows = await this.db
      .select({ id: workflowExecutions.id })
      .from(workflowExecutions)
      .where(inArray(workflowExecutions.status, ['pending', 'retried']))
      .limit(200);
    for (const row of rows) {
      this.enqueue(row.id);
    }
    if (rows.length > 0) {
      this.logger.log(`Re-queued ${rows.length} pending workflow executions.`);
    }
  }
}
