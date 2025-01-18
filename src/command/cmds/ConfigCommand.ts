import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { DEFAULT_CONFIG } from '../../config/constants';
import { FileSystem } from '../../utils/FileSystem';
import { PortablesDocs } from '../../utils/PortablesDocs';
import clc from 'cli-color';
import path from 'path';
import yaml from 'yaml';

export default class ConfigCommand extends Command {
    private readonly CONFIG_FILE = 'config.portables.yaml';

    constructor() {
        super({
            name: 'config',
            description: 'Manage configuration settings',
            category: 'Utility',
            aliases: ['cfg', 'settings'],
            usage: 'config <command> [options]',
            examples: [
                'config list',
                'config get server.port',
                'config get logging.colors.success', 
                'config set server.port 25565',
                'config reset'
            ],
            options: [
                {
                    name: 'key',
                    description: 'Configuration key (e.g., server.port, logging.colors.success)',
                    type: 'string'
                },
                {
                    name: 'value', 
                    description: 'New value for the configuration',
                    type: 'string'
                },
                {
                    name: 'force',
                    description: 'Force the operation without confirmation',
                    type: 'boolean'
                }
            ]
        });
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args.get('command')?.toLowerCase();

        const handlers: Record<string, () => Promise<void>> = {
            list: () => this.handleList(),
            ls: () => this.handleList(),
            get: () => this.handleGet(flags.get('key') as string),
            set: () => this.handleSet(flags.get('key') as string, flags.get('value') as string),
            reset: () => this.handleReset(flags.get('force') as boolean)
        };

        const handler = handlers[subcommand];
        if (handler) {
            await handler();
        } else {
            if (subcommand) {
                Logger.error(`Unknown subcommand: ${subcommand}`);
            }
            this.showConfigHelp();
        }
    }

    private showConfigHelp(): void {
        Logger.emptyLine();
        BoxRenderer.createBox('Configuration Management', [
            clc.yellow('Available Commands:'),
            '',
            `${clc.cyan('list')}`,
            `${clc.blackBright('→')} List all configuration settings`,
            '',
            `${clc.cyan('get')} ${clc.blackBright('--key <key>')}`,
            `${clc.blackBright('→')} Get a specific configuration value`,
            `${clc.blackBright('→')} Example: logging.colors.success`,
            '',
            `${clc.cyan('set')} ${clc.blackBright('--key <key> --value <value>')}`,
            `${clc.blackBright('→')} Set a configuration value`,
            `${clc.blackBright('→')} Example: server.port 25565`,
            '',
            `${clc.cyan('reset')} ${clc.blackBright('[--force]')}`,
            `${clc.blackBright('→')} Reset configuration to defaults`
        ]);
        Logger.emptyLine();
    }

    private async handleList(): Promise<void> {
        const config = this.loadConfig();
        const content: string[] = [];

        const formatValue = (value: unknown, path = '', indent = 0): string[] => {
            const prefix = ' '.repeat(indent);
            const doc = PortablesDocs.getDoc(path);
            const formatDoc = (doc: string) => doc ? ` ${clc.blackBright('# ' + doc)}` : '';

            if (typeof value === 'object' && value !== null) {
                return Object.entries(value).flatMap(([key, val]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    const currentDoc = PortablesDocs.getDoc(currentPath);

                    if (typeof val === 'object' && val !== null) {
                        return [
                            `${prefix}${clc.yellow(key + ':')}${formatDoc(currentDoc)}`,
                            ...formatValue(val, currentPath, indent + 2)
                        ];
                    }

                    return [
                        `${prefix}${clc.blackBright('→')} ${clc.white(key)}: ${clc.cyan(JSON.stringify(val))}${formatDoc(currentDoc)}`
                    ];
                });
            }

            return [`${prefix}${clc.blackBright('→')} ${clc.cyan(JSON.stringify(value))}${formatDoc(doc)}`];
        };

        content.push(...formatValue(config));

        Logger.emptyLine();
        BoxRenderer.createBox('Configuration Settings', content);
        Logger.emptyLine();
    }

    private async handleGet(key?: string): Promise<void> {
        if (!key) {
            Logger.error('Configuration key is required (--key)');
            return;
        }

        const config = this.loadConfig();
        const value = this.getConfigValue(config, key);

        if (value === undefined) {
            Logger.error(`Invalid configuration key: ${key}`);
            return;
        }

        const doc = PortablesDocs.getDoc(key);
        Logger.emptyLine();
        BoxRenderer.createBox('Configuration Value', [
            `${clc.blackBright('Key:')}   ${clc.white(key)}`,
            `${clc.blackBright('Value:')} ${clc.cyan(JSON.stringify(value))}`,
            ...(doc ? [`${clc.blackBright('Doc:')}   ${clc.white(doc)}`] : [])
        ]);
        Logger.emptyLine();
    }

    private async handleSet(key?: string, value?: string): Promise<void> {
        if (!key || !value) {
            Logger.error('Both key and value are required (--key, --value)');
            return;
        }

        if (PortablesDocs.isReadOnly(key)) {
            Logger.error(`Configuration key is read-only: ${key}`);
            return;
        }

        const config = this.loadConfig();
        const oldValue = this.getConfigValue(config, key);

        if (oldValue === undefined) {
            Logger.error(`Invalid configuration key: ${key}`);
            return;
        }

        try {
            const parsedValue = yaml.parse(value);
            this.setConfigValue(config, key, parsedValue);
            this.saveConfig(config);
            
            const doc = PortablesDocs.getDoc(key);
            Logger.emptyLine();
            BoxRenderer.createBox('Configuration Updated', [
                `${clc.blackBright('Key:')}      ${clc.white(key)}`,
                `${clc.blackBright('Old Value:')} ${clc.red(JSON.stringify(oldValue))}`,
                `${clc.blackBright('New Value:')} ${clc.green(JSON.stringify(parsedValue))}`,
                ...(doc ? [`${clc.blackBright('Doc:')}       ${clc.white(doc)}`] : [])
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Invalid value format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleReset(force?: boolean): Promise<void> {
        if (!force) {
            Logger.emptyLine();
            BoxRenderer.createBox('Reset Confirmation', [
                'Are you sure you want to reset all configuration settings?',
                '',
                `${clc.blackBright('→')} This will restore all settings to their defaults`,
                `${clc.blackBright('→')} Use ${clc.cyan('--force')} to skip confirmation`
            ]);
            Logger.emptyLine();
            return;
        }

        this.saveConfig(DEFAULT_CONFIG);
        Logger.emptyLine();
        BoxRenderer.createBox('Configuration Reset', [
            `${clc.blackBright('Status:')} ${clc.green('Success')}`,
            `${clc.blackBright('→')} All settings have been restored to defaults`
        ]);
        Logger.emptyLine();
    }

    private getConfigValue(obj: unknown, path: string): unknown {
        return path.split('.').reduce((current: any, key) => 
            current && typeof current === 'object' ? current[key] : undefined, obj);
    }

    private setConfigValue(obj: any, path: string, value: unknown): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            current[key] = current[key] || {};
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    private loadConfig(): unknown {
        const configPath = path.join(this.CONFIG_FILE);
        return FileSystem.fileExists(configPath)
            ? yaml.parse(FileSystem.readFile(configPath))
            : DEFAULT_CONFIG;
    }

    private saveConfig(config: unknown): void {
        FileSystem.writeFile(path.join(this.CONFIG_FILE), yaml.stringify(config));
    }
}