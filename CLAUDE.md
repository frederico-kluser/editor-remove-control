# CLAUDE.md

This file provides guidance to Claude Code when working with this repository, following the VIBE (Voice/Intention-Based Engineering) architecture for new projects.

## Project Vision

The Editor Control Extension aims to provide a unified interface for programmatic control of multiple VSCode-based editors (VSCode, Cursor IDE, WindSurf) through REST API and WebSocket endpoints, enabling remote automation, debugging, and integration capabilities across different editor instances.

## Implementation Approach

- **Frontend**: No dedicated frontend UI; integrates with VSCode Extension API and Electron for DevTools access
- **Backend**: Node.js with TypeScript, Express.js for REST API, ws library for WebSocket server
- **Database**: No persistent storage; in-memory instance tracking
- **Infrastructure**: Distributed as VSCode extension (.vsix package), locally hosted services on configurable ports

## VIBE Architecture Principles

- Define high-level intentions first, let implementation details follow
- Maintain clear separation between intent interpretation and execution
- Use natural language to specify behavior, code to implement it
- Prioritize user experience over implementation complexity
- Document the mapping between natural language intents and code implementation

## Code Conventions

### Style Guidelines
- Use 2-space indentation for all files
- Follow consistent naming conventions:
  - camelCase for variables and functions
  - PascalCase for classes and interfaces
  - UPPER_SNAKE_CASE for constants
- Limit line length to 100 characters
- Use semicolons consistently
- Prefer explicit type annotations

### Best Practices
- Write pure functions whenever possible
- Avoid deeply nested code (maximum 3 levels)
- Implement error handling consistently
- Use early returns to reduce nesting
- Keep functions small and focused (< 30 lines)
- Use meaningful variable and function names

## Project Structure

```
src/
├── api/              # REST API implementation
│   ├── middleware/   # Express middleware functions
│   ├── routes/       # API route handlers
│   │   ├── commands.ts    # Command execution endpoints
│   │   ├── devtools.ts    # DevTools management endpoints
│   │   ├── index.ts       # Route registration
│   │   └── instances.ts   # Editor instance information endpoints
│   └── server.ts     # Express server setup
├── commands/         # VSCode command integration
│   ├── devtools.ts   # DevTools access commands
│   └── registry.ts   # Command registration and execution
├── core/             # Core extension functionality
│   ├── instance-manager.ts # Editor instance tracking
│   └── utils.ts      # Utility functions
├── extension.ts      # Extension activation/deactivation
├── types.ts          # TypeScript interfaces and types
└── websocket/        # WebSocket server implementation
    ├── handlers/     # Message handlers for WebSocket
    └── server.ts     # WebSocket server setup
tests/                # Tests directory
docs/                 # Documentation
```

## Development Flow

1. Begin with clear intention specification
2. Document user stories in natural language
3. Create test cases before implementation
4. Implement code that fulfills the intention
5. Verify that implementation matches intent
6. Document the mapping from intent to code

## Common Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes and recompile
npm run watch

# Package the extension as .vsix
npm run package

# Run tests
npm test

# Lint code
npm run lint

# Start extension in development mode
# Press F5 in VSCode with the project open

# Build for production
npm run vscode:prepublish
```

## Patterns and Examples

### Service Pattern

```typescript
// Example service pattern for the extension
interface CommandService {
  listCommands(): Promise<Command[]>;
  executeCommand(id: string, args: any[]): Promise<any>;
  registerCommand(command: Command): void;
  unregisterCommand(id: string): void;
}

class CommandServiceImpl implements CommandService {
  private commandRegistry: Map<string, Command> = new Map();
  
  async listCommands(): Promise<Command[]> {
    try {
      return Array.from(this.commandRegistry.values());
    } catch (error) {
      logger.error('Failed to list commands', { error });
      throw new ServiceError('Failed to list commands', error);
    }
  }
  
  async executeCommand(id: string, args: any[] = []): Promise<any> {
    try {
      const command = this.commandRegistry.get(id);
      if (!command) {
        throw new CommandNotFoundError(`Command ${id} not found`);
      }
      return await vscode.commands.executeCommand(id, ...args);
    } catch (error) {
      logger.error('Failed to execute command', { error, commandId: id });
      throw new ServiceError('Failed to execute command', error);
    }
  }
  
  // Other methods implementation...
}
```

### API Handler Pattern

```typescript
// Example API handler pattern for the extension
interface ApiHandler {
  registerRoutes(router: express.Router): void;
}

class CommandsApiHandler implements ApiHandler {
  constructor(private commandService: CommandService) {}
  
  registerRoutes(router: express.Router): void {
    router.get('/commands', this.listCommands.bind(this));
    router.post('/commands/execute', this.executeCommand.bind(this));
  }
  
  private async listCommands(req: express.Request, res: express.Response): Promise<void> {
    try {
      const commands = await this.commandService.listCommands();
      res.json({ commands });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list commands' });
    }
  }
  
  private async executeCommand(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id, args } = req.body;
      if (!id) {
        res.status(400).json({ error: 'Command ID is required' });
        return;
      }
      
      const result = await this.commandService.executeCommand(id, args || []);
      res.json({ result });
    } catch (error) {
      if (error instanceof CommandNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to execute command' });
      }
    }
  }
}
```

### Error Handling Pattern

```typescript
// Example error handling pattern for the extension
try {
  const result = await vscode.commands.executeCommand(commandId, ...args);
  return result;
} catch (error) {
  logger.error('Command execution failed', { error, commandId, args });
  
  if (error instanceof Error && error.message.includes('command not found')) {
    throw new CommandNotFoundError(`Command '${commandId}' not found in this editor instance`);
  } else if (error instanceof Error && error.message.includes('permission')) {
    throw new PermissionError(`Insufficient permissions to execute command '${commandId}'`);
  } else if (error instanceof Error && error.message.includes('devtools')) {
    throw new DevToolsError('Failed to access DevTools: ' + error.message);
  } else {
    throw new ExtensionError('An unexpected error occurred during command execution', error);
  }
}
```

### WebSocket Handler Pattern

```typescript
// Example WebSocket handler pattern for the extension
interface WebSocketHandler {
  handleMessage(message: WebSocketMessage, ws: WebSocket): Promise<void>;
}

class CommandWebSocketHandler implements WebSocketHandler {
  constructor(private commandService: CommandService) {}
  
  async handleMessage(message: WebSocketMessage, ws: WebSocket): Promise<void> {
    try {
      if (message.type !== 'execute_command') {
        return;
      }
      
      const { id, args } = message.payload;
      const result = await this.commandService.executeCommand(id, args || []);
      
      ws.send(JSON.stringify({
        id: message.id,
        type: 'command_result',
        payload: { result }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        id: message.id,
        type: 'error',
        payload: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof CommandNotFoundError ? 'command_not_found' : 'execution_error'
        }
      }));
    }
  }
}
```

## VIBE-Specific Guidance

When implementing features in this project:

1. Begin with the high-level intention or user story
2. Break down complex features into smaller, focused components
3. Define clear interfaces before implementation
4. Document the reasoning behind implementation choices
5. Use typed interfaces to ensure type safety
6. Follow established patterns in the codebase
7. Prioritize readability and maintainability over clever code

## Testing Strategy

- **Unit Tests**: Test individual functions and classes in isolation (command registry, instance manager, API handlers)
- **Integration Tests**: Test interactions between services (API + command execution, WebSocket + instance management)
- **Extension Tests**: Test extension activation/deactivation and command registration within VSCode environment
- **API Tests**: Test REST API endpoints with mock requests
- **WebSocket Tests**: Test WebSocket message handling and response formats
- **Cross-Editor Tests**: Validate functionality works consistently across VSCode, Cursor IDE, and WindSurf
- **Test Coverage**: Aim for at least 80% code coverage, with focus on core functionality and error handling

## Instructions for Research and External Resources

Claude, when you need to access external resources or research information:

1. ALWAYS FIRST add the URL temporarily to this CLAUDE.md file under "Authorized URLs"
2. Use WebFetchTool ONLY after adding the URL
3. Remove the URL from the list after completing the research
4. Never access URLs not explicitly authorized through this process

### Authorized URLs
- https://api.duckduckgo.com
- https://*