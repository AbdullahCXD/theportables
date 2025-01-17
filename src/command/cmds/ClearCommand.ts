import { Command, CommandContext } from "../Command";
import { Logger } from "../../utils/Logger";

export default class ClearCommand extends Command {
    constructor() {
        super({
            name: "clear",
            description: "Clear the console screen",
            category: "Utility",
            aliases: ["cls"],
            usage: "clear",
            examples: ["clear"]
        });
    }

    protected async run(_context: CommandContext): Promise<void> {
        Logger.clear();
    }
}