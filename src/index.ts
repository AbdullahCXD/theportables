import { FileSystem } from './utils/FileSystem';
import { Logger } from './utils/Logger';
import { BoxRenderer } from './utils/BoxRenderer';
import { CommandManager } from './command/CommandManager';
import { Readline } from './utils/Readline';
import figlet from 'figlet';
import clc from 'cli-color';

// Initialize core systems
FileSystem.initialize();
BoxRenderer.initialize();

async function main() {
    Logger.clear();
    
    // Create banner
    Logger.emptyLine();
    const banner = figlet.textSync('Portables', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });


    BoxRenderer.createBox('Welcome', [
        ...banner.split('\n'),
        '',
        clc.blackBright('Minecraft Debugging & Development Pentesting tool'),
        clc.blackBright('Type help to get started')
    ]);
    
    Logger.emptyLine();
    Logger.divider();
    Logger.emptyLine();

    await CommandManager.initialize();

    const readline = Readline.getInstance();
    
    // Set up event handlers
    readline.onLine(async (line) => {
        try {
            await CommandManager.executeCommand(line);
        } catch (error) {
            if (error instanceof Error) {
                Logger.error(error.message);
            } else {
                Logger.error('An unknown error occurred');
            }
        }
        readline.prompt();
    });

    readline.onClose(() => {
        Logger.info('Goodbye!');
        process.exit(0);
    });

    // Start the prompt
    readline.prompt();
}

main().catch((error) => {
    Logger.error('Fatal error:');
    Logger.error(error.message);
    process.exit(1);
});
