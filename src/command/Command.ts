import { Logger } from '../utils/Logger';
import { BoxRenderer } from '../utils/BoxRenderer';
import clc from 'cli-color';

export interface CommandContext {
    args: Map<string, any>;
    flags: Map<string, string | boolean>;
    rawCommand: string;
    rawArgs: string[];
}

export interface CommandOption {
    name: string;
    description: string;
    type: 'string' | 'boolean' | 'number';
    required?: boolean;
    default?: any;
}

export interface CommandArgument {
    name: string;
    description: string;
    type: 'string' | 'boolean' | 'number';
    required?: boolean;
    default?: any;
}

export interface CommandDefinition {
    name: string;
    description: string;
    usage?: string;
    aliases?: string[];
    category?: string;
    options?: CommandOption[];
    arguments?: CommandArgument[];
    examples?: string[];
}

export abstract class Command {
    public readonly definition: CommandDefinition;

    constructor(definition: CommandDefinition) {
        this.definition = definition;
    }

    protected parseFlags(args: string[]): { args: string[]; flags: Map<string, string | boolean> } {
        const flags = new Map<string, string | boolean>();
        const cleanArgs: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const flag = arg.slice(2);
                if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                    flags.set(flag, args[i + 1]);
                    i++; // Skip next argument as it's the flag value
                } else {
                    flags.set(flag, true);
                }
            } else if (arg.startsWith('-')) {
                const flag = arg.slice(1);
                flags.set(flag, true);
            } else {
                cleanArgs.push(arg);
            }
        }

        return { args: cleanArgs, flags };
    }

    protected validateOptions(flags: Map<string, string | boolean>): boolean {
        if (!this.definition.options) return true;

        for (const option of this.definition.options) {
            const value = flags.get(option.name);

            if (option.required && value === undefined) {
                Logger.error(`Missing required option: --${option.name}`);
                return false;
            }

            if (value !== undefined) {
                if (option.type === 'number' && isNaN(Number(value))) {
                    Logger.error(`Option --${option.name} must be a number`);
                    return false;
                }
                if (option.type === 'boolean' && typeof value !== 'boolean') {
                    Logger.error(`Option --${option.name} must be a boolean flag`);
                    return false;
                }
            }
        }

        return true;
    }

    protected validateArgs(args: string[]): boolean {
        if (!this.definition.arguments) return true;

        for (let i = 0; i < this.definition.arguments.length; i++) {
            const argDef = this.definition.arguments[i];
            const value = args[i];

            if (argDef.required && value === undefined) {
                Logger.error(`Missing required argument: ${argDef.name}`);
                return false;
            }

            if (value !== undefined) {
                if (argDef.type === 'number' && isNaN(Number(value))) {
                    Logger.error(`Argument ${argDef.name} must be a number`);
                    return false;
                }
                if (argDef.type === 'string' && typeof value !== 'string') {
                    Logger.error(`Argument ${argDef.name} must be a string`);
                    return false;
                }
                if (argDef.type === 'boolean') {
                    const boolValue = value.toLowerCase();
                    if (boolValue !== 'true' && boolValue !== 'false') {
                        Logger.error(`Argument ${argDef.name} must be true or false`);
                        return false;
                    }
                }
            }
        }

        return true;
    }

    protected showHelp(): void {
        const content: string[] = [
            `${clc.white(this.definition.name)} ${clc.blackBright(this.definition.aliases?.join(', ') || '')}`,
            '',
            this.definition.description
        ];

        if (this.definition.usage) {
            content.push('', `${clc.blackBright('Usage:')} ${this.definition.usage}`);
        }

        if (this.definition.arguments?.length) {
            content.push('', clc.blackBright('Arguments:'));
            this.definition.arguments.forEach(arg => {
                const required = arg.required ? ' (required)' : '';
                const defaultValue = arg.default ? ` (default: ${arg.default})` : '';
                content.push(`  ${arg.name} ${clc.blackBright(`<${arg.type}>${required}${defaultValue}`)}`);
                content.push(`    ${arg.description}`);
            });
        }

        if (this.definition.options?.length) {
            content.push('', clc.blackBright('Options:'));
            this.definition.options.forEach(option => {
                const required = option.required ? ' (required)' : '';
                const defaultValue = option.default ? ` (default: ${option.default})` : '';
                content.push(`  --${option.name} ${clc.blackBright(`<${option.type}>${required}${defaultValue}`)}`);
                content.push(`    ${option.description}`);
            });
        }

        if (this.definition.examples?.length) {
            content.push('', clc.blackBright('Examples:'));
            this.definition.examples.forEach(example => {
                content.push(`  ${example}`);
            });
        }

        Logger.emptyLine();
        BoxRenderer.createBox('Command Help', content);
        Logger.emptyLine();
    }

    public async execute(rawCommand: string, args: string[]): Promise<void> {
        const { args: cleanArgs, flags } = this.parseFlags(args);

        if (flags.has('help') || flags.has('h')) {
            this.showHelp();
            return;
        }

        if (!this.validateOptions(flags) || !this.validateArgs(cleanArgs)) {
            this.showHelp();
            return;
        }

        const parsedArgs = new Map<string, any>();
        if (this.definition.arguments) {
            this.definition.arguments.forEach((argDef, index) => {
                let value = cleanArgs[index];
                
                if (value === undefined && argDef.default !== undefined) {
                    value = argDef.default;
                }

                if (value !== undefined) {
                    switch (argDef.type) {
                        case 'number':
                            parsedArgs.set(argDef.name, Number(value));
                            break;
                        case 'boolean':
                            parsedArgs.set(argDef.name, value.toLowerCase() === 'true');
                            break;
                        default:
                            parsedArgs.set(argDef.name, value);
                    }
                }
            });
        }

        const context: CommandContext = {
            args: parsedArgs,
            flags,
            rawCommand,
            rawArgs: cleanArgs
        };

        await this.run(context);
    }

    protected abstract run(context: CommandContext): Promise<void>;
} 