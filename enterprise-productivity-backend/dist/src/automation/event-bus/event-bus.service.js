"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WorkflowEventBus_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEventBus = void 0;
const common_1 = require("@nestjs/common");
const automation_context_1 = require("../automation-context");
let WorkflowEventBus = WorkflowEventBus_1 = class WorkflowEventBus {
    constructor() {
        this.logger = new common_1.Logger(WorkflowEventBus_1.name);
        this.listeners = new Map();
    }
    subscribe(triggerType, listener) {
        const listeners = this.listeners.get(triggerType) ?? [];
        listeners.push(listener);
        this.listeners.set(triggerType, listeners);
    }
    emit(triggerType, eventKey, payload) {
        const listeners = this.listeners.get(triggerType) ?? [];
        if (listeners.length === 0)
            return;
        for (const listener of listeners) {
            void Promise.resolve(listener({ triggerType, eventKey, payload })).catch((err) => this.logger.error(`Workflow event listener failed for ${triggerType} (${eventKey}): ${err instanceof Error ? err.message : err}`));
        }
    }
    emitExternal(triggerType, eventKey, payload) {
        if (automation_context_1.automationContext.isActive())
            return;
        this.emit(triggerType, eventKey, payload);
    }
};
exports.WorkflowEventBus = WorkflowEventBus;
exports.WorkflowEventBus = WorkflowEventBus = WorkflowEventBus_1 = __decorate([
    (0, common_1.Injectable)()
], WorkflowEventBus);
//# sourceMappingURL=event-bus.service.js.map