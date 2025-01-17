import { Client, GatewayIntentBits, ClientOptions, ClientEvents } from 'discord.js';

export type ClientEvent<T extends keyof ClientEvents> = (...args: ClientEvents[T]) => void;

export interface DiscordCreateOptions {
    initialEvents: Record<string, ClientEvent<keyof ClientEvents>>;
    initialIntents: GatewayIntentBits[];
}

export class DiscordClient extends Client {
    constructor(options: ClientOptions) {
        super(options);
    }
}

export function createDiscordClient(options: DiscordCreateOptions): DiscordClient {
    const client = new DiscordClient({ intents: options.initialIntents });
    return client;
}