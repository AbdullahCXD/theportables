import { WebhookClient } from 'discord.js';

export function createDiscordWebhook(webhookUrl: string): WebhookClient {
    const webhook = new WebhookClient({ url: webhookUrl });
    return webhook;
}