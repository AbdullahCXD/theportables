import { Server } from '../server/Server';
import { Logger } from './Logger';

export interface Injectable {
    constructor: { name: string }
}

export class InjectionRegistry {
    private static registry = new Map<string, Map<string, Injectable>>();

    public static register(instance: Injectable, id: string = 'default'): void {
        const className = instance.constructor.name;
        if (!this.registry.has(className)) {
            this.registry.set(className, new Map());
        }
        this.registry.get(className)!.set(id, instance);
        Logger.debug(`Registered ${className} instance with ID: ${id}`);
    }

    public static unregister(className: string, id: string = 'default'): void {
        const classMap = this.registry.get(className);
        if (classMap?.has(id)) {
            classMap.delete(id);
            if (classMap.size === 0) {
                this.registry.delete(className);
            }
            Logger.debug(`Unregistered ${className} instance with ID: ${id}`);
        }
    }

    public static getInstance(className: string, id: string = 'default'): Injectable | null {
        return this.registry.get(className)?.get(id) || null;
    }

    public static getInstances(className: string): Injectable[] {
        return Array.from(this.registry.get(className)?.values() || []);
    }

    public static getAllClasses(): string[] {
        return Array.from(this.registry.keys());
    }

    public static clear(): void {
        this.registry.clear();
        Logger.debug('Cleared injection registry');
    }

    // Register built-in classes
    public static initialize(): void {
        // When a server is created, it should register itself
        // This is just an example of what classes are injectable
        Logger.debug('Initialized injection registry');
    }

    public static isInjectable(className: string): boolean {
        return this.registry.has(className);
    }
} 