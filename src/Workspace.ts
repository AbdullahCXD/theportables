import { loadConfig } from "./utils/utils";

export const workspaceConfiguration = loadConfig("config.portables.yaml");
export function getWorkspaceDirectory(): string { return workspaceConfiguration.settings.workspaceDirectory }