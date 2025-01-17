import { FileSystem } from './FileSystem';
import yaml from 'yaml';
import path from 'path';
import { Logger } from './Logger';

export interface ConfigDoc {
    [key: string]: ConfigDoc | null | string | undefined | boolean;
    doc?: string;
    readonly?: boolean;
}

export class PortablesDocs {
    private static readonly DOCS_FILE = 'config.portabledocs.yml';
    private static docs: ConfigDoc | null = null;

    public static initialize(): void {
        const docsPath = path.join(this.DOCS_FILE);
        if (!FileSystem.fileExists(docsPath)) {
            this.docs = null;
            return;
        }

        try {
            const content = FileSystem.readFile(docsPath);
            this.docs = yaml.parse(content);
        } catch (error) {
            Logger.error('Failed to load documentation:', error as string);
            this.docs = null;
        }
    }

    public static isReadOnly(key: string): boolean {
        if (!this.docs) {
            this.initialize();
        }

        const path = key.split('.');
        let current: ConfigDoc | null = this.docs;

        for (const segment of path) {
            if (!current || typeof current !== 'object') {
                return false;
            }
            current = current[segment] as ConfigDoc;
        }

        return current?.readonly === true;
    }

    public static getDoc(key: string): string {
        if (!this.docs) {
            this.initialize();
        }

        const path = key.split('.');
        let current: ConfigDoc | null = this.docs;

        for (const segment of path) {
            if (!current || typeof current !== 'object') {
                return '';
            }
            current = current[segment] as ConfigDoc;
        }

        return typeof current === 'object' ? current?.doc || '' : '';
    }

    public static getDocsForSection(section: string): Map<string, string> {
        if (!this.docs) {
            this.initialize();
        }

        const docs = new Map<string, string>();
        const sectionDocs = this.getSection(section);

        if (sectionDocs && typeof sectionDocs === 'object') {
            this.flattenDocs(sectionDocs, section, docs);
        }

        return docs;
    }

    private static getSection(section: string): ConfigDoc | null {
        if (!this.docs) {
            return null;
        }

        return section.split('.').reduce((current: ConfigDoc | null, key: string) => {
            if (!current || typeof current !== 'object') return null;
            return current[key] as ConfigDoc;
        }, this.docs);
    }

    private static flattenDocs(
        obj: ConfigDoc,
        prefix: string,
        result: Map<string, string>
    ): void {
        if (obj.doc) {
            result.set(prefix, obj.doc);
        }

        for (const [key, value] of Object.entries(obj)) {
            if (key === 'doc' || key === 'readonly' || !value || typeof value !== 'object') continue;
            
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            this.flattenDocs(value as ConfigDoc, newPrefix, result);
        }
    }
}
