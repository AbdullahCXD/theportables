import { Command } from './Command';
import { CommandManager } from './CommandManager';
import { Logger } from '../utils/Logger';
import { FileSystem } from '../utils/FileSystem';
import path from 'path';

export class CommandLoader {
    private static readonly COMMANDS_DIR = path.join(__dirname, 'cmds');

    public static async loadCommands(): Promise<void> {
        try {
            // Get all command files
            const files = FileSystem.listFiles(this.COMMANDS_DIR)
                .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
                .filter(file => !file.endsWith('.d.ts'));

            Logger.debug(`Found ${files.length} command files`);

            // Load each command
            for (const file of files) {
                try {
                    const filePath = path.join(this.COMMANDS_DIR, file);
                    const CommandClass = require(filePath).default;

                    if (CommandClass?.prototype instanceof Command) {
                        const command = new CommandClass();
                        CommandManager.registerCommand(command);
                        Logger.debug(`Loaded command: ${command.definition.name}`);
                    } else {
                        Logger.warn(`Invalid command file: ${file} (must export a class extending Command)`);
                    }
                } catch (error) {
                    Logger.error(`Failed to load command file: ${file}`);
                    Logger.error(error instanceof Error ? error.message : 'Unknown error');
                }
            }

            Logger.debug('Finished loading commands');
        } catch (error) {
            Logger.error('Failed to load commands');
            Logger.error(error instanceof Error ? error.message : 'Unknown error');
        }
    }
} 