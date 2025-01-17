import { CommandDefinition, CommandOption } from './Command';

export class CommandBuilder {

    public static builder(): CommandBuilder {
        return new CommandBuilder();
    }

    private definition: Partial<CommandDefinition> = {};

    public setName(name: string): CommandBuilder {
        this.definition.name = name;
        return this;
    }

    public setDescription(description: string): CommandBuilder {
        this.definition.description = description;
        return this;
    }

    public setUsage(usage: string): CommandBuilder {
        this.definition.usage = usage;
        return this;
    }

    public setAliases(aliases: string[]): CommandBuilder {
        this.definition.aliases = aliases;
        return this;
    }

    public setCategory(category: string): CommandBuilder {
        this.definition.category = category;
        return this;
    }

    public addOption(option: CommandOption): CommandBuilder {
        if (!this.definition.options) {
            this.definition.options = [];
        }
        this.definition.options.push(option);
        return this;
    }

    public addExample(example: string): CommandBuilder {
        if (!this.definition.examples) {
            this.definition.examples = [];
        }
        this.definition.examples.push(example);
        return this;
    }

    public build(): CommandDefinition {
        if (!this.definition.name) {
            throw new Error('Command name is required');
        }
        if (!this.definition.description) {
            throw new Error('Command description is required');
        }
        return this.definition as CommandDefinition;
    }
}
