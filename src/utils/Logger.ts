import clc from 'cli-color';
import path from 'path';
import { FileSystem } from './FileSystem';
import { DEFAULT_CONFIG } from '../config/constants';
import { isDebugging } from './utils';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG' | 'EMPTY' | 'DIVIDER';
type LogStream = { write: (data: string) => void; end: () => void };

export class Logger {
    private static readonly PREFIX_LENGTH = DEFAULT_CONFIG.LOGGING.PREFIX_LENGTH;
    private static readonly DIVIDER_CHAR = DEFAULT_CONFIG.LOGGING.DIVIDER_CHAR;
    private static readonly DIVIDER_LENGTH = DEFAULT_CONFIG.LOGGING.DIVIDER_LENGTH;
    private static currentLogFile: string;
    private static stream: LogStream | null = null;
    private static serverStreams: Map<string, LogStream> = new Map();

    static {
        FileSystem.initialize();
        this.updateLogFile();
    }

    private static formatPrefix(prefix: string, color: clc.Format): string {
        return `${color(prefix.padEnd(this.PREFIX_LENGTH))}`;
    }

    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    private static getConsoleTimestamp(): string {
        return new Date().toLocaleTimeString();
    }

    private static updateLogFile() {
        const date = new Date().toISOString().split('T')[0];
        const newLogFile = path.join(FileSystem.getLogsPath(), `${date}.log`);

        if (this.currentLogFile === newLogFile) return;

        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }

        this.currentLogFile = newLogFile;
        this.stream = {
            write: (data: string) => FileSystem.writeFile(newLogFile, data + '\n'),
            end: () => {}
        };
    }

    private static getServerLogStream(serverName: string): LogStream {
        let stream = this.serverStreams.get(serverName);
        if (!stream) {
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(FileSystem.getServerLogPath(serverName), `${date}.log`);
            FileSystem.ensureDirectoryExists(path.dirname(logFile));
            
            stream = {
                write: (data: string) => FileSystem.writeFile(logFile, data + '\n'),
                end: () => {}
            };
            this.serverStreams.set(serverName, stream);
        }
        return stream;
    }

    private static writeToLog(level: LogLevel, message: string, serverName?: string) {
        this.updateLogFile();
        const timestamp = this.getTimestamp();
        const logMessage = `[${timestamp}] [${level}] ${clc.strip(message)}`;

        // Write to global log
        this.stream?.write(logMessage);

        // Write to server log if specified
        if (serverName) {
            const serverStream = this.getServerLogStream(serverName);
            serverStream.write(logMessage);
        }
    }

    private static log(level: LogLevel, message: string, color: clc.Format, serverName?: string) {
        this.writeToLog(level, message, serverName);
        const prefix = this.formatPrefix(`[${level}]`, color);
        const timestamp = clc.blackBright(this.getConsoleTimestamp());
        console.log(`${timestamp} ${prefix} ${message}`);
    }

    public static info(message: string, serverName?: string) {
        this.log('INFO', message, clc.cyan, serverName);
    }

    public static success(message: string, serverName?: string) {
        this.log('SUCCESS', message, clc.green, serverName);
    }

    public static warn(message: string, serverName?: string) {
        this.log('WARN', message, clc.yellow, serverName);
    }

    public static error(message: string, serverName?: string) {
        this.log('ERROR', message, clc.red, serverName);
    }

    public static debug(message: string, serverName?: string) {
        if (!isDebugging()) return;
        this.log('DEBUG', message, clc.blue, serverName);
    }

    public static divider(serverName?: string) {
        const divider = clc.blackBright(this.DIVIDER_CHAR.repeat(this.DIVIDER_LENGTH));
        console.log(divider);
        this.writeToLog('DIVIDER', this.DIVIDER_CHAR.repeat(this.DIVIDER_LENGTH), serverName);
    }

    public static emptyLine(serverName?: string) {
        console.log();
        this.writeToLog('EMPTY', '', serverName);
    }

    public static clear() {
        console.clear();
    }

    public static getLogFiles(): { name: string; path: string; date: Date }[] {
        return FileSystem.listFiles(FileSystem.getLogsPath())
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const filePath = path.join(FileSystem.getLogsPath(), file);
                const stats = FileSystem.getFileStats(filePath);
                return {
                    name: file,
                    path: filePath,
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    public static getServerLogFiles(serverName: string): { name: string; path: string; date: Date }[] {
        const serverLogDir = FileSystem.getServerLogPath(serverName);
        return FileSystem.listFiles(serverLogDir)
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const filePath = path.join(serverLogDir, file);
                const stats = FileSystem.getFileStats(filePath);
                return {
                    name: file,
                    path: filePath,
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    public static getLogContent(logFile: string, lines: number = 50): string[] {
        const filePath = path.join(FileSystem.getLogsPath(), logFile);
        if (!FileSystem.readFile(filePath)) return [];

        return FileSystem.readFile(filePath)
            .split('\n')
            .filter(Boolean)
            .slice(-lines);
    }

    public static getServerLogContent(serverName: string, logFile: string, lines: number = 50): string[] {
        const filePath = path.join(FileSystem.getServerLogPath(serverName), logFile);
        if (!FileSystem.readFile(filePath)) return [];

        return FileSystem.readFile(filePath)
            .split('\n')
            .filter(Boolean)
            .slice(-lines);
    }

    public static clearLogs() {
        // Close current stream
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }

        // Close all server streams
        for (const stream of this.serverStreams.values()) {
            stream.end();
        }
        this.serverStreams.clear();

        // Remove all log files
        FileSystem.deleteDirectory(FileSystem.getLogsPath());

        // Recreate log directory and start new log file
        FileSystem.ensureDirectoryExists(FileSystem.getLogsPath());
        this.updateLogFile();
    }

    public static clearServerLogs(serverName: string) {
        // Close server stream if exists
        const stream = this.serverStreams.get(serverName);
        if (stream) {
            stream.end();
            this.serverStreams.delete(serverName);
        }

        // Remove and recreate server log directory
        const serverLogDir = FileSystem.getServerLogPath(serverName);
        FileSystem.deleteDirectory(serverLogDir);
        FileSystem.ensureDirectoryExists(serverLogDir);
  }
}
