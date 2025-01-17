import clc from 'cli-color';
import { DEFAULT_CONFIG } from '../config/constants';

interface BoxOptions {
    titleColor?: clc.Format;
    borderColor?: clc.Format;
    width?: number;
    indent?: number;
}

interface TreeOptions {
    indent?: number;
    lineColor?: clc.Format;
}

export class BoxRenderer {
    private static readonly DEFAULT_WIDTH = 80;
    private static readonly DEFAULT_INDENT = 2;
    private static initialized = false;

    // Pre-compute common character combinations
    private static readonly CHARS = {
        // Box characters (using simpler UTF-8 chars for better performance)
        TOP: '─',
        SIDE: '│',
        CORNER_TL: '┌',
        CORNER_TR: '┐',
        CORNER_BL: '└',
        CORNER_BR: '┘',
        
        // Tree characters
        BRANCH: '├',
        LINE: '│',
        LAST: '└',
        ARROW: '→',
        DOT: '•'
    } as const;

    // Cache for repeated strings
    private static readonly stringCache = new Map<string, string>();

    private static getCachedString(char: string, length: number): string {
        const key = `${char}:${length}`;
        let result = this.stringCache.get(key);
        if (!result) {
            result = char.repeat(length);
            this.stringCache.set(key, result);
        }
        return result;
    }

    public static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
    }

    public static createBox(title: string, content: string[], options: BoxOptions = {}): void {
        if (!this.initialized) this.initialize();
        
        const {
            titleColor = clc.yellow,
            borderColor = clc.blackBright,
            width = this.DEFAULT_WIDTH,
            indent = this.DEFAULT_INDENT
        } = options;

        // Pre-calculate content width once
        const contentWidth = Math.max(
            width,
            title.length + 2,
            ...content.map(line => clc.strip(line).length + 2)
        );

        // Pre-calculate repeated strings
        const horizontalLine = this.getCachedString(this.CHARS.TOP, contentWidth - 2);

        // Create top border with title
        const topBorder = title
            ? borderColor(this.CHARS.CORNER_TL) + titleColor(title) + borderColor(this.getCachedString(this.CHARS.TOP, contentWidth - title.length - 2)) + borderColor(this.CHARS.CORNER_TR)
            : borderColor(this.CHARS.CORNER_TL + horizontalLine + this.CHARS.CORNER_TR);

        // Create bottom border
        const bottomBorder = borderColor(this.CHARS.CORNER_BL + horizontalLine + this.CHARS.CORNER_BR);

        // Render box
        console.log(topBorder);

        // Render content with pre-calculated side borders
        const leftBorder = borderColor(this.CHARS.SIDE);
        const rightBorder = borderColor(this.CHARS.SIDE);

        content.forEach(line => {
            const strippedLine = clc.strip(line);
            const padding = contentWidth - strippedLine.length - 2;
            console.log(
                leftBorder + 
                ' ' + line + this.getCachedString(' ', Math.max(0, padding - 1)) +
                rightBorder
            );
        });

        console.log(bottomBorder);
    }

    public static createTree(items: { text: string; children?: string[] }[], options: TreeOptions = {}): void {
        const { indent = this.DEFAULT_INDENT, lineColor = clc.blackBright } = options;
        
        // Pre-calculate common strings
        const space = this.getCachedString(' ', indent - 1);
        
        const renderItem = (item: { text: string; children?: string[] }, prefix: string = '', isLast: boolean = false): void => {
            const branch = isLast ? this.CHARS.LAST : this.CHARS.BRANCH;
            console.log(`${lineColor(prefix + branch)} ${item.text}`);

            if (item.children?.length) {
                const newPrefix = prefix + (isLast ? ' ' : this.CHARS.LINE) + space;
                const lastIndex = item.children.length - 1;
                
                item.children.forEach((child, index) => {
                    renderItem({ text: child }, newPrefix, index === lastIndex);
                });
            }
        };

        const lastIndex = items.length - 1;
        items.forEach((item, index) => {
            renderItem(item, '', index === lastIndex);
        });
    }

    public static createList(items: string[], options: BoxOptions = {}): void {
        const { borderColor = clc.blackBright } = options;
        const lastIndex = items.length - 1;

        items.forEach((item, index) => {
            const prefix = index === lastIndex ? this.CHARS.LAST : this.CHARS.BRANCH;
            console.log(`${borderColor(prefix)} ${item}`);
        });
    }

    public static createTable(headers: string[], rows: string[][], options: BoxOptions = {}): void {
        const { borderColor = clc.blackBright } = options;

        // Pre-calculate column widths
        const columnWidths = headers.map((header, columnIndex) => 
            Math.max(
                clc.strip(header).length,
                ...rows.map(row => clc.strip(row[columnIndex] || '').length)
            )
        );

        // Create header with pre-calculated widths
        const separator = ` ${borderColor(this.CHARS.LINE)} `;
        const headerRow = headers
            .map((header, index) => header.padEnd(columnWidths[index]))
            .join(separator);
        
        // Create content rows
        const contentRows = rows.map(row =>
            row
                .map((cell, index) => cell.padEnd(columnWidths[index]))
                .join(separator)
        );

        // Render table
        this.createBox('Table', [
            headerRow,
            borderColor(this.getCachedString(this.CHARS.TOP, headerRow.length)),
            ...contentRows
        ], options);
    }

    public static createInfo(title: string, pairs: [string, string][], options: BoxOptions = {}): void {
        const maxKeyLength = Math.max(...pairs.map(([key]) => key.length));
        const content = pairs.map(([key, value]) => 
            `${clc.blackBright(key.padEnd(maxKeyLength))} ${value}`
        );
        this.createBox(title, content, options);
    }
} 