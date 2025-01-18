import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { BackupManager } from '../../utils/BackupManager';
import clc from 'cli-color';
import { CommandBuilder } from '../CommandBuilder';

export default class BackupCommand extends Command {
    constructor() {
        super(CommandBuilder.builder()
            .setName('backup')
            .setDescription('Manage server backups')
            .setCategory('Server')
            .setAliases(['bak'])
            .setUsage('backup <command> [options]')
            .addArgument({
                name: 'command',
                description: 'The command to execute (create/list/restore/delete)',
                type: 'string',
                required: true
            })
            .addOption({
                name: 'server',
                description: 'Name of the server',
                type: 'string',
                required: true
            })
            .addOption({
                name: 'backup',
                description: 'Name of the backup',
                type: 'string'
            })
            .addOption({
                name: 'name',
                description: 'Custom name for the backup (create only)',
                type: 'string'
            })
            .addOption({
                name: 'force',
                description: 'Force the operation without confirmation',
                type: 'boolean'
            })
            .addExample('backup create --server myserver --name custom-backup')
            .addExample('backup list --server myserver')
            .addExample('backup restore --server myserver --backup latest --force')
            .addExample('backup delete --server myserver --backup old-backup --force')
            .build()
        );
    }

    protected async run(context: CommandContext): Promise<void> {
        const { args, flags } = context;
        const subcommand = args.get('command')?.toLowerCase();
        const serverName = flags.get('server') as string;

        if (!subcommand || !serverName) {
            this.showBackupHelp();
            return;
        }

        switch (subcommand) {
            case 'create':
                await this.handleCreate(serverName, flags);
                break;
            case 'list':
            case 'ls':
                await this.handleList(serverName);
                break;
            case 'restore':
                await this.handleRestore(serverName, flags);
                break;
            case 'delete':
            case 'rm':
                await this.handleDelete(serverName, flags);
                break;
            default:
                Logger.error(`Unknown subcommand: ${subcommand}`);
                this.showBackupHelp();
                break;
        }
    }

    private showBackupHelp(): void {
        Logger.emptyLine();
        BoxRenderer.createBox('Backup Management', [
            clc.yellow('Available Commands:'),
            '',
            `${clc.cyan('create')} ${clc.blackBright('--server <name> [--name <backup>]')}`,
            `${clc.blackBright('→')} Create a new backup`,
            '',
            `${clc.cyan('list')} ${clc.blackBright('--server <name>')}`,
            `${clc.blackBright('→')} List all backups`,
            '',
            `${clc.cyan('restore')} ${clc.blackBright('--server <name> --backup <name> --force')}`,
            `${clc.blackBright('→')} Restore a backup`,
            '',
            `${clc.cyan('delete')} ${clc.blackBright('--server <name> --backup <name> --force')}`,
            `${clc.blackBright('→')} Delete a backup`
        ]);
        Logger.emptyLine();
    }

    private async handleCreate(serverName: string, flags: Map<string, string | boolean>): Promise<void> {
        try {
            const options = {
                name: flags.get('name') as string | undefined,
                force: flags.get('force') as boolean | undefined
            };

            await BackupManager.createBackup(serverName, options);
            Logger.emptyLine();
            BoxRenderer.createBox('Backup Created', [
                `${clc.blackBright('Server:')} ${clc.white(serverName)}`,
                `${clc.blackBright('Name:')}   ${clc.cyan(options.name || 'auto-generated')}`,
                `${clc.blackBright('Status:')} ${clc.green('Success')}`,
                '',
                `${clc.blackBright('→')} Use ${clc.cyan(`backup list --server ${serverName}`)} to view backups`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleList(serverName: string): Promise<void> {
        try {
            const backups = await BackupManager.listBackups(serverName);
            
            if (backups.length === 0) {
                Logger.emptyLine();
                BoxRenderer.createBox('No Backups Found', [
                    `No backups found for server ${clc.white(serverName)}`,
                    '',
                    `${clc.blackBright('→')} Create one using ${clc.cyan(`backup create --server ${serverName}`)}`
                ]);
                Logger.emptyLine();
                return;
            }

            const content = backups.map((backup, index) => {
                const isLast = index === backups.length - 1;
                const date = new Date(backup.date).toLocaleString();
                const size = BackupManager.formatSize(backup.size);

                return [
                    `${clc.blackBright(isLast ? '└' : '├')} ${clc.white(backup.name)}`,
                    `${clc.blackBright(isLast ? ' ' : '│')}  Date: ${clc.cyan(date)}`,
                    `${clc.blackBright(isLast ? ' ' : '│')}  Size: ${clc.green(size)}`,
                    isLast ? '' : ''
                ];
            }).flat();

            Logger.emptyLine();
            BoxRenderer.createBox(`Backups for ${serverName} (${backups.length})`, content);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleRestore(serverName: string, flags: Map<string, string | boolean>): Promise<void> {
        const backupName = flags.get('backup') as string;
        if (!backupName) {
            Logger.error('Backup name is required (--backup)');
            return;
        }

        try {
            const options = {
                force: flags.get('force') as boolean | undefined
            };

            if (!options.force) {
                Logger.emptyLine();
                BoxRenderer.createBox('Restore Confirmation', [
                    `Are you sure you want to restore backup ${clc.cyan(backupName)}?`,
                    '',
                    `${clc.blackBright('→')} This will overwrite the current server files`,
                    `${clc.blackBright('→')} Use ${clc.cyan('--force')} to skip confirmation`
                ]);
                Logger.emptyLine();
                return;
            }

            await BackupManager.restoreBackup(serverName, backupName, options);
            Logger.emptyLine();
            BoxRenderer.createBox('Backup Restored', [
                `${clc.blackBright('Server:')} ${clc.white(serverName)}`,
                `${clc.blackBright('Backup:')} ${clc.cyan(backupName)}`,
                `${clc.blackBright('Status:')} ${clc.green('Success')}`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleDelete(serverName: string, flags: Map<string, string | boolean>): Promise<void> {
        const backupName = flags.get('backup') as string;
        if (!backupName) {
            Logger.error('Backup name is required (--backup)');
            return;
        }

        try {
            const options = {
                force: flags.get('force') as boolean | undefined
            };

            if (!options.force) {
                Logger.emptyLine();
                BoxRenderer.createBox('Delete Confirmation', [
                    `Are you sure you want to delete backup ${clc.cyan(backupName)}?`,
                    '',
                    `${clc.blackBright('→')} This action cannot be undone`,
                    `${clc.blackBright('→')} Use ${clc.cyan('--force')} to skip confirmation`
                ]);
                Logger.emptyLine();
                return;
            }

            await BackupManager.deleteBackup(serverName, backupName, options);
            Logger.emptyLine();
            BoxRenderer.createBox('Backup Deleted', [
                `${clc.blackBright('Server:')} ${clc.white(serverName)}`,
                `${clc.blackBright('Backup:')} ${clc.cyan(backupName)}`,
                `${clc.blackBright('Status:')} ${clc.green('Success')}`
            ]);
            Logger.emptyLine();
        } catch (error) {
            Logger.error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 