import { EventEmitter } from 'events';
import { Server } from './Server';
import { Logger } from '../utils/Logger';
import { Readline } from '../utils/Readline';
import { BoxRenderer } from '../utils/BoxRenderer';
import { ServerCommandManager } from './ServerCommand';
import clc from 'cli-color';

export class ConsoleManager extends EventEmitter {
    private readonly server: Server;
    private readonly readline: Readline;
    private isActive: boolean = false;

    constructor(server: Server) {
        super();
        this.server = server;
        this.readline = Readline.getInstance();
    }

    public async enter(): Promise<void> {
        if (!this.server.isRunning()) {
            throw new Error('Server is not running');
        }

        if (this.isActive) {
            throw new Error('Console is already active');
        }

        this.isActive = true;
        ServerCommandManager.initialize();
        this.readline.setHostname(this.server.getName());
        Logger.info(`Entered console mode for ${clc.white(this.server.getName())}`, this.server.getName());

        // Display connection info
        Logger.emptyLine();
        BoxRenderer.createBox('Connected', [
            `${clc.blackBright('Name:')}    ${clc.white(this.server.getName())}`,
            `${clc.blackBright('Port:')}    ${clc.cyan(this.server.getPort().toString())}`,
            `${clc.blackBright('Version:')} ${clc.green(this.server.getVersion())}`,
            `${clc.blackBright('Status:')}  ${clc.green('Connected')}`
        ]);
        Logger.emptyLine();

        // Handle user input
        while (this.isActive) {
            const input = await this.readline.question();
            const command = input.trim();

            if (command === '.exit') {
                await this.exit();
                break;
            }

            if (command) {
                Logger.debug(`Executing command: ${command}`, this.server.getName());
                const wasCommand = await ServerCommandManager.executeCommand(this.server, command);
                if (!wasCommand) {
                    // If not a command, broadcast as chat message
                    Logger.debug(`Broadcasting message: ${command}`, this.server.getName());
                    this.server.broadcast(command);
                }
            }
        }
    }

    private async exit(): Promise<void> {
        this.isActive = false;
        Logger.info(`Exiting console mode for ${clc.white(this.server.getName())}`, this.server.getName());
        Logger.emptyLine();
        BoxRenderer.createBox('Disconnected', [
            `${clc.blackBright('Name:')}    ${clc.white(this.server.getName())}`,
            `${clc.blackBright('Status:')}  ${clc.red('Disconnected')}`
        ]);
        Logger.emptyLine();
        this.readline.setHostname('portables');
        this.emit('exit');
    }

    public isConsoleActive(): boolean {
        return this.isActive;
    }
} 