import { FileSystem } from './FileSystem';
import { Logger } from './Logger';
import path from 'path';
import clc from 'cli-color';

export interface BackupInfo {
    name: string;
    date: string;
    size: number;
}

export interface BackupOptions {
    name?: string;
    force?: boolean;
}

export class BackupManager {
    private static readonly BACKUP_DATE_FORMAT = /backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/;
    private static readonly VALID_BACKUP_NAME = /^[a-zA-Z0-9-_]+$/;

    public static async createBackup(serverName: string, options: BackupOptions = {}): Promise<string> {
        const backupPath = this.getBackupPath(serverName);
        let backupName = options.name;

        if (backupName) {
            if (!this.VALID_BACKUP_NAME.test(backupName)) {
                throw new Error('Backup name can only contain letters, numbers, hyphens, and underscores');
            }
        } else {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            backupName = `backup-${timestamp}`;
        }

        const backupDir = path.join(backupPath, backupName);

        try {
            const serverPath = FileSystem.getServerPath(serverName);
            if (!FileSystem.fileExists(serverPath)) {
                throw new Error(`Server ${serverName} not found`);
            }

            if (FileSystem.fileExists(backupDir) && !options.force) {
                throw new Error(`Backup ${backupName} already exists. Use --force to overwrite`);
            }

            if (FileSystem.fileExists(backupDir)) {
                await FileSystem.deleteDirectory(backupDir);
            }

            FileSystem.ensureDirectoryExists(backupPath);
            await FileSystem.copyDirectory(serverPath, backupDir);

            Logger.success(`Created backup ${clc.cyan(backupName)} for server ${clc.white(serverName)}`, serverName);
            return backupDir;
        } catch (error) {
            Logger.error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`, serverName);
            throw error;
        }
    }

    public static async listBackups(serverName: string): Promise<BackupInfo[]> {
        const backupPath = this.getBackupPath(serverName);
        if (!FileSystem.fileExists(backupPath)) {
            return [];
        }

        const backups = await FileSystem.listFiles(backupPath);
        const backupInfos: BackupInfo[] = [];

        for (const backup of backups) {
            if (FileSystem.fileExists(path.join(backupPath, backup))) {
                const { size, modified } = await FileSystem.getFileData(path.join(backupPath, backup));
                backupInfos.push({
                    name: backup,
                    date: modified.toISOString(),
                    size
                });
            }
        }

        return backupInfos.sort((a, b) => b.date.localeCompare(a.date));
    }

    public static async restoreBackup(serverName: string, backupName: string, options: BackupOptions = {}): Promise<void> {
        const backupPath = this.getBackupPath(serverName);
        const backupDir = path.join(backupPath, backupName);
        const serverPath = FileSystem.getServerPath(serverName);

        if (!FileSystem.fileExists(backupDir)) {
            throw new Error(`Backup ${backupName} not found`);
        }

        if (!options.force) {
            throw new Error('Use --force to confirm backup restoration');
        }

        try {
            await FileSystem.deleteDirectory(serverPath);
            await FileSystem.copyDirectory(backupDir, serverPath);
            Logger.success(`Restored backup ${clc.cyan(backupName)} for server ${clc.white(serverName)}`, serverName);
        } catch (error) {
            Logger.error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`, serverName);
            throw error;
        }
    }

    public static async deleteBackup(serverName: string, backupName: string, options: BackupOptions = {}): Promise<void> {
        const backupPath = this.getBackupPath(serverName);
        const backupDir = path.join(backupPath, backupName);

        if (!FileSystem.fileExists(backupDir)) {
            throw new Error(`Backup ${backupName} not found`);
        }

        if (!options.force) {
            throw new Error('Use --force to confirm backup deletion');
        }

        try {
            await FileSystem.deleteDirectory(backupDir);
            Logger.success(`Deleted backup ${clc.cyan(backupName)} for server ${clc.white(serverName)}`, serverName);
        } catch (error) {
            Logger.error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`, serverName);
            throw error;
        }
    }

    private static getBackupPath(serverName: string): string {
        return path.join(FileSystem.getWorkspacePath(), 'backups', serverName);
    }

    public static formatSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
} 