import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { createDiscordWebhook } from '../../discord/DiscordWebhook';
import clc from 'cli-color';

export default class DiscordCommand extends Command {
    constructor() {
        super({
            name: 'discord',
            description: 'Manage Discord integrations',
            category: 'Integration',
            aliases: ['dc'],
            usage: 'discord <command> [options]',
            examples: [
                'discord webhook send "Hello from CLI!"',
                'discord webhook send "Server starting..." --webhook https://discord.com/api/webhooks/...'
            ],
            options: [
                {
                    name: 'webhook',
                    description: 'Discord webhook URL',
                    type: 'string',
                    required: false
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'webhook':
                await this.handleWebhook(args.slice(1), flags);
                break;
            default:
                this.showHelp();
                break;
        }
    }

    private async handleWebhook(args: string[], flags: Map<string, string | boolean>): Promise<void> {
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'send':
                await this.handleWebhookSend(args.slice(1), flags);
                break;
            default:
                this.showHelp();
                break;
        }
    }

    private async handleWebhookSend(args: string[], flags: Map<string, string | boolean>): Promise<void> {
        const message = args.join(' ');
        const webhookUrl = flags.get('webhook');

        if (!message) {
            Logger.error('Message is required');
            return;
        }

        if (!webhookUrl || typeof webhookUrl !== 'string') {
            Logger.error('Webhook URL is required (--webhook)');
            return;
        }

        try {
            const webhook = createDiscordWebhook(webhookUrl);
            await webhook.send(message);
            
            Logger.emptyLine();
            BoxRenderer.createBox('Discord Message Sent', [
                `${clc.blackBright('Message:')} ${clc.white(message)}`,
                `${clc.blackBright('Status:')}  ${clc.green('Success')}`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to send Discord message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
