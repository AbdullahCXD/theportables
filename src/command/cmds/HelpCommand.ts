import { Command, CommandContext } from '../Command';
import { CommandManager } from '../CommandManager';

export default class HelpCommand extends Command {
    constructor() {
        super({
            name: 'help',
            description: 'Shows a list of available commands or detailed help for a specific command',
            usage: 'help [command]',
            aliases: ['?', 'h'],
            category: 'General',
            examples: [
                'help',
                'help server',
                'help --all'
            ],
            options: [
                {
                    name: 'all',
                    description: 'Show detailed help for all commands',
                    type: 'boolean'
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;

        if (flags.get('all')) {
            // Show detailed help for all commands
            CommandManager.generateHelp();
            return;
        }

        if (args.length > 0) {
            // Show help for specific command
            const commandName = args[0];
            const command = CommandManager['resolveCommand'](commandName);
            
            if (command) {
                command.execute(context.rawCommand, ['--help']);
            } else {
                CommandManager.generateHelp();
            }
        } else {
            // Show general help
            CommandManager.generateHelp();
        }
    }
}
  