import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { InjectionHooks } from '../../utils/InjectionHooks';
import { InjectionRegistry } from '../../utils/InjectionRegistry';
import { FileSystem } from '../../utils/FileSystem';
import path from 'path';
import clc from 'cli-color';
import fs from 'fs';
import { CommandBuilder } from '../CommandBuilder';

export default class InjectCommand extends Command {
    constructor() {
        super(
            new CommandBuilder()
                .setName('inject')
                .setDescription('Manage method injections')
                .setCategory('Utility')
                .setAliases(['injection'])
                .setUsage('inject <command> [options]')
                .addExample('inject list')
                .addExample('inject list Server.startServer')
                .addExample('inject list Server.startServer myserver')
                .addExample('inject clear')
                .addExample('inject clear Server.startServer')
                .addExample('inject clear Server.startServer myserver')
                .addExample('inject register')
                .addOption({
                    name: 'target',
                    description: 'Target method to manage injections for (e.g., Server.startServer)',
                    type: 'string'
                })
                .addOption({
                    name: 'id',
                    description: 'Instance ID (e.g., server name)',
                    type: 'string'
                })
                .build()
        );
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args.get('command')?.toLowerCase();
        const target = flags.get('target') as string || args.get('target');
        const id = flags.get('id') as string || args.get('id');

        switch (subcommand) {
            case 'list':
                await this.handleList(target, id);
                break;
            case 'clear':
                await this.handleClear(target, id);
                break;
            case 'register':
                await this.handleRegister();
                break;
            default:
                if (subcommand) {
                    Logger.error(`Unknown subcommand: ${subcommand}`);
                }
                this.showInjectHelp();
                break;
        }
    }

    private showInjectHelp(): void {
        const injectableClasses = InjectionRegistry.getAllClasses();
        
        Logger.emptyLine();
        BoxRenderer.createBox('Method Injection Management', [
            clc.yellow('Available Commands:'),
            '',
            `${clc.cyan('list')} ${clc.blackBright('[--target <class.method>] [--id <instance-id>]')}`,
            `${clc.blackBright('→')} List all injections or injections for a specific method`,
            '',
            `${clc.cyan('clear')} ${clc.blackBright('[--target <class.method>] [--id <instance-id>]')}`,
            `${clc.blackBright('→')} Clear all injections or injections for a specific method`,
            '',
            `${clc.cyan('register')}`,
            `${clc.blackBright('→')} Register injection files (*.pinject.ts)`,
            '',
            clc.yellow('Injectable Classes:'),
            '',
            ...(injectableClasses.length > 0 
                ? injectableClasses.map(className => {
                    const instances = InjectionRegistry.getInstances(className);
                    return `${clc.blackBright('→')} ${clc.cyan(className)} (${instances.length} instance${instances.length === 1 ? '' : 's'})`;
                })
                : [`${clc.blackBright('→')} No injectable classes registered`]
            ),
            '',
            clc.yellow('Injection Types:'),
            `${clc.blackBright('→')} before: Execute before the method`,
            `${clc.blackBright('→')} after: Execute after the method`,
            `${clc.blackBright('→')} around: Wrap the method execution`
        ]);
        Logger.emptyLine();
    }

    private async handleList(target?: string, id?: string): Promise<void> {
        if (target) {
            const [className, methodName] = target.split('.');
            if (!className || !methodName) {
                Logger.error('Invalid target format. Use <class.method> (e.g., Server.startServer)');
                return;
            }

            if (!InjectionRegistry.isInjectable(className)) {
                Logger.error(`Class ${className} is not injectable`);
                return;
            }

            let instances = id 
                ? [InjectionRegistry.getInstance(className, id)].filter(Boolean)
                : InjectionRegistry.getInstances(className);

            if (instances.length === 0) {
                Logger.error(`No instances found for class ${className}${id ? ` with ID ${id}` : ''}`);
                return;
            }

            Logger.emptyLine();
            for (const instance of instances) {
                const instanceId = id || instance?.constructor.name;
                const injections = InjectionHooks.getInjections(instance, methodName);
                
                if (injections.length === 0) {
                    BoxRenderer.createBox(`Injections for ${target} (${instanceId})`, [
                        'No injections registered for this method.',
                        '',
                        `${clc.blackBright('→')} Use a plugin to register injections for this method`
                    ]);
                } else {
                    BoxRenderer.createBox(`Injections for ${target} (${instanceId})`, injections.map(injection => 
                        `${clc.blackBright('→')} Type: ${clc.cyan(injection.type)}, Priority: ${clc.yellow(injection.priority)}`
                    ));
                }
                Logger.emptyLine();
            }
            return;
        }

        const injectableClasses = InjectionRegistry.getAllClasses();
        if (injectableClasses.length === 0) {
            Logger.emptyLine();
            BoxRenderer.createBox('Injectable Classes', [
                'No injectable classes registered.',
                '',
                `${clc.blackBright('→')} Classes must register with InjectionRegistry`
            ]);
            Logger.emptyLine();
            return;
        }

        Logger.emptyLine();
        BoxRenderer.createBox('Injectable Classes', [
            ...injectableClasses.flatMap(className => {
                const instances = InjectionRegistry.getInstances(className);
                return [
                    `${clc.cyan(className)}:`,
                    ...instances.map(instance => 
                        `${clc.blackBright('→')} Instance: ${clc.white(instance.constructor.name)}`
                    ),
                    ''
                ];
            }).slice(0, -1) // Remove last empty line
        ]);
        Logger.emptyLine();
    }

    private async handleClear(target?: string, id?: string): Promise<void> {
        if (target) {
            const [className, methodName] = target.split('.');
            if (!className || !methodName) {
                Logger.error('Invalid target format. Use <class.method> (e.g., Server.startServer)');
                return;
            }

            if (!InjectionRegistry.isInjectable(className)) {
                Logger.error(`Class ${className} is not injectable`);
                return;
            }

            let instances = id 
                ? [InjectionRegistry.getInstance(className, id)].filter(Boolean)
                : InjectionRegistry.getInstances(className);

            if (instances.length === 0) {
                Logger.error(`No instances found for class ${className}${id ? ` with ID ${id}` : ''}`);
                return;
            }

            let cleared = 0;
            for (const instance of instances) {
                if (InjectionHooks.hasInjections(instance, methodName)) {
                    InjectionHooks.clearInjections(instance, methodName);
                    cleared++;
                }
            }
            
            Logger.emptyLine();
            BoxRenderer.createBox('Injections Cleared', [
                `${clc.blackBright('Target:')} ${clc.white(target)}`,
                `${clc.blackBright('Instances:')} ${clc.white(instances.length)}`,
                `${clc.blackBright('Cleared:')} ${cleared > 0 ? clc.green(cleared) : clc.yellow('No injections found')}`
            ]);
            Logger.emptyLine();
            return;
        }

        InjectionHooks.clearInjections();
        Logger.emptyLine();
        BoxRenderer.createBox('Injections Cleared', [
            `${clc.blackBright('Status:')} ${clc.green('All method injections cleared successfully')}`
        ]);
        Logger.emptyLine();
    }

    private async handleRegister(): Promise<void> {
        const injectionsDir = path.join(FileSystem.getWorkspacePath(), 'injections');
        FileSystem.ensureDirectoryExists(injectionsDir);

        const files: string[] = [];
        const readDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    readDir(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.pinject.ts')) {
                    files.push(fullPath);
                }
            }
        };
        readDir(injectionsDir);

        let registered = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const relativePath = path.relative(injectionsDir, file);
                try {
                    require(path.join(process.cwd(), file));
                    registered++;
                    Logger.debug(`Registered injection file: ${relativePath}`);
                } catch (err) {
                    errors++;
                    Logger.error(`Failed to register injection file: ${relativePath}`);
                    Logger.error(err instanceof Error ? err.message : String(err));
                }
            } catch (err) {
                errors++;
                Logger.error('Failed to process injection file');
                Logger.error(err instanceof Error ? err.message : String(err));
            }
        }

        Logger.emptyLine();
        BoxRenderer.createBox('Injections Registration', [
            `${clc.blackBright('Directory:')} ${clc.white(injectionsDir)}`,
            `${clc.blackBright('Pattern:')} ${clc.white('*.pinject.ts')}`,
            `${clc.blackBright('Files Found:')} ${clc.white(files.length)}`,
            `${clc.blackBright('Registered:')} ${registered > 0 ? clc.green(registered) : clc.yellow('0')}`,
            `${clc.blackBright('Errors:')} ${errors > 0 ? clc.red(errors) : clc.green('0')}`,
            '',
            `${clc.blackBright('→')} Place injection files in this directory to register them`
        ]);
        Logger.emptyLine();
    }
} 