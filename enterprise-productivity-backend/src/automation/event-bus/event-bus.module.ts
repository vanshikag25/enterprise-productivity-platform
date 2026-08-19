import { Global, Module } from '@nestjs/common';
import { WorkflowEventBus } from './event-bus.service';

/**
 * Global so feature services (tasks, projects, milestones, meetings, users)
 * can inject WorkflowEventBus without importing this module explicitly. It has
 * no dependencies, so it cannot introduce circular module references.
 */
@Global()
@Module({
  providers: [WorkflowEventBus],
  exports: [WorkflowEventBus],
})
export class EventBusModule {}
