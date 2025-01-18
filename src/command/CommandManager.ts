import { Logger } from '../utils/Logger';
import { BoxRenderer } from '../utils/BoxRenderer';
import { Command, CommandDefinition } from './Command';
import { CommandLoader } from './CommandLoader';
import clc from 'cli-color';

export class CommandManager {
    // Use WeakMap for better memory management with object references
    private static readonly commands = new Map<string, Command>();
    private static readonly aliases = new Map<string, string>();
    private static readonly categories = new Map<string, Set<CommandDefinition>>();
    private static initialized = false;

    public static async initialize(): Promise<void> {
        if (this.initialized) return;
        
        this.commands.clear();
        this.aliases.clear();
        this.categories.clear();

        // Load all commands from the cmds directory
        await CommandLoader.loadCommands();
        this.initialized = true;
        Logger.debug(`Initialized command system with ${this.commands.size} commands`);
    }

    public static registerCommand(command: Command): void {
        // Fast command registration
        const { name, aliases = [], category = 'General' } = command.definition;
        
        this.commands.set(name.toLowerCase(), command);
        
        // Register aliases using lowercase for case-insensitive lookup
        aliases.forEach(alias => {
            this.aliases.set(alias.toLowerCase(), name.toLowerCase());
        });

        // Use Set for O(1) category lookups
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category)!.add(command.definition);

        Logger.debug(`Registered command: ${name} ${aliases.length ? `(aliases: ${aliases.join(', ')})` : ''}`);
    }

    public static async executeCommand(input: string): Promise<boolean> {
        if (!this.initialized) await this.initialize();

        const [commandName, ...args] = input.trim().split(/\s+/);
        const command = this.resolveCommand(commandName.toLowerCase());

        if (!command) {
            return false;
        }

        try {
            await command.execute(input, args);
            return true;
        } catch (error) {
            Logger.error(`Command error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return true;
        }
    }

    public static resolveCommand(name: string): Command | null {
        // Fast command resolution using lowercase comparison
        return this.commands.get(name) || 
               this.commands.get(this.aliases.get(name) || '') || 
               null;
    }

    public static generateHelp(): void {
        const content: string[] = [];
        const sortedCategories = Array.from(this.categories.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        sortedCategories.forEach(([category, commands], index) => {
            if (index > 0) content.push('');
            content.push(clc.yellow(category.toUpperCase()));
            
            Array.from(commands)
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(cmd => {
                    const description = cmd.description.length > 50 ? 
                        cmd.description.slice(0, 47) + '...' : 
                        cmd.description;
                    
                    const aliases = cmd.aliases?.length ? 
                        ` ${clc.blackBright(`(${cmd.aliases.join(', ')})`)}`  : 
                        '';

                    const args = cmd.arguments?.map(arg => `<${arg.name}>`).join(' ') || '';
                    const displayName = args ? `${cmd.name} ${args}` : cmd.name;

                    content.push(`  ${clc.white(displayName)}${aliases}`);
                    content.push(`    ${description}`);
                    
                    if (cmd.usage) {
                        content.push(`    ${clc.blackBright('Usage:')} ${cmd.usage}`);
                    }
                });
        });

        Logger.emptyLine();
        BoxRenderer.createBox('Available Commands', content);
        Logger.emptyLine();
    }
}