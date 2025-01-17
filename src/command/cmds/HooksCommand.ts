import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { Hooks } from '../../utils/Hooks';
import { FileSystem } from '../../utils/FileSystem';
import path from 'path';
import clc from 'cli-color';
import fs from 'fs';

export default class HooksCommand extends Command {
    constructor() {
        super({
            name: 'hooks',
            description: 'Manage event hooks',
            category: 'Utility',
            aliases: ['hook'],
            usage: 'hooks <command> [options]',
            examples: [
                'hooks list',
                'hooks list server:playerJoin',
                'hooks clear',
                'hooks clear server:playerJoin',
                'hooks register'
            ],
            options: [
                {
                    name: 'event',
                    description: 'Event name to manage hooks for',
                    type: 'string'
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args[0]?.toLowerCase();
        const event = flags.get('event') as string || args[1];

        switch (subcommand) {
            case 'list':
                await this.handleList(event);
                break;
            case 'clear':
                await this.handleClear(event);
                break;
            case 'register':
                await this.handleRegister();
                break;
            default:
                if (subcommand) {
                    Logger.error(`Unknown subcommand: ${subcommand}`);
                }
                this.showHooksHelp();
                break;
        }
    }

    private showHooksHelp(): void {
        Logger.emptyLine();
        BoxRenderer.createBox('Hooks Management', [
            clc.yellow('Available Commands:'),
            '',
            `${clc.cyan('list')} ${clc.blackBright('[--event <event>]')}`,
            `${clc.blackBright('→')} List all hooks or hooks for a specific event`,
            '',
            `${clc.cyan('clear')} ${clc.blackBright('[--event <event>]')}`,
            `${clc.blackBright('→')} Clear all hooks or hooks for a specific event`,
            '',
            `${clc.cyan('register')}`,
            `${clc.blackBright('→')} Register hook files (*.phook.ts)`,
            '',
            clc.yellow('Available Events:'),
            '',
            'Server Events:',
            `${clc.blackBright('→')} server:initialize, server:beforeStart, server:afterStart`,
            `${clc.blackBright('→')} server:beforeStop, server:afterStop, server:error`,
            `${clc.blackBright('→')} server:save, server:beforeConfigUpdate, server:afterConfigUpdate`,
            '',
            'Player Events:',
            `${clc.blackBright('→')} server:playerJoin, server:playerLeave, server:playerChat`,
            `${clc.blackBright('→')} server:playerKick, server:broadcast`,
            '',
            'Console Events:',
            `${clc.blackBright('→')} server:enterConsole, server:exitConsole`
        ]);
        Logger.emptyLine();
    }

    private async handleList(event?: string): Promise<void> {
        if (event) {
            const hooks = Hooks.getHooks(event);
            Logger.emptyLine();
            if (hooks.length === 0) {
                BoxRenderer.createBox(`Hooks for ${event}`, [
                    'No hooks registered for this event.',
                    '',
                    `${clc.blackBright('→')} Use a plugin to register hooks for this event`
                ]);
            } else {
                BoxRenderer.createBox(`Hooks for ${event}`, hooks.map(hook => 
                    `${clc.blackBright('→')} Priority: ${clc.cyan(hook.priority)}`
                ));
            }
            Logger.emptyLine();
            return;
        }

        const allEvents = Array.from(new Set(
            Array.from(Hooks.getHooks('').values())
                .map(hook => hook.name)
        )).sort();

        Logger.emptyLine();
        if (allEvents.length === 0) {
            BoxRenderer.createBox('Registered Hooks', [
                'No hooks are currently registered.',
                '',
                `${clc.blackBright('→')} Use a plugin to register hooks for events`
            ]);
        } else {
            BoxRenderer.createBox('Registered Hooks', allEvents.map(event => {
                const hooks = Hooks.getHooks(event);
                return `${clc.cyan(event)}: ${hooks.length} hook${hooks.length === 1 ? '' : 's'}`;
            }));
        }
        Logger.emptyLine();
    }

    private async handleClear(event?: string): Promise<void> {
        if (event) {
            const hadHooks = Hooks.hasHooks(event);
            Hooks.clear(event);
            Logger.emptyLine();
            BoxRenderer.createBox('Hooks Cleared', [
                `${clc.blackBright('Event:')} ${clc.white(event)}`,
                `${clc.blackBright('Status:')} ${hadHooks ? clc.green('Cleared') : clc.yellow('No hooks found')}`
            ]);
            Logger.emptyLine();
            return;
        }

        Hooks.clear();
        Logger.emptyLine();
        BoxRenderer.createBox('Hooks Cleared', [
            `${clc.blackBright('Status:')} ${clc.green('All hooks cleared successfully')}`
        ]);
        Logger.emptyLine();
    }

    private async handleRegister(): Promise<void> {
        const hooksDir = path.join(FileSystem.getWorkspacePath(), 'hooks');
        FileSystem.ensureDirectoryExists(hooksDir);

        const files: string[] = [];
        const readDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    readDir(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.phook.ts')) {
                    files.push(fullPath);
                }
            }
        };
        readDir(hooksDir);

        let registered = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const relativePath = path.relative(hooksDir, file);
                try {
                    require(path.join(process.cwd(), file));
                    registered++;
                    Logger.debug(`Registered hook file: ${relativePath}`);
                } catch (err) {
                    errors++;
                    Logger.error(`Failed to register hook file: ${relativePath}`);
                    Logger.error(err instanceof Error ? err.message : String(err));
                }
            } catch (err) {
                errors++;
                Logger.error('Failed to process hook file');
                Logger.error(err instanceof Error ? err.message : String(err));
            }
        }

        Logger.emptyLine();
        BoxRenderer.createBox('Hooks Registration', [
            `${clc.blackBright('Directory:')} ${clc.white(hooksDir)}`,
            `${clc.blackBright('Pattern:')} ${clc.white('*.phook.ts')}`,
            `${clc.blackBright('Files Found:')} ${clc.white(files.length)}`,
            `${clc.blackBright('Registered:')} ${registered > 0 ? clc.green(registered) : clc.yellow('0')}`,
            `${clc.blackBright('Errors:')} ${errors > 0 ? clc.red(errors) : clc.green('0')}`,
            '',
            `${clc.blackBright('→')} Place hook files in this directory to register them`
        ]);
        Logger.emptyLine();
    }
} 