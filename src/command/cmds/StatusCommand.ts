import { Command, CommandContext } from '../Command';
import { Logger } from '../../utils/Logger';
import { BoxRenderer } from '../../utils/BoxRenderer';
import { Server } from '../../server/Server';
import { FileSystem } from '../../utils/FileSystem';
import clc from 'cli-color';
import os from 'os';
import path from 'path';

export default class StatusCommand extends Command {
    constructor() {
        super({
            name: 'status',
            description: 'Show system status',
            category: 'Utility',
            aliases: ['stat', 'info'],
            usage: 'status',
            examples: ['status']
        });
    }

    protected async run(_context: CommandContext): Promise<void> {
        const servers = Server.getServers();
        const runningServers = Server.getRunningServers();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory * 100).toFixed(1);

        Logger.emptyLine();
        BoxRenderer.createBox('System Status', [
            `${clc.blackBright('System:')}`,
            `  ${clc.blackBright('→')} Platform:  ${clc.white(os.platform())} ${os.arch()}`,
            `  ${clc.blackBright('→')} Memory:    ${clc.cyan(this.formatBytes(usedMemory))} / ${this.formatBytes(totalMemory)} (${clc.yellow(memoryUsage)}%)`,
            `  ${clc.blackBright('→')} Uptime:    ${clc.green(this.formatUptime(os.uptime()))}`,
            '',
            `${clc.blackBright('Servers:')}`,
            `  ${clc.blackBright('→')} Total:     ${clc.white(servers.length.toString())}`,
            `  ${clc.blackBright('→')} Running:   ${clc.green(runningServers.size.toString())}`,
            `  ${clc.blackBright('→')} Stopped:   ${clc.red((servers.length - runningServers.size).toString())}`,
            '',
            `${clc.blackBright('Storage:')}`,
            `  ${clc.blackBright('→')} Workspace: ${clc.cyan(FileSystem.getWorkspacePath())}`,
            ...this.getStorageInfo()
        ]);
        Logger.emptyLine();
    }

    private formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (parts.length === 0) parts.push('Just started');

        return parts.join(' ');
    }

    private getStorageInfo(): string[] {
        const paths = {
            'Servers': FileSystem.getServersPath(),
            'Backups': path.join(FileSystem.getWorkspacePath(), 'backups'),
            'Logs': FileSystem.getLogsPath()
        };

        return Object.entries(paths).map(([name, dirPath]) => {
            if (!FileSystem.fileExists(dirPath)) return `  ${clc.blackBright('→')} ${name}:      ${clc.red('Not found')}`;
            
            const size = this.getDirectorySize(dirPath);
            return `  ${clc.blackBright('→')} ${name}:      ${clc.cyan(this.formatBytes(size))}`;
        });
    }

    private getDirectorySize(dirPath: string): number {
        if (!FileSystem.fileExists(dirPath)) return 0;

        let size = 0;
        const files = FileSystem.listFiles(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = FileSystem.getFileData(filePath);
            
            if (FileSystem.fileExists(filePath)) {
                if (stats.size > 0) {
                    size += stats.size;
                } else {
                    size += this.getDirectorySize(filePath);
                }
            }
        }

        return size;
    }
} 