import { BoxRenderer } from "../../utils/BoxRenderer";
import { Logger } from "../../utils/Logger";
import { ServerCommandDefinition, ServerCommandManager } from "../ServerCommand";

export default {

  name: 'help',
  description: 'Displays help information for the server',
  aliases: ['h'],
  async execute({ server, args, cmds }) {
    await ServerCommandManager.printHelp();
  }

} as ServerCommandDefinition;