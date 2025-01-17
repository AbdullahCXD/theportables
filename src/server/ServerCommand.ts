import { Server } from './Server';
import { Logger } from '../utils/Logger';
import { BoxRenderer } from '../utils/BoxRenderer';
import clc from 'cli-color';
import SHelpCommand from './commands/SHelpCommand';

export interface ServerCommandContext {
    server: Server;
    args: string[];
    cmds: ServerCommandManager;
}

export interface ServerCommandDefinition {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    execute: (context: ServerCommandContext) => Promise<void>;
}

export class ServerCommandManager {
    private static commands: Map<string, ServerCommandDefinition> = new Map();
    private static aliases: Map<string, string> = new Map();

    public static initialize(): void {
        // Clear existing commands
        this.commands.clear();
        this.aliases.clear();

        this.registerCommand(SHelpCommand);

        this.registerCommand({
            name: 'list',
            description: 'Shows a list of online players',
            aliases: ['players', 'who'],
            async execute({ server }) {
                const players = server.getOnlinePlayers();
                const content = [
                    `${clc.blackBright('Online Players:')} ${clc.cyan(players.length.toString())}`,
                    '',
                    ...players.map(player => `${clc.white('•')} ${player}`)
                ];

                Logger.emptyLine();
                BoxRenderer.createBox('Player List', content);
                Logger.emptyLine();
            }
        });

        this.registerCommand({
            name: 'say',
            description: 'Broadcasts a message to all players',
            usage: 'say <message>',
            async execute({ server, args }) {
                if (args.length === 0) {
                    Logger.error('Usage: say <message>', server.getName());
                    return;
                }

                const message = args.join(' ');
                server.broadcast(`[Server] ${message}`);
                Logger.success(`Broadcasted message: ${message}`, server.getName());
            }
        });

        this.registerCommand({
            name: 'kick',
            description: 'Kicks a player from the server',
            usage: 'kick <player> [reason]',
            async execute({ server, args }) {
                if (args.length === 0) {
                    Logger.error('Usage: kick <player> [reason]', server.getName());
                    return;
                }

                const [player, ...reasonParts] = args;
                const reason = reasonParts.length > 0 ? reasonParts.join(' ') : 'Kicked by server';

                if (server.kickPlayer(player, reason)) {
                    Logger.success(`Kicked player ${clc.white(player)} (${reason})`, server.getName());
                } else {
                    Logger.error(`Player ${clc.white(player)} not found`, server.getName());
                }
            }
        });

        Logger.debug('Initialized server command system');
    }

    public static registerCommand(command: ServerCommandDefinition): void {
        this.commands.set(command.name, command);
        command.aliases?.forEach(alias => this.aliases.set(alias, command.name));
    }

    public static async executeCommand(server: Server, input: string): Promise<boolean> {
        const [commandName, ...args] = input.split(' ');
        const resolvedCommand = this.resolveCommand(commandName);

        if (!resolvedCommand) {
            return false;
        }

        try {
            await resolvedCommand.execute({ server, args, cmds: this });
            return true;
        } catch (error) {
            Logger.error(`Command error: ${error instanceof Error ? error.message : 'Unknown error'}`, server.getName());
            return true;
        }
    }

    private static resolveCommand(name: string): ServerCommandDefinition | null {
        return this.commands.get(name) || this.commands.get(this.aliases.get(name) || '') || null;
    }

    public static async printHelp(): Promise<void> {
        const content: string[] = [];
        
        // Convert commands Map to Array and sort by name
        Array.from(this.commands.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(cmd => {
                const description = cmd.description.length > 50 ? 
                    cmd.description.slice(0, 47) + '...' : 
                    cmd.description;
                
                const aliases = cmd.aliases?.length ? 
                    ` ${clc.blackBright(`(${cmd.aliases.join(', ')})`)}`  : 
                    '';

                content.push(`  ${clc.white(cmd.name)}${aliases}`);
                content.push(`    ${description}`);
                
                if (cmd.usage) {
                    content.push(`    ${clc.blackBright('Usage:')} ${cmd.usage}`);
                }
            });

        Logger.emptyLine();
        BoxRenderer.createBox('Available Commands', content);
        Logger.emptyLine();
    }
} 