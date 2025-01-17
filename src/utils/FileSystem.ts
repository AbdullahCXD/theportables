import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG } from '../config/constants';

export class FileSystem {
    private static workspaceDirectory: string;

    static initialize(workspaceDir?: string) {
        this.workspaceDirectory = workspaceDir || DEFAULT_CONFIG.PATHS.WORKSPACE;
        this.ensureDirectoryExists(this.workspaceDirectory);
        this.ensureDirectoryExists(this.getLogsPath());
        this.ensureDirectoryExists(this.getServersPath());
    }

    static getWorkspacePath(): string {
        return this.workspaceDirectory;
    }

    static getLogsPath(): string {
        return path.join(this.workspaceDirectory, DEFAULT_CONFIG.PATHS.LOGS);
    }

    static getServersPath(): string {
        return path.join(this.workspaceDirectory, DEFAULT_CONFIG.PATHS.SERVERS);
    }

    static getServerPath(serverName: string): string {
        return path.join(this.getServersPath(), serverName);
    }

    static getServerLogPath(serverName: string): string {
        return path.join(this.getServerPath(serverName), DEFAULT_CONFIG.PATHS.LOGS);
    }

    static ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static ensureFileExists(filePath: string): void {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '', 'utf8');
        }
    }

    static fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    static writeFile(filePath: string, data: string): void {
        this.ensureDirectoryExists(path.dirname(filePath));
        fs.writeFileSync(filePath, data, 'utf8');
    }

    static readFile(filePath: string): string {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    static readJsonFile<T>(filePath: string): T {
        const content = this.readFile(filePath);
        try {
            return JSON.parse(content) as T;
        } catch (error) {
            throw new Error(`Invalid JSON in file: ${filePath}`);
        }
    }

    static writeJsonFile(filePath: string, data: any): void {
        this.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    static deleteDirectory(dirPath: string): void {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    }

    static listFiles(dirPath: string): string[] {
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        return fs.readdirSync(dirPath);
    }

    static getFileStats(filePath: string) {
        return fs.statSync(filePath);
    }

    static async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        this.ensureDirectoryExists(path.dirname(destinationPath));
        await fs.promises.copyFile(sourcePath, destinationPath);
    }

    static async copyDirectory(sourcePath: string, destinationPath: string): Promise<void> {
        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Source directory not found: ${sourcePath}`);
        }

        this.ensureDirectoryExists(destinationPath);
        const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(sourcePath, entry.name);
            const destPath = path.join(destinationPath, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await this.copyFile(srcPath, destPath);
            }
        }
    }

    static getFileData(filePath: string): { size: number; created: Date; modified: Date; accessed: Date } {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime, 
            accessed: stats.atime
        };
    }

    public static getBackupsPath(): string {
        return path.join(this.getWorkspacePath(), 'backups');
    }

    public static directoryExists(dirPath: string): boolean {
        try {
            return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        } catch {
            return false;
        }
    }

    public static renameDirectory(oldPath: string, newPath: string): void {
        if (!this.directoryExists(oldPath)) {
            throw new Error(`Directory ${oldPath} does not exist`);
        }

        if (this.directoryExists(newPath)) {
            throw new Error(`Directory ${newPath} already exists`);
        }

        fs.renameSync(oldPath, newPath);
    }
} 