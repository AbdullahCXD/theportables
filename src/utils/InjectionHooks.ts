import { Logger } from './Logger';

// Define the context object passed to callbacks
export interface InjectionContext<T = any, R = any> {
    target: T;
    method: string;
    args: any[];
    result?: R;
    proceed?: () => R;
}

// Update callback type to use context object
export type InjectionCallback<T = any, R = any> = (context: InjectionContext<T, R>) => R | void;

// Define injection point interface
export interface InjectionPoint<T = any, R = any> {
    target: T;
    method: string;
    callback: InjectionCallback<T, R>;
    type: 'before' | 'after' | 'around';
    priority: number;
}

export class InjectionHooks {
    private static injections = new Map<string, InjectionPoint[]>();
    private static originalMethods = new Map<string, Function>();

    private static getInjectionKey(target: any, method: string): string {
        return `${target.constructor.name}.${method}`;
    }

    public static inject<T = any, R = any>(
        target: T,
        method: keyof T & string,
        callback: InjectionCallback<T, R>,
        type: 'before' | 'after' | 'around' = 'around',
        priority: number = 10
    ): void {
        const key = this.getInjectionKey(target, method);
        const injections = this.injections.get(key) || [];
        
        // Store original method if not already stored
        if (!this.originalMethods.has(key)) {
            const original = (target as any)[method];
            if (typeof original !== 'function') {
                throw new Error(`Method ${method} does not exist on target`);
            }
            this.originalMethods.set(key, original);
        }

        // Add new injection point
        injections.push({ target, method, callback, type, priority });
        injections.sort((a, b) => b.priority - a.priority);
        this.injections.set(key, injections);

        // Replace method with wrapped version if not already wrapped
        if ((target as any)[method] === this.originalMethods.get(key)) {
            this.wrapMethod(target, method);
        }

        Logger.debug(`Injected ${type} hook for ${key} with priority ${priority}`);
    }

    private static wrapMethod<T = any, R = any>(target: T, method: keyof T & string): void {
        const key = this.getInjectionKey(target, method);
        const original = this.originalMethods.get(key) as Function;
        const injections = this.injections.get(key) || [];

        // Create a wrapped version of the method that preserves 'this' context
        const wrapped = function(this: any, ...args: any[]): R {
            const beforeInjections = injections.filter(i => i.type === 'before');
            const afterInjections = injections.filter(i => i.type === 'after');
            const aroundInjections = injections.filter(i => i.type === 'around');

            // Execute 'before' injections
            for (const injection of beforeInjections) {
                try {
                    injection.callback.call(this, { target: this, method, args });
                } catch (error) {
                    Logger.error(`Error in before injection for ${key}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            let result: R;

            // Execute 'around' injections or original method
            if (aroundInjections.length > 0) {
                // Chain around injections
                const chain = aroundInjections.reduce((next, injection) => {
                    return (...chainArgs: any[]) => {
                        try {
                            return injection.callback.call(this, {
                                target: this,
                                method,
                                args: chainArgs,
                                proceed: () => next.apply(this, chainArgs)
                            });
                        } catch (error) {
                            Logger.error(`Error in around injection for ${key}: ${error instanceof Error ? error.message : String(error)}`);
                            return next.apply(this, chainArgs);
                        }
                    };
                }, original.bind(this));

                result = chain(...args);
            } else {
                result = original.apply(this, args);
            }

            // Execute 'after' injections
            for (const injection of afterInjections) {
                try {
                    injection.callback.call(this, { target: this, method, args, result });
                } catch (error) {
                    Logger.error(`Error in after injection for ${key}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            return result;
        };

        // Replace the original method with our wrapped version
        (target as any)[method] = wrapped;
        Logger.debug(`Wrapped method ${key} with ${injections.length} injection(s)`);
    }

    public static removeInjection(target: any, method: string, callback: InjectionCallback): void {
        const key = this.getInjectionKey(target, method);
        const injections = this.injections.get(key);
        if (!injections) return;

        const index = injections.findIndex(i => i.callback === callback);
        if (index !== -1) {
            injections.splice(index, 1);
            if (injections.length === 0) {
                this.injections.delete(key);
                // Restore original method
                (target as any)[method] = this.originalMethods.get(key);
                this.originalMethods.delete(key);
            }
            Logger.debug(`Removed injection for ${key}`);
        }
    }

    public static clearInjections(target?: any, method?: string): void {
        if (target && method) {
            const key = this.getInjectionKey(target, method);
            if (this.injections.has(key)) {
                // Restore original method
                (target as any)[method] = this.originalMethods.get(key);
                this.originalMethods.delete(key);
                this.injections.delete(key);
                Logger.debug(`Cleared injections for ${key}`);
            }
        } else {
            // Restore all original methods
            for (const [key, original] of this.originalMethods.entries()) {
                const [className, methodName] = key.split('.');
                const target = this.injections.get(key)?.[0]?.target;
                if (target) {
                    target[methodName] = original;
                }
            }
            this.injections.clear();
            this.originalMethods.clear();
            Logger.debug('Cleared all injections');
        }
    }

    public static getInjections(target: any, method: string): readonly InjectionPoint[] {
        const key = this.getInjectionKey(target, method);
        return Object.freeze(this.injections.get(key) || []);
    }

    public static hasInjections(target: any, method: string): boolean {
        const key = this.getInjectionKey(target, method);
        return this.injections.has(key) && this.injections.get(key)!.length > 0;
    }
} 