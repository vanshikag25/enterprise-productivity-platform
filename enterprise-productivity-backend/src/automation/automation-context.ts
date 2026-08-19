import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Marks the async execution stack while the automation engine is running a
 * workflow action. Feature services that emit trigger events consult this
 * flag so actions performed BY automation (e.g. `TasksService.create`) do not
 * re-trigger workflows, which prevents unbounded recursive workflows.
 */
class AutomationContext {
  private readonly storage = new AsyncLocalStorage<{ inAutomation: boolean }>();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return this.storage.run({ inAutomation: true }, fn);
  }

  isActive(): boolean {
    return this.storage.getStore()?.inAutomation ?? false;
  }
}

export const automationContext = new AutomationContext();
