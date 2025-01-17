import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { Server } from '../../server/Server';
import clc from 'cli-color';

export default class LogsCommand extends Command {
    constructor() {
        super({
            name: 'logs',
            description: 'View and manage application logs',
            category: 'System',
            aliases: ['log'],
            usage: 'logs [command] [options]',
            examples: [
                'logs list',
                'logs view --lines 50',
                'logs clear',
                'logs server myserver --lines 100'
            ],
            options: [
                {
                    name: 'lines',
                    description: 'Number of lines to show',
                    type: 'number',
                    default: 50
                },
                {
                    name: 'server',
                    description: 'Server name to view logs for',
                    type: 'string'
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args[0];

        if (!subcommand) {
            this.showLogsHelp();
            return;
        }

        switch (subcommand.toLowerCase()) {
            case 'list':
                await this.handleList(flags);
                break;
            case 'view':
                await this.handleView(flags);
                break;
            case 'clear':
                await this.handleClear(flags);
                break;
            case 'server':
                await this.handleServerLogs(flags);
                break;
            default:
                Logger.error(`Unknown subcommand: ${subcommand}`);
                this.showLogsHelp();
                break;
        }
    }

    private showLogsHelp(): void {
        Logger.emptyLine();
        BoxRenderer.createBox('Logs Management', [
            clc.yellow('Available Commands:'),
            '',
            `${clc.cyan('list')}`,
            `${clc.blackBright('→')} List all available log files`,
            '',
            `${clc.cyan('view')} ${clc.blackBright('[--lines <number>]')}`,
            `${clc.blackBright('→')} View the latest log entries`,
            '',
            `${clc.cyan('clear')}`,
            `${clc.blackBright('→')} Clear all log files`,
            '',
            `${clc.cyan('server')} ${clc.blackBright('--server <name> [--lines <number>]')}`,
            `${clc.blackBright('→')} View logs for a specific server`
        ]);
        Logger.emptyLine();
    }

    private async handleList(flags: Map<string, string | boolean>): Promise<void> {
        const serverName = flags.get('server') as string;
        const logFiles = serverName ? Logger.getServerLogFiles(serverName) : Logger.getLogFiles();

        if (logFiles.length === 0) {
            Logger.emptyLine();
            BoxRenderer.createBox('No Logs Found', [
                serverName 
                    ? `No logs found for server: ${clc.white(serverName)}`
                    : 'No application logs found'
            ]);
            Logger.emptyLine();
            return;
        }

        const content = logFiles.map(file => {
            const date = file.date.toLocaleString();
            return `${clc.cyan(file.name)}\n${clc.blackBright(`→ Last modified: ${date}`)}`;
        });

        Logger.emptyLine();
        BoxRenderer.createBox(
            serverName ? `Server Logs: ${serverName}` : 'Application Logs',
            content
        );
        Logger.emptyLine();
    }

    private async handleView(flags: Map<string, string | boolean>): Promise<void> {
        const lines = Number(flags.get('lines')) || 50;
        const logFiles = Logger.getLogFiles();

        if (logFiles.length === 0) {
            Logger.error('No log files found');
            return;
        }

        const latestLog = logFiles[0];
        const logContent = Logger.getLogContent(latestLog.name, lines);

        if (logContent.length === 0) {
            Logger.error('Log file is empty');
            return;
        }

        Logger.emptyLine();
        BoxRenderer.createBox(`Latest Logs (${logContent.length} lines)`, [
            `${clc.blackBright('File:')} ${clc.cyan(latestLog.name)}`,
            `${clc.blackBright('Last Modified:')} ${latestLog.date.toLocaleString()}`,
            '',
            ...logContent
        ]);
        Logger.emptyLine();
    }

    private async handleClear(flags: Map<string, string | boolean>): Promise<void> {
        const serverName = flags.get('server') as string;

        if (serverName) {
            const server = Server.loadServerData(serverName);
            if (!server) {
                Logger.error(`Server ${clc.white(serverName)} not found`);
                return;
            }

            Logger.clearServerLogs(serverName);
            Logger.success(`Cleared logs for server: ${clc.white(serverName)}`);
        } else {
            Logger.clearLogs();
            Logger.success('Cleared all application logs');
        }
    }

    private async handleServerLogs(flags: Map<string, string | boolean>): Promise<void> {
        const serverName = flags.get('server') as string;
        if (!serverName) {
            Logger.error('Server name is required');
            return;
        }

        const server = Server.loadServerData(serverName);
        if (!server) {
            Logger.error(`Server ${clc.white(serverName)} not found`);
            return;
        }

        const lines = Number(flags.get('lines')) || 50;
        const logFiles = Logger.getServerLogFiles(serverName);

        if (logFiles.length === 0) {
            Logger.emptyLine();
            BoxRenderer.createBox('No Server Logs', [
                `No logs found for server: ${clc.white(serverName)}`,
                '',
                `${clc.blackBright('→')} Logs will be created when the server is started`
            ]);
            Logger.emptyLine();
            return;
        }

        const latestLog = logFiles[0];
        const logContent = Logger.getServerLogContent(serverName, latestLog.name, lines);

        Logger.emptyLine();
        BoxRenderer.createBox(`Server Logs: ${serverName}`, [
            `${clc.blackBright('File:')} ${clc.cyan(latestLog.name)}`,
            `${clc.blackBright('Last Modified:')} ${latestLog.date.toLocaleString()}`,
            '',
            ...logContent
        ]);
        Logger.emptyLine();
    }
} 