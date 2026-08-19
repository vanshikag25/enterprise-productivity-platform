import { Module } from '@nestjs/common';
import { EventBusModule } from './event-bus/event-bus.module';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { StreamModule } from '../stream/stream.module';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersModule } from '../reminders/reminders.module';
import { ProjectMilestonesModule } from '../project-milestones/project-milestones.module';
import { ConversationSummaryModule } from '../conversation-summary/conversation-summary.module';
import { AiSummaryModule } from '../ai-summary/ai-summary.module';
import { ProjectsModule } from '../projects/projects.module';
import { AutomationService } from './automation.service';
import { WorkflowQueueService } from './queue.service';
import { WorkflowTriggerProcessor } from './trigger-processor.service';
import { WorkflowSweepService } from './sweep.service';
import { MessagePollerService } from './message-poller.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ActionExecutorService } from './action-executor.service';
import { WorkflowsController } from './workflows.controller';

/**
 * Automation workflow engine. The EventBusModule (global) provides the
 * decoupled trigger pub/sub; this module subscribes to it, evaluates
 * conditions, records deduplicated executions and runs THEN actions on the
 * in-process queue.
 */
@Module({
  imports: [
    EventBusModule,
    DatabaseModule,
    UsersModule,
    StreamModule,
    TasksModule,
    NotificationsModule,
    RemindersModule,
    ProjectMilestonesModule,
    ConversationSummaryModule,
    AiSummaryModule,
    ProjectsModule,
  ],
  providers: [
    AutomationService,
    WorkflowQueueService,
    WorkflowTriggerProcessor,
    WorkflowSweepService,
    MessagePollerService,
    ConditionEvaluatorService,
    ActionExecutorService,
  ],
  controllers: [WorkflowsController],
  exports: [AutomationService],
})
export class AutomationModule {}
