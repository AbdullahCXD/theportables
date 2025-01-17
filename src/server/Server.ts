import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import { DEFAULT_CONFIG } from '../config/constants';
import { MinecraftServer, MinecraftServerOptions } from './MinecraftServer';
import { PortablesServerOptions, ServersList } from '../types';
import { Hooks } from '../utils/Hooks';
import { InjectionRegistry, Injectable } from '../utils/InjectionRegistry';
import path from 'path';
import clc from 'cli-color';
import { ConsoleManager } from './ConsoleManager';

export class Server implements Injectable {
    // Static members
    private static readonly serversFile = path.join(FileSystem.getWorkspacePath(), 'servers.json');
    private static readonly runningServers = new Map<string, Server>();
    private static readonly serverCache = new Map<string, Server>();

    // Instance members
    private minecraftServer: MinecraftServer | null = null;
    private readonly options: Readonly<PortablesServerOptions>;
    private readonly serverDataDirectory: string;

    private constructor(options: PortablesServerOptions) {
        this.options = Object.freeze({ ...options });
        this.serverDataDirectory = path.join(FileSystem.getServersPath(), options.serverName);
        // Register this instance with the registry
        InjectionRegistry.register(this, options.serverName);
    }

    // Static factory methods
    public static createRandomOption(): Readonly<PortablesServerOptions> {
        return Object.freeze({
            serverName: "server-" + Math.random().toString(36).substring(2, 8),
            minecraftVersion: DEFAULT_CONFIG.SERVER.DEFAULT_VERSION,
            port: Math.floor(Math.random() * 10000) + 10000,
        });
    }

    public static createServerOptions(serverName: string, port: number, version: string): Readonly<PortablesServerOptions> {
        return Object.freeze({ serverName, minecraftVersion: version, port });
    }

    // Server management methods
    public static loadServerData(serverName: string): Server | null {
        // Check cache first
        const cachedServer = this.serverCache.get(serverName);
        if (cachedServer) return cachedServer;

        const serverPath = FileSystem.getServerPath(serverName);
        const configPath = path.join(serverPath, 'server.json');

        if (!FileSystem.fileExists(configPath)) {
            return null;
        }

        try {
            const serverData = FileSystem.readJsonFile<PortablesServerOptions>(configPath);
            const server = new Server(serverData);
            this.serverCache.set(serverName, server);
            return server;
        } catch (error) {
            Logger.error(`Failed to load server data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    public static getServers(): ServersList {
        try {
            return FileSystem.fileExists(Server.serversFile) 
                ? FileSystem.readJsonFile<ServersList>(Server.serversFile)
                : [];
        } catch (error) {
            Logger.error(`Failed to read servers list: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    public static getRunningServer(serverName: string): Server | null {
        return Server.runningServers.get(serverName) || null;
    }

    public static getRunningServers(): ReadonlyMap<string, Server> {
        return Server.runningServers;
    }

    public static getServerCache(): ReadonlyMap<string, Server> {
        return Server.serverCache;
    }

    public static createServer(options: PortablesServerOptions): Server {
        const server = new Server(options);
        Server.serverCache.set(options.serverName, server);
        return server;
    }

    // Instance methods
    private async initialize(): Promise<void> {
        FileSystem.ensureDirectoryExists(this.serverDataDirectory);
        const configPath = path.join(this.serverDataDirectory, 'server.json');
        
        FileSystem.writeJsonFile(configPath, {
            ...this.options,
            configVersion: DEFAULT_CONFIG.SERVER.CONFIGURATION_VERSION
        });

        await Hooks.trigger('server:initialize', this);
        Logger.info(`Initialized server directory at ${this.serverDataDirectory}`, this.options.serverName);
    }

    public async startServer(): Promise<void> {
        if (this.minecraftServer?.isRunning()) {
            throw new Error('Server is already running');
        }

        Logger.info(`Starting server ${clc.white(this.options.serverName)}...`, this.options.serverName);
        
        try {
            await this.initialize();
            await Hooks.trigger('server:beforeStart', this);

            const serverOptions: Readonly<MinecraftServerOptions> = Object.freeze({
                name: this.options.serverName,
                version: this.options.minecraftVersion,
                port: this.options.port || DEFAULT_CONFIG.SERVER.DEFAULT_PORT,
                maxPlayers: DEFAULT_CONFIG.SERVER.MAX_PLAYERS,
                'online-mode': false
            });

            this.minecraftServer = new MinecraftServer(serverOptions);
            this.minecraftServer.start();

            Server.runningServers.set(this.options.serverName, this);
            await Hooks.trigger('server:afterStart', this);
            Logger.success(`Server ${clc.white(this.options.serverName)} started successfully`, this.options.serverName);
        } catch (error) {
            await Hooks.trigger('server:error', this, error);
            Logger.error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`, this.options.serverName);
            throw error;
        }
    }

    public async saveOnly(): Promise<void> {
        await this.initialize();
        await this.saveIntoServersList();
        await Hooks.trigger('server:save', this);
        Logger.info(`Saved server configuration for ${clc.white(this.options.serverName)}`, this.options.serverName);
    }

    private async saveIntoServersList(): Promise<void> {
        const servers = Server.getServers();
        const newServer = Object.freeze({
            serverName: this.options.serverName,
            port: this.options.port || DEFAULT_CONFIG.SERVER.DEFAULT_PORT,
            minecraftVersion: this.options.minecraftVersion,
            path: this.serverDataDirectory
        });

        const existingIndex = servers.findIndex(server => server.serverName === newServer.serverName);
        if (existingIndex !== -1) {
            servers[existingIndex] = newServer;
            Logger.info(`Updated existing server: ${clc.white(newServer.serverName)}`, this.options.serverName);
        } else {
            servers.push(newServer);
            Logger.info(`Added new server: ${clc.white(newServer.serverName)}`, this.options.serverName);
        }

        FileSystem.writeJsonFile(Server.serversFile, servers);
    }

    public async stopServer(): Promise<void> {
        if (!this.minecraftServer?.isRunning()) {
            return;
        }

        Logger.info(`Stopping server ${clc.white(this.options.serverName)}...`, this.options.serverName);
        await Hooks.trigger('server:beforeStop', this);
        
        this.minecraftServer.stop();
        Server.runningServers.delete(this.options.serverName);
        this.minecraftServer = null;
        await this.saveOnly();
        
        // Unregister from injection registry when stopped
        InjectionRegistry.unregister('Server', this.options.serverName);
        
        await Hooks.trigger('server:afterStop', this);
        Logger.success(`Server ${clc.white(this.options.serverName)} stopped successfully`, this.options.serverName);
    }

    public async updateConfiguration(values: Readonly<{ port?: number; version?: string }>): Promise<void> {
        Logger.info(`Updating configuration for ${clc.white(this.options.serverName)}...`, this.options.serverName);
        
        const oldPort = this.options.port;
        const oldVersion = this.options.minecraftVersion;

        await Hooks.trigger('server:beforeConfigUpdate', this, values);

        Object.assign(this.options, {
            port: values.port ?? this.options.port,
            minecraftVersion: values.version ?? this.options.minecraftVersion
        });

        if (values.port && values.port !== oldPort) {
            Logger.info(`Changed port: ${clc.cyan(oldPort)} → ${clc.cyan(values.port)}`, this.options.serverName);
        }
        if (values.version && values.version !== oldVersion) {
            Logger.info(`Changed version: ${clc.green(oldVersion)} → ${clc.green(values.version)}`, this.options.serverName);
        }

        await this.saveOnly();
        await Hooks.trigger('server:afterConfigUpdate', this, values);
        Logger.success(`Configuration updated successfully`, this.options.serverName);
    }

    // Event handlers
    public onPlayerJoin(username: string): void {
        Logger.info(`Player ${clc.white(username)} joined the server`, this.options.serverName);
        Hooks.trigger('server:playerJoin', this, username);
    }

    public onPlayerLeave(username: string): void {
        Logger.info(`Player ${clc.white(username)} left the server`, this.options.serverName);
        Hooks.trigger('server:playerLeave', this, username);
    }

    public onPlayerChat(username: string, message: string): void {
        Logger.info(`${clc.white(username)}: ${message}`, this.options.serverName);
        Hooks.trigger('server:playerChat', this, username, message);
    }

    public onServerError(error: Error): void {
        Logger.error(`Server error: ${error.message}`, this.options.serverName);
        Hooks.trigger('server:error', this, error);
    }

    // Getters
    public isRunning(): boolean {
        return this.minecraftServer?.isRunning() || false;
    }

    public getOnlinePlayers(): readonly string[] {
        return Object.freeze(this.minecraftServer?.getOnlinePlayers() || []);
    }

    public broadcast(message: string): void {
        this.minecraftServer?.broadcast(message);
        Hooks.trigger('server:broadcast', this, message);
    }

    public kickPlayer(username: string, reason: string): boolean {
        const success = this.minecraftServer?.kickPlayer(username, reason) || false;
        if (success) {
            Hooks.trigger('server:playerKick', this, username, reason);
        }
        return success;
    }

    public getName(): string {
        return this.options.serverName;
    }

    public getPort(): number {
        return this.options.port || DEFAULT_CONFIG.SERVER.DEFAULT_PORT;
    }

    public getVersion(): string {
        return this.options.minecraftVersion;
    }

    public async enterConsoleMode(): Promise<void> {
        if (!this.isRunning()) {
            throw new Error('Server is not running');
        }

        await Hooks.trigger('server:enterConsole', this);
        const consoleManager = new ConsoleManager(this);
        await consoleManager.enter();
        await Hooks.trigger('server:exitConsole', this);
    }

    public getServerPath(): string {
        return this.serverDataDirectory;
    }

    public static async removeServer(serverName: string): Promise<void> {
        const server = this.loadServerData(serverName);
        if (!server) {
            throw new Error(`Server ${serverName} not found`);
        }

        if (server.isRunning()) {
            throw new Error(`Server ${serverName} is still running`);
        }

        // Remove from servers list
        const servers = this.getServers().filter(s => s.serverName !== serverName);
        FileSystem.writeJsonFile(this.serversFile, servers);

        // Remove from cache
        this.serverCache.delete(serverName);

        // Delete server directory
        FileSystem.deleteDirectory(server.getServerPath());
        Logger.info(`Removed server ${serverName}`);
    }

    public static async renameServer(oldName: string, newName: string): Promise<void> {
        const server = this.loadServerData(oldName);
        if (!server) {
            throw new Error(`Server ${oldName} not found`);
        }

        if (server.isRunning()) {
            throw new Error(`Server ${oldName} is still running`);
        }

        // Update servers list
        const servers = this.getServers();
        const serverEntry = servers.find(s => s.serverName === oldName);
        if (serverEntry) {
            serverEntry.serverName = newName;
            serverEntry.path = path.join(FileSystem.getServersPath(), newName);
            FileSystem.writeJsonFile(this.serversFile, servers);
        }

        // Update cache
        this.serverCache.delete(oldName);
        this.serverCache.set(newName, server);

        Logger.info(`Renamed server ${oldName} to ${newName}`);
    }

    public async createBackup(name?: string): Promise<string> {
        const backupName = name || new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(FileSystem.getBackupsPath(), this.options.serverName, backupName);

        FileSystem.ensureDirectoryExists(backupPath);
        await FileSystem.copyDirectory(this.serverDataDirectory, backupPath);
        Logger.info(`Created backup ${backupName} for server ${this.options.serverName}`);

        return backupName;
    }

    public async restoreBackup(backupName: string): Promise<void> {
        const backupPath = path.join(FileSystem.getBackupsPath(), this.options.serverName, backupName);
        if (!FileSystem.directoryExists(backupPath)) {
            throw new Error(`Backup ${backupName} not found for server ${this.options.serverName}`);
        }

        if (this.isRunning()) {
            throw new Error(`Server ${this.options.serverName} is still running`);
        }

        // Clear current server directory
        FileSystem.deleteDirectory(this.serverDataDirectory);
        FileSystem.ensureDirectoryExists(this.serverDataDirectory);

        // Copy backup files
        await FileSystem.copyDirectory(backupPath, this.serverDataDirectory);
        Logger.info(`Restored backup ${backupName} for server ${this.options.serverName}`);
    }
}