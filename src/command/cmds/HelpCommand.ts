import { Command, CommandContext } from '../Command';
import { CommandManager } from '../CommandManager';
import { CommandBuilder } from '../CommandBuilder';

export default class HelpCommand extends Command {
    constructor() {
        super(
            new CommandBuilder()
                .setName('help')
                .setDescription('Shows a list of available commands or detailed help for a specific command')
                .setUsage('help [command]')
                .setAliases(['?', 'h'])
                .setCategory('General')
                .addExample('help')
                .addExample('help server')
                .addExample('help --all')
                .addOption({
                    name: 'all',
                    description: 'Show detailed help for all commands',
                    type: 'boolean'
                })
                .build()
        );
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;

        if (flags.get('all')) {
            // Show detailed help for all commands
            CommandManager.generateHelp();
            return;
        }

        if (args.size > 0) {
            // Show help for specific command
            const commandName = args.get('command');
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