# Portables

<div align="center">

![Portables](https://img.shields.io/badge/Minecraft-Development%20Tool-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-blue)

🚀 A powerful Minecraft Debugging & Pentesting tool for development use.

</div>

## 🎯 Features

- 🔧 **Server Management**: Create, start, stop, and manage multiple Minecraft servers
- 🖥️ **Console Mode**: Interactive console with built-in commands
- 📊 **Logging System**: Comprehensive logging with per-server log files
- 🛠️ **Development Tools**: Debug and test Minecraft server functionality
- 🎮 **Player Management**: Monitor and manage player connections
- 💬 **Chat System**: Built-in chat functionality with broadcast support

## ⚠️ Important Notice

We do not tolerate exploiting/hacking use of our software.
Please use our software for development only.

**Note**: If reported to us that someone is exploiting using our tool,
we cannot block or ban the user from using our tool.

## 🚀 Getting Started

### Prerequisites

- Node.js (>= 16.0.0)
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/abdullahcxd/theportables.git

# Navigate to the project directory
cd theportables

# Install dependencies
pnpm install
```

## 🔧 Configuration

The configuration file `config.portables.yaml` supports the following options:

```yaml
# Portables Version
version: 1

settings:
    # Place where portables stores it's data and directories
    workspaceDirectory: "workspace"
    
    # Sends more messages for debugging use
    debugging: false
```

## 📚 Usage

### Basic Commands

```bash
# Start the application
pnpm start

# Available commands in the application
help           # Show all available commands
server create  # Create a new Minecraft server
server list    # List all servers
server start   # Start a server
server stop    # Stop a server
```

### Server Console Mode

When in server console mode:
- Use `help` or `?` to see available commands
- Use `list` to show online players
- Use `say` to broadcast messages
- Use `kick` to remove players
- Use `.exit` to leave console mode

## 🏗️ Project Structure

```
src/
├── command/    # Command system implementation
├── server/     # Minecraft server management
├── utils/      # Utility functions and helpers
├── discord/    # Discord bot & webhook implementation
├── config/     # Configuration files
├── types/      # TypeScript types
├── Workspace.ts    # Workspace system implementation
└── index.ts    # Application entry point
```

## 🛠️ Development

### Building

```bash
# Build the project
pnpm build

# Run in development mode
pnpm dev
```

### Adding New Commands

1. Create a new command file in `src/command/cmds/`
2. Implement the command class
3. It will be automatically loaded by the application

Example:
```typescript
import { Command } from "@/command/Command";

export default class MyCommand extends Command {
    constructor() {
        super({
            name: "mycommand",
            description: "My custom command",
            usage: "mycommand",
            aliases: ["mycommand"],
        });
    }

    async run(context: CommandContext) {
        // Command implementation
    }
}
```

or using `CommandBuilder`

```typescript
export default class MyCommand extends Command {
    constructor() {
        super(CommandBuilder.builder()
            .setName("mycommand")
            .setDescription("My custom command")
            .setUsage("mycommand")
            .setAliases(["mycommand"])
            .build());
    }

    async run(context: CommandContext) {
        // Command implementation
    }
}
```

## 💉 Injection

Injections are used to inject methods into class methods,
this is useful for editing methods to the class.

Example of multiple instances (Place injection files in `workspace/injections/<injection-name>.pinject.ts`):
```typescript
import { InjectionRegistry } from "@/utils/InjectionRegistry";
import { InjectionHooks } from "@/utils/InjectionHooks";

const server = InjectionRegistry.getInstances("Server"); // Getting all server instances, can be done with single instance

if (server) {
    for (const instance of server) {
        InjectionHooks.inject(instance, "onPlayerJoin", (player: Player) => {
            console.log(`${player.username} joined the server`);
        });
    }
}
```

Example of single instance (Place injection files in `workspace/injections/<injection-name>.pinject.ts`):
```typescript
import { InjectionHooks } from "@/utils/InjectionHooks";

const server = InjectionRegistry.getInstance("Server", "server-<id>"); // Getting a singular server instance

if (server) {
    InjectionHooks.inject(server, "onPlayerJoin", (player: Player) => {
        console.log(`${player.username} joined the server`);
    });
}
```

## 🪝 Hooks

Hooks are event-like methods that are called when a certain event is triggered.

Example:
```typescript
import { Hooks } from "@/utils/Hooks";

Hooks.register("server:beforeStart", (server: Server) => {
    console.log(`Server ${server.name} is starting`);
});
```

## 📝 Logging

Logs are stored in the following locations:
- Global logs: `workspace/logs/`
- Server-specific logs: `workspace/servers/<server-name>/logs/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [minecraft-protocol](https://github.com/PrismarineJS/node-minecraft-protocol)
- Inspired by Minecraft server development tools 