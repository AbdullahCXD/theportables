import yaml from "yaml";
import fs from "fs";

export type Awaitable<T> = T | PromiseLike<T>;

export function loadConfig(fileName: string) {
    if (!fileName.endsWith(".portables.yaml")) {
        fileName = fileName + ".portables.yaml";
    }
    const file = fs.readFileSync(fileName, "utf8");
    return yaml.parse(file);
}

export function getOption(options: any, key: string, defaultValue: any) {
    if (options[key] === undefined) {
        return defaultValue;
    }
    return options[key];
}

export function initializeDirectory(directory: string) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

export function initializeFile(file: string, content: string) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, content);
    }
}

export function concatObject(object: any, key: string, value: any) {
    if (object[key] === undefined) {
        object[key] = value;
    } else {
        object[key] = object[key] + value;
    }
    return object;
}

export function isDebugging(): boolean {
  return loadConfig("config.portables.yaml").settings.debugging ?? false;
}