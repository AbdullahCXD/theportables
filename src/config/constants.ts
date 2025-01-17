export const DEFAULT_CONFIG = {
    VERSION: '1.0.0',
    BUILD_NUMBER: '1',
    ENV: 'development',
    REPO_URL: 'https://github.com/abdullahcxd/theportables',
    SERVER: {
        DEFAULT_PORT: 25565,
        MAX_PLAYERS: 20,
        DEFAULT_VERSION: '1.8.9',
        CONFIGURATION_VERSION: '1'
    },
    LOGGING: {
        PREFIX_LENGTH: 12,
        DIVIDER_CHAR: '─',
        DIVIDER_LENGTH: 50
    },
    PATHS: {
        WORKSPACE: 'workspace',
        LOGS: 'logs',
        SERVERS: 'servers',
        CONFIG: 'config.portables.yaml'
    },
    COLORS: {
        SUCCESS: 'green',
        ERROR: 'red',
        INFO: 'cyan',
        WARN: 'yellow',
        DEBUG: 'blue',
        MUTED: 'blackBright'
    }
}; 