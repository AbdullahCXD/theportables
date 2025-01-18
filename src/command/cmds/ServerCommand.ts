import { Server } from '../../server/Server';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { Command, CommandContext } from '../Command';
import { FileSystem } from '../../utils/FileSystem';
import clc from 'cli-color';
import axios from 'axios';
import { CommandBuilder } from '../CommandBuilder';

interface ServerAction {
    description: string;
    handler: (flags: Map<string, string | boolean>, args?: string[]) => Promise<void>;
}

export default class ServerCommand extends Command {
    private readonly actions: Map<string, ServerAction> = new Map();

    constructor() {
        super(CommandBuilder.builder()
            .setName('server')
            .setDescription('Manage Minecraft servers')
            .setCategory('Server')
            .setAliases(['s'])
            .setUsage('server <command> [options]')
            .addArgument({
                name: 'command',
                description: 'The command to execute (create/list/start/stop/delete/rename/listen/edit/ping)',
                type: 'string',
                required: true
            })
            .addArgument({
                name: 'newname',
                description: 'New name for the server (rename only)',
                type: 'string'
            })
            .addOption({
                name: 'name',
                description: 'Name of the server',
                type: 'string'
            })
            .addOption({
                name: 'port',
                description: 'Port number for the server',
                type: 'number'
            })
            .addOption({
                name: 'version',
                description: 'Minecraft version for the server',
                type: 'string'
            })
            .addOption({
                name: 'force',
                description: 'Force the operation without confirmation',
                type: 'boolean'
            })
            .addExample('server create --name myserver --port 25565 --version 1.19.2')
            .addExample('server list')
            .addExample('server start --name myserver')
            .addExample('server stop --name myserver')
            .addExample('server delete --name myserver')
            .addExample('server rename --name myserver newname')
            .addExample('server listen --name myserver')
            .addExample('server ping mc.hypixel.net')
            .build()
        );

        // Initialize action handlers
        this.actions
            .set('create', {
                description: 'Create a new Minecraft server',
                handler: this.handleCreate.bind(this)
            })
            .set('list', {
                description: 'List all servers',
                handler: this.handleList.bind(this)
            })
            .set('start', {
                description: 'Start a server',
                handler: this.handleStart.bind(this)
            })
            .set('stop', {
                description: 'Stop a running server',
                handler: this.handleStop.bind(this)
            })
            .set('delete', {
                description: 'Delete a server',
                handler: this.handleDelete.bind(this)
            })
            .set('rename', {
                description: 'Rename a server',
                handler: this.handleRename.bind(this)
            })
            .set('listen', {
                description: 'Enter server console mode',
                handler: this.handleListen.bind(this)
            })
            .set('edit', {
                description: 'Edit server configuration',
                handler: this.handleEdit.bind(this)
            })
            .set('ping', {
                description: 'Ping a Minecraft server',
                handler: this.handlePing.bind(this)
            });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args.get('command')?.toLowerCase();

        if (!subcommand) {
            this.showServerHelp();
            return;
        }

        const action = this.actions.get(subcommand);
        if (!action) {
            Logger.error(`Unknown subcommand: ${subcommand}`);
            this.showServerHelp();
            return;
        }

        const argsArray = Array.from(args.values());
        await action.handler(flags, argsArray.slice(1));
    }

    private showServerHelp(): void {
        Logger.emptyLine();
        BoxRenderer.createBox('Server Management', [
            clc.yellow('Available Commands:'),
            '',
            ...Array.from(this.actions.entries()).map(([cmd, action]) => [
                `${clc.cyan(cmd)} ${this.getCommandFlags(cmd)}`,
                `${clc.blackBright('→')} ${action.description}`
            ]).flat()
        ]);
        Logger.emptyLine();
    }

    private getCommandFlags(cmd: string): string {
        switch (cmd) {
            case 'create': return clc.blackBright('--name <name> --port <port> --version <version>');
            case 'start':
            case 'stop':
            case 'delete':
            case 'listen': return clc.blackBright('--name <name>');
            case 'rename': return clc.blackBright('--name <name> <newname>');
            case 'edit': return clc.blackBright('--name <name> [--port <port>] [--version <version>]');
            case 'ping': return clc.blackBright('<name or address>');
            default: return '';
        }
    }

    private async handleCreate(flags: Map<string, string | boolean>): Promise<void> {
        const name = flags.get('name') as string;
        const port = Number(flags.get('port'));
        const version = flags.get('version') as string;

        const options = !name && !port && !version 
            ? Server.createRandomOption()
            : Server.createServerOptions(name, port, version);

        const server = Server.createServer(options);
        await server.saveOnly();

        Logger.emptyLine();
        BoxRenderer.createBox('Server Created Successfully', [
            `${clc.blackBright('Name:')}    ${clc.white(server.getName())}`,
            `${clc.blackBright('Port:')}    ${clc.cyan(options.port)}`,
            `${clc.blackBright('Version:')} ${clc.green(options.minecraftVersion)}`,
            '',
            `${clc.blackBright('→')} Start: ${clc.cyan(`server start --name ${server.getName()}`)}`,
            `${clc.blackBright('→')} Console: ${clc.cyan(`server listen --name ${server.getName()}`)}`
        ]);
        Logger.emptyLine();
    }

    private async handleList(): Promise<void> {
        const servers = Server.getServers();
        
        if (servers.length === 0) {
            Logger.emptyLine();
            BoxRenderer.createBox('No Servers Found', [
                'No Minecraft servers have been created yet.',
                '',
                `${clc.blackBright('→')} Create one using ${clc.cyan('server create')}`
            ]);
            Logger.emptyLine();
            return;
        }

        const runningServers = new Set(Server.getRunningServers().keys());

        Logger.emptyLine();
        BoxRenderer.createBox(`Minecraft Servers (${servers.length})`, 
            servers.flatMap(server => [
                `${clc.white(server.serverName)} ${runningServers.has(server.serverName) ? clc.green('●') : clc.red('●')}`,
                `${clc.blackBright('Port:')} ${clc.cyan(server.port)}`,
                `${clc.blackBright('Version:')} ${clc.green(server.minecraftVersion)}`,
                ''
            ]).slice(0, -1) // Remove last empty line
        );
        Logger.emptyLine();
    }

    private async handleStart(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const name = flags.get('name') as string || args?.[0];
        if (!name) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.loadServerData(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not found`);
            return;
        }

        Logger.info(`Starting server ${clc.white(name)}...`);
        try {
            await server.startServer();
            Logger.emptyLine();
            BoxRenderer.createBox('Server Started', [
                `${clc.blackBright('Name:')}    ${clc.white(name)}`,
                `${clc.blackBright('Status:')}  ${clc.green('Running')}`,
                '',
                `${clc.blackBright('→')} Use ${clc.cyan(`server listen --name ${name}`)} to view console`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleStop(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const name = flags.get('name') as string || args?.[0];
        if (!name) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.getRunningServer(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not found or not running`);
            return;
        }

        await server.stopServer();
        Logger.emptyLine();
        BoxRenderer.createBox('Server Stopped', [
            `${clc.blackBright('Name:')}    ${clc.white(name)}`,
            `${clc.blackBright('Status:')}  ${clc.red('Stopped')}`
        ]);
        Logger.emptyLine();
    }

    private async handleDelete(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const name = flags.get('name') as string || args?.[0];
        if (!name) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.loadServerData(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not found`);
            return;
        }

        if (server.isRunning()) {
            Logger.error(`Server ${clc.white(name)} is still running. Stop it first.`);
            return;
        }

        const force = flags.get('force') as boolean;
        if (!force) {
            Logger.warn(`This will permanently delete server ${clc.white(name)} and all its data.`);
            Logger.warn('Add --force to confirm deletion');
            return;
        }

        try {
            await Server.removeServer(name);
            
            Logger.emptyLine();
            BoxRenderer.createBox('Server Deleted', [
                `${clc.blackBright('Name:')}    ${clc.white(name)}`,
                `${clc.blackBright('Status:')}  ${clc.green('Successfully deleted')}`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to delete server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleRename(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const name = flags.get('name') as string || args?.[0];
        const newName = args?.[1];
        
        if (!name || !newName) {
            Logger.error('Both current and new server names are required');
            return;
        }

        const server = Server.loadServerData(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not found`);
            return;
        }

        if (server.isRunning()) {
            Logger.error(`Server ${clc.white(name)} is still running. Stop it first.`);
            return;
        }

        try {
            const oldPath = server.getServerPath();
            const newPath = oldPath.replace(name, newName);
            
            await FileSystem.renameDirectory(oldPath, newPath);
            Server.renameServer(name, newName);
            
            Logger.emptyLine();
            BoxRenderer.createBox('Server Renamed', [
                `${clc.blackBright('Old Name:')} ${clc.white(name)}`,
                `${clc.blackBright('New Name:')} ${clc.white(newName)}`,
                `${clc.blackBright('Status:')}   ${clc.green('Successfully renamed')}`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to rename server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleListen(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const name = flags.get('name') as string || args?.[0];
        if (!name) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.getRunningServer(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not online!`);
            return;
        }

        if (!server.isRunning()) {
            Logger.error(`Server ${clc.white(name)} is not running`);
            Logger.emptyLine();
            BoxRenderer.createBox('Start Server First', [
                `${clc.blackBright('→')} Use ${clc.cyan(`server start --name ${name}`)} to start the server`
            ]);
            Logger.emptyLine();
            return;
        }

        Logger.emptyLine();
        BoxRenderer.createBox('Server Console Mode', [
            `${clc.blackBright('Name:')}    ${clc.white(name)}`,
            `${clc.blackBright('Status:')}  ${clc.green('Connected')}`,
            '',
            `${clc.blackBright('→')} Type ${clc.cyan('.exit')} to leave server mode`,
            `${clc.blackBright('→')} Type ${clc.cyan('.help')} for server commands`
        ]);
        Logger.emptyLine();

        await server.enterConsoleMode();
    }

    private async handleEdit(flags: Map<string, string | boolean>): Promise<void> {
        const name = flags.get('name') as string;
        if (!name) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.loadServerData(name);
        if (!server) {
            Logger.error(`Server ${clc.white(name)} not found`);
            return;
        }

        const port = flags.get('port') ? Number(flags.get('port')) : undefined;
        const version = flags.get('version') as string | undefined;

        await server.updateConfiguration({ port, version });
        
        Logger.emptyLine();
        BoxRenderer.createBox('Server Updated', [
            `${clc.blackBright('Name:')}    ${clc.white(name)}`,
            `${clc.blackBright('Port:')}    ${clc.cyan(port ?? server.getPort())}`,
            `${clc.blackBright('Version:')} ${clc.green(version ?? server.getVersion())}`,
            '',
            `${clc.blackBright('→')} Changes will take effect on next server start`
        ]);
        Logger.emptyLine();
    }

    private async handlePing(flags: Map<string, string | boolean>, args?: string[]): Promise<void> {
        const target = flags.get('name') as string || args?.[0];
        if (!target) {
            Logger.error('Server name or address is required');
            return;
        }

        try {
            let address: string;
            let port: number = 25565;

            // Check if target is a local server
            const server = Server.loadServerData(target);
            if (server) {
                address = 'localhost';
                port = server.getPort();

                const isRunning = server.isRunning();
                
                Logger.emptyLine();
                BoxRenderer.createBox('Server Status', [
                    `${clc.blackBright('Address:')}  ${clc.white(address)}:${clc.cyan(port)}`,
                    `${clc.blackBright('Status:')}   ${isRunning ? clc.green('Online') : clc.red('Offline')}`,
                    isRunning ? `${clc.blackBright('Version:')}  ${clc.green(server.getVersion())}` : ''
                ].filter(Boolean));
                Logger.emptyLine();
                return;
            }

            // For non-local servers, use axios
            if (target.includes(':')) {
                const [addr, portStr] = target.split(':');
                address = addr;
                port = parseInt(portStr);
            } else {
                address = target;
            }

            const response = await axios.get(`https://api.mcsrvstat.us/2/${address}:${port}`, {
                timeout: 5000
            });

            const data = response.data;
            
            Logger.emptyLine();
            if (data.online) {
                BoxRenderer.createBox('Server Status', [
                    `${clc.blackBright('Address:')}  ${clc.white(address)}:${clc.cyan(port)}`,
                    `${clc.blackBright('Status:')}   ${clc.green('Online')}`,
                    `${clc.blackBright('Players:')}  ${clc.cyan(data.players?.online ?? 0)}/${clc.cyan(data.players?.max ?? 0)}`,
                    `${clc.blackBright('Version:')}  ${clc.green(data.version)}`,
                    data.motd?.clean ? `${clc.blackBright('MOTD:')}     ${clc.white(data.motd.clean[0])}` : ''
                ].filter(Boolean));
            } else {
                BoxRenderer.createBox('Server Status', [
                    `${clc.blackBright('Address:')}  ${clc.white(address)}:${clc.cyan(port)}`,
                    `${clc.blackBright('Status:')}   ${clc.red('Offline')}`
                ]);
            }
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to ping server: ${error instanceof Error ? error.message : 'Connection failed'}`);
        }
    }
}