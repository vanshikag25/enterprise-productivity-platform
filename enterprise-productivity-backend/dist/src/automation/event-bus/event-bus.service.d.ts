import type { WorkflowTriggerType } from '../../database/schema/workflows.schema';
export interface WorkflowTriggerEvent {
    triggerType: WorkflowTriggerType;
    eventKey: string;
    payload: Record<string, unknown>;
}
type Listener = (event: WorkflowTriggerEvent) => Promise<void> | void;
export declare class WorkflowEventBus {
    private readonly logger;
    private readonly listeners;
    subscribe(triggerType: WorkflowTriggerType, listener: Listener): void;
    emit(triggerType: WorkflowTriggerType, eventKey: string, payload: Record<string, unknown>): void;
    emitExternal(triggerType: WorkflowTriggerType, eventKey: string, payload: Record<string, unknown>): void;
}
export {};
