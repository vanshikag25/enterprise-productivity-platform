import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  automationWorkflows,
  workflowExecutions,
  workflowTriggerTypeEnum,
  type Workflow,
} from '../database/schema/workflows.schema';
import {
  WorkflowEventBus,
  WorkflowTriggerEvent,
} from './event-bus/event-bus.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowQueueService } from './queue.service';
import { toDisplayString } from './string-utils';

/**
 * Subscribes to all workflow trigger events, matches them against enabled
 * workflows of the same trigger type, evaluates IF conditions, and records one
 * execution per (workflow, eventKey). The unique index on (workflowId,
 * eventKey) makes re-emitted events a no-op (dedup).
 */
@Injectable()
export class WorkflowTriggerProcessor implements OnModuleInit {
  private readonly logger = new Logger(WorkflowTriggerProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly eventBus: WorkflowEventBus,
    private readonly queue: WorkflowQueueService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  onModuleInit() {
    for (const triggerType of workflowTriggerTypeEnum.enumValues) {
      this.eventBus.subscribe(
        triggerType,
        (event) =>
          void this.handle(event).catch((err) =>
            this.logger.error(
              `Failed to process ${triggerType} event: ${
                err instanceof Error ? err.message : err
              }`,
            ),
          ),
      );
    }
  }

  private async handle(event: WorkflowTriggerEvent): Promise<void> {
    const workflows = await this.db
      .select()
      .from(automationWorkflows)
      .where(
        and(
          eq(automationWorkflows.triggerType, event.triggerType),
          eq(automationWorkflows.enabled, true),
        ),
      );

    for (const workflow of workflows) {
      try {
        if (!this.matchesConfig(workflow, event)) continue;
        const conditionsMatch = await this.conditionEvaluator.evaluate(
          workflow.conditions,
          event.payload,
        );
        if (!conditionsMatch) continue;

        const [row] = await this.db
          .insert(workflowExecutions)
          .values({
            workflowId: workflow.id,
            triggerType: event.triggerType,
            eventKey: event.eventKey,
            triggerData: event.payload,
          })
          .onConflictDoNothing({
            target: [
              workflowExecutions.workflowId,
              workflowExecutions.eventKey,
            ],
          })
          .returning();

        if (!row) continue;
        this.queue.enqueue(row.id);
      } catch (err) {
        this.logger.warn(
          `Workflow ${workflow.id} skipped for event ${event.eventKey}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  /**
   * Trigger config is an AND of equality filters over top-level payload fields
   * (e.g. { projectId, channelId, assignee, status, priority, role,
   * mentionUser }). Empty values mean "any".
   */
  private matchesConfig(
    workflow: Workflow,
    event: WorkflowTriggerEvent,
  ): boolean {
    const config = workflow.triggerConfig ?? {};
    for (const key of Object.keys(config)) {
      const expected = config[key];
      if (expected === null || expected === undefined || expected === '') {
        continue;
      }
      const actual = event.payload[key];
      if (toDisplayString(actual) !== toDisplayString(expected)) return false;
    }
    return true;
  }
}
