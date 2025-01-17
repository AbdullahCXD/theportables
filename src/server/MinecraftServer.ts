import MinecraftProtocol from 'minecraft-protocol';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { DEFAULT_CONFIG } from '../config/constants';
import minecraftData from 'minecraft-data';
import clc from 'cli-color';

export interface MinecraftServerOptions {
    name: string;
    version: string;
    port: number;
    host?: string;
    maxPlayers?: number;
    motd?: string;
    'online-mode'?: boolean;
}

export interface MinecraftClient {
    username?: string;
    socket: {
        remoteAddress?: string;
    };
    end: (reason: string) => void;
    write: (packet: string, data: any) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    once: (event: string, listener: (...args: any[]) => void) => void;
    removeListener: (event: string, listener: (...args: any[]) => void) => void;
}

export class MinecraftServer extends EventEmitter {
    private server: MinecraftProtocol.Server | null = null;
    private readonly options: MinecraftServerOptions;
    private readonly mcData: any;

    constructor(options: MinecraftServerOptions) {
        super();
        this.options = {
            host: '0.0.0.0',
            maxPlayers: DEFAULT_CONFIG.SERVER.MAX_PLAYERS,
            'online-mode': false,
            ...options
        };

        this.mcData = minecraftData(this.options.version);
        if (!this.mcData) {
            throw new Error(`Unsupported Minecraft version: ${this.options.version}`);
        }
    }

    public start(): void {
        if (this.server) {
            throw new Error('Server is already running');
        }

        try {
            this.server = MinecraftProtocol.createServer({
                host: this.options.host,
                port: this.options.port,
                version: this.options.version,
                maxPlayers: this.options.maxPlayers,
                'online-mode': this.options['online-mode'],
                motd: this.options.motd || `§6${this.options.name}\n§7A Portables Development Server`,
                beforePing: (response) => {
                    response.version.name = this.options.version;
                    response.version.protocol = this.mcData.version.version;
                    response.players = {
                        max: this.options.maxPlayers!,
                        online: this.getOnlinePlayers().length,
                        sample: []
                    };
                    response.description = {
                        text: this.options.motd || `§6${this.options.name}\n§7A Portables Development Server`
                    };
                    return response;
                }
            });

            this.setupEventHandlers();
            Logger.success(`Server started on port ${clc.cyan(this.options.port.toString())}`, this.options.name);
        } catch (error) {
            Logger.error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`, this.options.name);
            throw error;
        }
    }

    private setupEventHandlers(): void {
        if (!this.server) return;

        this.server.on('listening', () => {
            this.emit('listening');
            Logger.info(`Server is listening on port ${clc.cyan(this.options.port.toString())}`, this.options.name);
        });

        this.server.on('login', (client: MinecraftClient) => {
            this.emit('login', client);
            Logger.info(
                `Player ${clc.white(client.username || 'Unknown')} connected from ${clc.cyan(client.socket.remoteAddress || 'Unknown')}`,
                this.options.name
            );

            client.on('end', () => {
                this.emit('playerLeave', client);
                Logger.info(`Player ${clc.white(client.username || 'Unknown')} disconnected`, this.options.name);
            });

            client.on('error', (error: Error) => {
                this.emit('playerError', client, error);
                Logger.error(`Player ${clc.white(client.username || 'Unknown')} error: ${error.message}`, this.options.name);
            });
        });

        this.server.on('error', (error: Error) => {
            this.emit('error', error);
            Logger.error(`Server error: ${error.message}`, this.options.name);
        });
    }

    public stop(): void {
        if (!this.server) return;

        // Kick all players
        this.getOnlinePlayers().forEach(player => {
            this.kickPlayer(player, 'Server shutting down');
        });

        // Close the server
        this.server.close();
        this.server = null;
        Logger.success(`Server stopped`, this.options.name);
    }

    public isRunning(): boolean {
        return this.server !== null;
    }

    public getOnlinePlayers(): string[] {
        if (!this.server) return [];
        return Object.values(this.server.clients)
            .map(client => (client as MinecraftClient).username || 'Unknown')
            .filter(name => name !== 'Unknown');
    }

    public broadcast(message: string): void {
        if (!this.server) return;
        Object.values(this.server.clients).forEach((client: MinecraftClient) => {
            client.write('chat', { message });
        });
        Logger.info(`[Broadcast] ${message}`, this.options.name);
    }

    public kickPlayer(username: string, reason: string): boolean {
        if (!this.server) return false;

        const client = Object.values(this.server.clients)
            .find(c => (c as MinecraftClient).username === username) as MinecraftClient;

        if (!client) return false;

        client.end(reason);
        return true;
    }

    public getName(): string {
        return this.options.name;
    }

    public getPort(): number {
        return this.options.port;
    }

    public getVersion(): string {
        return this.options.version;
    }
} 