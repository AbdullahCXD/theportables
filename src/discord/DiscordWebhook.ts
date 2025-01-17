import { WebhookClient } from 'discord.js';

export function createDiscordWebhook(webhookUrl: string, message: string): void {
    const webhook = new WebhookClient({ url: webhookUrl });
    webhook.send(message);
}