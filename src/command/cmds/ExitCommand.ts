import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import clc from 'cli-color';
import { Server } from '../../server/Server';

export default class ExitCommand extends Command {
    constructor() {
        super({
            name: 'exit',
            description: 'Exit the application',
            category: 'General',
            aliases: ['quit', 'q'],
            examples: [
                'exit',
                'exit --force',
                'exit --safe'
            ],
            arguments: [
                {
                  name: 'code',
                  description: 'The exit code to use',
                  type: 'number',
                  required: false
                }
            ],
            options: [
                {
                    name: 'force',
                    description: 'Force exit without confirmation',
                    type: 'boolean'
                },
                {
                    name: 'safe',
                    description: 'Safe exit mode (cannot be used with --force)',
                    type: 'boolean'
                },
                {
                    name: 'help',
                    description: 'Show help message',
                    type: 'boolean'
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { flags, args } = context;
        const force = flags.get('force');
        const safe = flags.get('safe');
        const help = flags.get('help');
        const code = args.get('code') ?? 0;

        if (help) {
          Logger.emptyLine();
          BoxRenderer.createBox('Exiting Application', [
              'Are you sure you want to exit?',
              '',
              `${clc.blackBright('→')} All running servers will be stopped`,
              `${clc.blackBright('→')} Use ${clc.cyan('exit --force')} to skip confirmation`,
              `${clc.blackBright('→')} Use ${clc.cyan('exit --safe')} for safe mode exit`,
              '',
              `${clc.blackBright('→')} ${clc.cyan('Note:')} Using safe without any options will result in a safe exit.`
          ]);
          Logger.emptyLine();
          return;
        }

        if (force && safe) {
            Logger.error('Cannot use --force and --safe together');
            return;
        }

        if (force) {
            Logger.info('Force mode exit initiated...');
            process.exit(code);
        }

        Logger.info('Safe mode exit initiated...');

        const currentRunningServers = Server.getRunningServers();
        Logger.debug("Currently running servers: " + currentRunningServers.size + " servers!");
        if (currentRunningServers.size > 0) {
            Logger.debug("Stopping all running servers...");
            currentRunningServers.forEach((server) => {
                server.stopServer();
            });
        }

        process.exit(code);
    }
}
