import readline from 'readline';
import { EventEmitter } from 'events';
import clc from 'cli-color';

interface ReadlineEvents {
    line: (line: string) => void;
    close: () => void;
}

interface KeyPressEvent {
    sequence?: string;
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
}

export class Readline extends EventEmitter {
    private static instance: Readline;
    private rl: readline.Interface;
    private hostname: string = 'portables';
    private history: string[] = [];
    private historyIndex: number = 0;
    private currentLine: string = '';

    private constructor() {
        super();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.getPrompt(),
            historySize: 100,
            removeHistoryDuplicates: true
        });

        this.setupEventHandlers();
    }

    public static getInstance(): Readline {
        if (!Readline.instance) {
            Readline.instance = new Readline();
        }
        return Readline.instance;
    }

    private setupEventHandlers(): void {
        // Handle line input
        this.rl.on('line', (line) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                this.addToHistory(trimmedLine);
                this.historyIndex = this.history.length;

                // Split commands by '&' and emit each one
                const commands = trimmedLine.split('&').map(cmd => cmd.trim()).filter(Boolean);
                commands.forEach(command => {
                    this.emit('line', command);
                });
            }
            this.rl.prompt();
        });

        // Handle close
        this.rl.on('close', () => {
            this.emit('close');
        });

        // Handle up/down arrow keys for history
        process.stdin.on('keypress', (_: unknown, key: KeyPressEvent) => {
            if (!key?.name) return;

            if (key.name === 'up') {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.currentLine = this.history[this.historyIndex];
                    this.clearLine();
                    this.rl.write(this.currentLine);
                }
            } else if (key.name === 'down') {
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.currentLine = this.history[this.historyIndex];
                    this.clearLine();
                    this.rl.write(this.currentLine);
                } else {
                    this.historyIndex = this.history.length;
                    this.currentLine = '';
                    this.clearLine();
                }
            }
        });
    }

    private getPrompt(): string {
        return `${clc.cyan(this.hostname)} ${clc.blackBright('→')} `;
    }

    public setHostname(hostname: string): void {
        this.hostname = hostname;
        this.rl.setPrompt(this.getPrompt());
        this.rl.prompt();
    }

    public prompt(): void {
        this.rl.prompt();
    }

    public async question(customPrompt?: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(customPrompt || this.getPrompt(), (answer) => {
                resolve(answer.trim());
            });
        });
    }

    public onLine(callback: (line: string) => Promise<void>): void {
        this.on('line', callback);
    }

    public onClose(callback: () => void): void {
        this.on('close', callback);
    }

    public clearScreen(): void {
        console.clear();
    }

    public clearLine(): void {
        this.rl.write(null, { ctrl: true, name: 'u' });
    }

    public close(): void {
        this.rl.close();
    }

    private addToHistory(line: string): void {
        if (this.history[this.history.length - 1] !== line) {
            this.history.push(line);
        }
    }

    public getHistory(): string[] {
        return [...this.history];
    }
}