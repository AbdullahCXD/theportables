import { Logger } from './Logger';

export type HookCallback = (...args: any[]) => Promise<void> | void;

export interface Hook {
    name: string;
    callback: HookCallback;
    priority: number;
}

export class Hooks {
    private static hooks: Map<string, Hook[]> = new Map();

    public static register(event: string, callback: HookCallback, priority: number = 10): void {
        const hooks = this.hooks.get(event) || [];
        hooks.push({ name: event, callback, priority });
        hooks.sort((a, b) => b.priority - a.priority);
        this.hooks.set(event, hooks);
        Logger.debug(`Registered hook for event: ${event} with priority ${priority}`);
    }

    public static unregister(event: string, callback: HookCallback): void {
        const hooks = this.hooks.get(event);
        if (!hooks) return;

        const index = hooks.findIndex(hook => hook.callback === callback);
        if (index !== -1) {
            hooks.splice(index, 1);
            if (hooks.length === 0) {
                this.hooks.delete(event);
            }
            Logger.debug(`Unregistered hook for event: ${event}`);
        }
    }

    public static async trigger(event: string, ...args: any[]): Promise<void> {
        const hooks = this.hooks.get(event);
        if (!hooks) return;

        for (const hook of hooks) {
            try {
                await hook.callback(...args);
            } catch (error) {
                Logger.error(`Error in hook ${event}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    public static clear(event?: string): void {
        if (event) {
            this.hooks.delete(event);
            Logger.debug(`Cleared hooks for event: ${event}`);
        } else {
            this.hooks.clear();
            Logger.debug('Cleared all hooks');
        }
    }

    public static getHooks(event: string): readonly Hook[] {
        return Object.freeze(this.hooks.get(event) || []);
    }

    public static hasHooks(event: string): boolean {
        return this.hooks.has(event) && this.hooks.get(event)!.length > 0;
    }
} 