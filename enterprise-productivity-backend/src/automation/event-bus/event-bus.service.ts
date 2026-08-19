import { Injectable, Logger } from '@nestjs/common';
import type { WorkflowTriggerType } from '../../database/schema/workflows.schema';
import { automationContext } from '../automation-context';

export interface WorkflowTriggerEvent {
  triggerType: WorkflowTriggerType;
  eventKey: string;
  payload: Record<string, unknown>;
}

type Listener = (event: WorkflowTriggerEvent) => Promise<void> | void;

/**
 * Decoupled pub/sub between feature services (emitters) and the automation
 * engine (listener). Emitting never blocks the caller and listener failures
 * never propagate back to the emitting service.
 */
@Injectable()
export class WorkflowEventBus {
  private readonly logger = new Logger(WorkflowEventBus.name);
  private readonly listeners = new Map<WorkflowTriggerType, Listener[]>();

  subscribe(triggerType: WorkflowTriggerType, listener: Listener): void {
    const listeners = this.listeners.get(triggerType) ?? [];
    listeners.push(listener);
    this.listeners.set(triggerType, listeners);
  }

  emit(
    triggerType: WorkflowTriggerType,
    eventKey: string,
    payload: Record<string, unknown>,
  ): void {
    const listeners = this.listeners.get(triggerType) ?? [];
    if (listeners.length === 0) return;
    for (const listener of listeners) {
      void Promise.resolve(listener({ triggerType, eventKey, payload })).catch(
        (err) =>
          this.logger.error(
            `Workflow event listener failed for ${triggerType} (${eventKey}): ${
              err instanceof Error ? err.message : err
            }`,
          ),
      );
    }
  }

  /**
   * Emits only when the call did NOT originate from the automation engine.
   * Feature services use this so an action performed by a workflow (e.g.
   * creating a task) does not re-trigger the same or other workflows.
   */
  emitExternal(
    triggerType: WorkflowTriggerType,
    eventKey: string,
    payload: Record<string, unknown>,
  ): void {
    if (automationContext.isActive()) return;
    this.emit(triggerType, eventKey, payload);
  }
}
