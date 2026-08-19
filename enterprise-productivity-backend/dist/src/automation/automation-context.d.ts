declare class AutomationContext {
    private readonly storage;
    run<T>(fn: () => Promise<T>): Promise<T>;
    isActive(): boolean;
}
export declare const automationContext: AutomationContext;
export {};
