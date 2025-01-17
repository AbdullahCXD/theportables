import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { DEFAULT_CONFIG } from '../../config/constants';
import clc from 'cli-color';
import { CommandBuilder } from '../CommandBuilder';

export default class VersionCommand extends Command {
    constructor() {
        super(CommandBuilder.builder()
            .setName('version')
            .setDescription('Show version information')
            .setCategory('Utility')
            .setAliases(['ver', 'v', 'software', 'build', 'portables'])
            .setUsage('version')
            .addExample('version')
            .build()
        );
    }

    protected async run(_context: CommandContext): Promise<void> {
        const versionInfo = [
            {
                label: 'Version',
                value: DEFAULT_CONFIG.VERSION,
                color: clc.cyan
            },
            {
                label: 'Build',
                value: DEFAULT_CONFIG.BUILD_NUMBER || 'development',
                color: clc.white
            },
            {
                label: 'Environment',
                value: DEFAULT_CONFIG.ENV || 'development',
                color: clc.green
            }
        ];

        Logger.emptyLine();
        BoxRenderer.createBox('Portables Information', [
            ...versionInfo.map(info => 
                `${clc.blackBright(`${info.label}:`)}     ${info.color(info.value)}`
            ),
            '',
            `${clc.blackBright('→')} Report issues at ${clc.cyan(DEFAULT_CONFIG.REPO_URL || 'https://github.com/abdullahcxd/portables')}`
        ]);
        Logger.emptyLine();
    }
}