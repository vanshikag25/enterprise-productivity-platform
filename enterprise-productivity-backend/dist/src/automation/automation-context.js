"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
class AutomationContext {
    constructor() {
        this.storage = new node_async_hooks_1.AsyncLocalStorage();
    }
    async run(fn) {
        return this.storage.run({ inAutomation: true }, fn);
    }
    isActive() {
        return this.storage.getStore()?.inAutomation ?? false;
    }
}
exports.automationContext = new AutomationContext();
//# sourceMappingURL=automation-context.js.map