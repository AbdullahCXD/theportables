// Server Types
export interface PortablesServerOptions {
    serverName: string;
    minecraftVersion: string;
    port?: number;
}

export type ServersList = {
    serverName: string;
    port: number;
    minecraftVersion: string;
    path: string;
}[];

// Command Types
export interface CommandContext {
    command: string;
    args: string[];
    parsedArgs: Record<string, any>;
    getCommandManager: () => any;
}

export interface CommandParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    default?: any;
}

export interface CommandDefinition {
    name: string;
    description: string;
    category?: string;
    aliases?: string[];
    parameters?: CommandParameter[];
    subcommands?: CommandDefinition[];
    execute?: (context: CommandContext) => Promise<void>;
}

// Server Command Types
export interface ServerCommandContext {
    server: any;
    args: string[];
    rawCommand: string;
}

export interface ServerCommandDefinition {
    name: string;
    description: string;
    usage?: string;
    aliases?: string[];
    execute: (context: ServerCommandContext) => Promise<void>;
} 