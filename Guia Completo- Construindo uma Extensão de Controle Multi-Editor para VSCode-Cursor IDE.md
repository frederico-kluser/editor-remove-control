# Guia Completo: Construindo uma Extensão de Controle Multi-Editor para VSCode/Cursor IDE

## Sumário

1. Introdução
2. Pré-requisitos e Configuração
3. Estrutura da Extensão do VSCode
   - Organização do Projeto
   - Arquivos Principais e Suas Funções
4. Configuração do Ambiente de Desenvolvimento da Extensão
5. Implementação da Funcionalidade Principal
   - Identificação e Gerenciamento de Instâncias
   - Configuração do Servidor API
   - Execução de Comandos
   - Acesso ao Console do Electron DevTools
   - Comunicação WebSocket
6. Testes e Depuração
7. Implantação para Uso Interno da Equipe
8. Roadmap Progressivo Detalhado
9. Referências e Recursos

## 1. Introdução

Este documento fornece um guia abrangente para desenvolver uma extensão do VSCode que permite o controle programático de múltiplas instâncias do VSCode, Cursor IDE e WindSurf. A extensão irá expor endpoints de API REST e conexões WebSocket para identificar instâncias, listar comandos disponíveis, executar comandos e acessar o console do Electron DevTools.

O foco principal é controlar o console do Electron DevTools no Cursor IDE, permitindo recursos avançados de depuração e interação em um ambiente de desenvolvimento interno.

## 2. Pré-requisitos e Configuração

### Ferramentas Necessárias

- **Node.js** (v16.x ou posterior)
- **npm** (v8.x ou posterior) 
- **Visual Studio Code** (versão estável mais recente)
- **Yeoman** e **VS Code Extension Generator**

### Passos para Instalação

1. Instale Node.js e npm a partir de [nodejs.org](https://nodejs.org/)

2. Instale Yeoman e o VS Code Extension Generator:

```bash
npm install -g yo generator-code
```

3. Instale dependências adicionais de desenvolvimento:

```bash
npm install -g typescript vsce
```

## 3. Estrutura da Extensão do VSCode

### Organização do Projeto

```
extension-name/
├── .vscode/                  # Configurações do VS Code
│   ├── launch.json           # Configuração de depuração
│   └── tasks.json            # Tarefas de build
├── src/                      # Código-fonte
│   ├── api/                  # Componentes da API
│   │   ├── middleware/       # Middleware do Express
│   │   ├── routes/           # Endpoints da API
│   │   └── server.ts         # Configuração do servidor API
│   ├── commands/             # Implementações de comandos
│   │   ├── devtools.ts       # Comandos relacionados ao DevTools
│   │   └── registry.ts       # Registro de comandos
│   ├── core/                 # Funcionalidade principal
│   │   ├── instance-manager.ts  # Gerenciamento de instâncias do editor
│   │   └── utils.ts          # Funções utilitárias
│   ├── websocket/            # Componentes WebSocket
│   │   ├── handlers/         # Manipuladores de mensagens
│   │   └── server.ts         # Servidor WebSocket
│   ├── extension.ts          # Ponto de entrada principal da extensão
│   └── types.ts              # Definições de tipos TypeScript
├── test/                     # Arquivos de teste
├── .eslintrc.json            # Configuração do ESLint
├── .gitignore                # Arquivo de ignore do Git
├── package.json              # Manifesto da extensão
├── tsconfig.json             # Configuração do TypeScript
└── README.md                 # Documentação
```

### Arquivos Principais e Suas Funções

#### package.json

O manifesto da extensão define metadados, dependências, eventos de ativação e comandos contribuídos:

```json
{
  "name": "editor-control-extension",
  "displayName": "Editor Control Extension",
  "description": "Controle programaticamente múltiplas instâncias de editores baseados em VSCode",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "editor-control.startServer",
        "title": "Iniciar Servidor de Controle do Editor"
      },
      {
        "command": "editor-control.stopServer",
        "title": "Parar Servidor de Controle do Editor"
      },
      {
        "command": "editor-control.toggleDevTools",
        "title": "Alternar Electron DevTools"
      }
    ],
    "configuration": {
      "title": "Editor Control Extension",
      "properties": {
        "editorControl.port": {
          "type": "number",
          "default": 3000,
          "description": "Número da porta para o servidor de controle"
        },
        "editorControl.wsPort": {
          "type": "number",
          "default": 3001,
          "description": "Número da porta para o servidor WebSocket"
        },
        "editorControl.autoStart": {
          "type": "boolean",
          "default": true,
          "description": "Iniciar automaticamente o servidor de controle na ativação da extensão"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "ws": "^8.2.2",
    "uuid": "^8.3.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.13",
    "@types/node": "^16.x",
    "@types/vscode": "^1.60.0",
    "@types/ws": "^8.2.0",
    "@types/uuid": "^8.3.1",
    "@types/cors": "^2.8.12",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "eslint": "^8.0.0",
    "typescript": "^4.4.3",
    "vscode-test": "^1.6.1"
  }
}
```

#### extension.ts

O ponto de entrada principal para a extensão:

```typescript
import * as vscode from 'vscode';
import { startApiServer, stopApiServer } from './api/server';
import { startWebSocketServer, stopWebSocketServer } from './websocket/server';
import { InstanceManager } from './core/instance-manager';
import { registerCommands } from './commands/registry';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Editor Control Extension agora está ativa');
  
  // Inicializar o gerenciador de instâncias
  const instanceManager = new InstanceManager(context);
  
  // Registrar todos os comandos
  registerCommands(context, instanceManager);
  
  // Auto-iniciar servidores se configurado
  const config = vscode.workspace.getConfiguration('editorControl');
  if (config.get('autoStart')) {
    const apiPort = config.get('port') as number;
    const wsPort = config.get('wsPort') as number;
    
    try {
      await startApiServer(apiPort, instanceManager);
      await startWebSocketServer(wsPort, instanceManager);
      vscode.window.showInformationMessage(`Servidores de Controle do Editor iniciados nas portas ${apiPort} (HTTP) e ${wsPort} (WebSocket)`);
    } catch (error) {
      vscode.window.showErrorMessage(`Falha ao iniciar servidores: ${error.message}`);
    }
  }
  
  // Registrar um listener para quando a instância estiver prestes a ser descartada
  context.subscriptions.push({
    dispose: () => {
      stopApiServer();
      stopWebSocketServer();
      instanceManager.dispose();
    }
  });
}

export function deactivate() {
  stopApiServer();
  stopWebSocketServer();
}
```

## 4. Configuração do Ambiente de Desenvolvimento da Extensão

### Criando um Novo Projeto de Extensão

1. Gere um novo projeto de extensão usando Yeoman:

```bash
yo code
```

2. Selecione "New TypeScript Extension" quando solicitado

3. Preencha as informações solicitadas (nome, identificador, descrição, etc.)

4. Abra a pasta do projeto gerado no VS Code:

```bash
code ./nome-da-sua-extensao
```

### Instalando Dependências

Adicione as dependências necessárias para construir uma extensão de controle completa:

```bash
npm install express ws uuid cors
npm install --save-dev @types/express @types/ws @types/uuid @types/cors
```

### Configurando TypeScript

Atualize o `tsconfig.json` para garantir a compilação adequada:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Configurando a Depuração

Configure o `launch.json` para depurar a extensão:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Executar Extensão",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Testes da Extensão",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": ["${workspaceFolder}/out/test/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

## 5. Implementação da Funcionalidade Principal

### Identificação e Gerenciamento de Instâncias

Crie o gerenciador de instâncias para rastrear instâncias do editor:

#### src/core/instance-manager.ts

```typescript
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

// Definições de tipo para informações de instância
export interface EditorInstance {
  id: string;
  machineId: string;
  sessionId: string;
  workspaceFolders: string[];
  type: 'vscode' | 'cursor' | 'windsurf' | 'unknown';
  startTime: number;
  lastHeartbeat: number;
}

export class InstanceManager {
  private instance: EditorInstance;
  private context: vscode.ExtensionContext;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Obter ou criar o ID da instância
    let instanceId = context.globalState.get<string>('instanceId');
    if (!instanceId) {
      instanceId = uuidv4();
      context.globalState.update('instanceId', instanceId);
    }
    
    // Determinar o tipo de editor
    const editorType = this.detectEditorType();
    
    // Criar informações da instância
    this.instance = {
      id: instanceId,
      machineId: vscode.env.machineId,
      sessionId: vscode.env.sessionId,
      workspaceFolders: vscode.workspace.workspaceFolders?.map(folder => folder.uri.toString()) || [],
      type: editorType,
      startTime: Date.now(),
      lastHeartbeat: Date.now()
    };
    
    // Iniciar heartbeat
    this.startHeartbeat();
  }
  
  /**
   * Detecta qual tipo de editor está executando esta extensão
   */
  private detectEditorType(): 'vscode' | 'cursor' | 'windsurf' | 'unknown' {
    const appName = vscode.env.appName.toLowerCase();
    
    if (appName.includes('cursor')) {
      return 'cursor';
    } else if (appName.includes('windsurf') || appName.includes('codeium')) {
      return 'windsurf';
    } else if (appName.includes('visual studio code') || appName.includes('vscode')) {
      return 'vscode';
    }
    
    return 'unknown';
  }
  
  /**
   * Inicia um heartbeat para atualizar o timestamp da última atividade
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.instance.lastHeartbeat = Date.now();
    }, 30000); // Heartbeat de 30 segundos
  }
  
  /**
   * Obtém as informações da instância atual
   */
  public getInstance(): EditorInstance {
    return {...this.instance};
  }
  
  /**
   * Atualiza as informações do workspace quando ele muda
   */
  public updateWorkspaceFolders() {
    this.instance.workspaceFolders = vscode.workspace.workspaceFolders?.map(folder => folder.uri.toString()) || [];
  }
  
  /**
   * Limpa recursos
   */
  public dispose() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
```

### Configuração do Servidor API

Crie um servidor Express para lidar com solicitações da API:

#### src/api/server.ts

```typescript
import * as express from 'express';
import * as http from 'http';
import * as cors from 'cors';
import { InstanceManager } from '../core/instance-manager';
import { registerRoutes } from './routes';

let app: express.Express | null = null;
let server: http.Server | null = null;

/**
 * Inicia o servidor API na porta especificada
 */
export async function startApiServer(port: number, instanceManager: InstanceManager): Promise<void> {
  if (server) {
    throw new Error('O servidor API já está em execução');
  }

  app = express();
  
  // Middleware
  app.use(express.json());
  app.use(cors({ origin: 'http://localhost' })); // Restringir ao localhost
  
  // Define o gerenciador de instâncias no objeto de requisição
  app.use((req: any, res, next) => {
    req.instanceManager = instanceManager;
    next();
  });
  
  // Registra todas as rotas
  registerRoutes(app);
  
  // Inicia o servidor
  return new Promise((resolve, reject) => {
    server = app?.listen(port, () => {
      console.log(`Servidor API de controle do editor executando na porta ${port}`);
      resolve();
    });
    
    server?.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Para o servidor API
 */
export function stopApiServer(): void {
  if (server) {
    server.close();
    server = null;
    app = null;
    console.log('Servidor API parado');
  }
}
```

#### src/api/routes/index.ts

```typescript
import { Express } from 'express';
import { instancesRouter } from './instances';
import { commandsRouter } from './commands';
import { devtoolsRouter } from './devtools';

export function registerRoutes(app: Express): void {
  app.use('/api/instances', instancesRouter);
  app.use('/api/commands', commandsRouter);
  app.use('/api/devtools', devtoolsRouter);
}
```

#### src/api/routes/instances.ts

```typescript
import { Router } from 'express';

export const instancesRouter = Router();

// Lista todas as instâncias ativas do editor
instancesRouter.get('/', (req: any, res) => {
  const instance = req.instanceManager.getInstance();
  res.json({ instance });
});
```

#### src/api/routes/commands.ts

```typescript
import { Router } from 'express';
import * as vscode from 'vscode';

export const commandsRouter = Router();

// Lista todos os comandos disponíveis
commandsRouter.get('/', async (req: any, res) => {
  try {
    const commands = await vscode.commands.getCommands(true);
    res.json({ commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Executa um comando
commandsRouter.post('/execute', async (req: any, res) => {
  const { command, args = [] } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Nome do comando é obrigatório' });
  }
  
  try {
    const result = await vscode.commands.executeCommand(command, ...args);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Execução de Comandos

Registre comandos personalizados para a extensão:

#### src/commands/registry.ts

```typescript
import * as vscode from 'vscode';
import { InstanceManager } from '../core/instance-manager';
import { registerDevToolsCommands } from './devtools';
import { startApiServer, stopApiServer } from '../api/server';
import { startWebSocketServer, stopWebSocketServer } from '../websocket/server';

export function registerCommands(context: vscode.ExtensionContext, instanceManager: InstanceManager): void {
  // Registra comandos de controle do servidor
  context.subscriptions.push(
    vscode.commands.registerCommand('editor-control.startServer', async () => {
      const config = vscode.workspace.getConfiguration('editorControl');
      const apiPort = config.get('port') as number;
      const wsPort = config.get('wsPort') as number;
      
      try {
        await startApiServer(apiPort, instanceManager);
        await startWebSocketServer(wsPort, instanceManager);
        vscode.window.showInformationMessage(
          `Servidores de Controle do Editor iniciados nas portas ${apiPort} (HTTP) e ${wsPort} (WebSocket)`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Falha ao iniciar servidores: ${error.message}`);
      }
    }),
    
    vscode.commands.registerCommand('editor-control.stopServer', () => {
      stopApiServer();
      stopWebSocketServer();
      vscode.window.showInformationMessage('Servidores de Controle do Editor parados');
    })
  );
  
  // Registra comandos relacionados ao DevTools
  registerDevToolsCommands(context);
  
  // Registra o listener de alteração do workspace
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      instanceManager.updateWorkspaceFolders();
    })
  );
}
```

### Acesso ao Console do Electron DevTools

A funcionalidade mais crítica - acessar e controlar o Electron DevTools:

#### src/commands/devtools.ts

```typescript
import * as vscode from 'vscode';

// Armazenamento para o estado do DevTools
let devToolsOpen = false;

export function registerDevToolsCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('editor-control.toggleDevTools', async () => {
      try {
        // Alterna a visibilidade do DevTools
        await vscode.commands.executeCommand('workbench.action.toggleDevTools');
        devToolsOpen = !devToolsOpen;
        return devToolsOpen;
      } catch (error) {
        vscode.window.showErrorMessage(`Falha ao alternar DevTools: ${error.message}`);
        throw error;
      }
    }),
    
    vscode.commands.registerCommand('editor-control.executeInDevTools', async (script: string) => {
      // Garante que o DevTools esteja aberto
      if (!devToolsOpen) {
        await vscode.commands.executeCommand('editor-control.toggleDevTools');
        devToolsOpen = true;
        
        // Dá tempo para o DevTools abrir
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Usando uma solução alternativa para injetar script - já que o acesso direto ao console é restrito
      // Nota: Isso usa a API interna que pode não ser estável em todas as versões do VSCode
      try {
        // Esta abordagem depende de um comando interno que pode não estar disponível em todos os editores
        return await vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
      } catch (error) {
        vscode.window.showErrorMessage(`Falha ao executar no DevTools: ${error.message}`);
        throw error;
      }
    })
  );
}
```

#### src/api/routes/devtools.ts

```typescript
import { Router } from 'express';
import * as vscode from 'vscode';

export const devtoolsRouter = Router();

// Alterna a visibilidade do DevTools
devtoolsRouter.post('/toggle', async (req: any, res) => {
  try {
    const isOpen = await vscode.commands.executeCommand('editor-control.toggleDevTools');
    res.json({ success: true, devToolsOpen: isOpen });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Executa script no console do DevTools
devtoolsRouter.post('/execute', async (req: any, res) => {
  const { script } = req.body;
  
  if (!script) {
    return res.status(400).json({ error: 'Script é obrigatório' });
  }
  
  try {
    await vscode.commands.executeCommand('editor-control.executeInDevTools', script);
    res.json({ 
      success: true, 
      message: 'Execução do script iniciada' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Comunicação WebSocket

Configure o servidor WebSocket para comunicação em tempo real:

#### src/websocket/server.ts

```typescript
import * as WebSocket from 'ws';
import { InstanceManager } from '../core/instance-manager';
import { setupMessageHandlers } from './handlers/index';

let wss: WebSocket.Server | null = null;

/**
 * Inicia o servidor WebSocket
 */
export async function startWebSocketServer(port: number, instanceManager: InstanceManager): Promise<void> {
  if (wss) {
    throw new Error('O servidor WebSocket já está em execução');
  }
  
  return new Promise((resolve, reject) => {
    try {
      wss = new WebSocket.Server({ port });
      
      wss.on('connection', (ws) => {
        console.log('Nova conexão WebSocket estabelecida');
        
        // Configura o tratamento de mensagens
        setupMessageHandlers(ws, instanceManager);
        
        // Envia informações iniciais da instância
        ws.send(JSON.stringify({
          type: 'instance_info',
          data: instanceManager.getInstance()
        }));
        
        ws.on('close', () => {
          console.log('Conexão WebSocket fechada');
        });
      });
      
      wss.on('listening', () => {
        console.log(`Servidor WebSocket executando na porta ${port}`);
        resolve();
      });
      
      wss.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Para o servidor WebSocket
 */
export function stopWebSocketServer(): void {
  if (wss) {
    wss.close();
    wss = null;
    console.log('Servidor WebSocket parado');
  }
}

/**
 * Transmite uma mensagem para todos os clientes conectados
 */
export function broadcast(message: any): void {
  if (!wss) return;
  
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}
```

#### src/websocket/handlers/index.ts

```typescript
import * as WebSocket from 'ws';
import { InstanceManager } from '../../core/instance-manager';
import * as vscode from 'vscode';

export function setupMessageHandlers(ws: WebSocket, instanceManager: InstanceManager): void {
  ws.on('message', async (message: WebSocket.Data) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const { type, data } = parsedMessage;
      
      switch (type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        case 'execute_command':
          if (data?.command) {
            try {
              const result = await vscode.commands.executeCommand(
                data.command, 
                ...(data.args || [])
              );
              
              ws.send(JSON.stringify({
                type: 'command_result',
                id: data.id,
                success: true,
                result
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'command_result',
                id: data.id,
                success: false,
                error: error.message
              }));
            }
          }
          break;
          
        case 'get_instance_info':
          ws.send(JSON.stringify({
            type: 'instance_info',
            data: instanceManager.getInstance()
          }));
          break;
          
        case 'toggle_devtools':
          try {
            const isOpen = await vscode.commands.executeCommand('editor-control.toggleDevTools');
            ws.send(JSON.stringify({
              type: 'devtools_state',
              open: isOpen
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Falha ao alternar DevTools: ${error.message}`
            }));
          }
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Tipo de mensagem desconhecido: ${type}`
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Falha ao processar mensagem: ${error.message}`
      }));
    }
  });
}
```

## 6. Testes e Depuração

### Executando e Depurando a Extensão

1. Pressione F5 para iniciar uma nova janela do VS Code com sua extensão carregada
2. A extensão deve iniciar automaticamente os servidores se configurada para fazer isso
3. Abra o DevTools no VS Code para visualizar a saída do console com `Ctrl+Shift+I`
4. Teste os endpoints da API usando ferramentas como cURL ou Postman

### Comandos de Exemplo para Teste da API

```bash
# Listar informações da instância
curl http://localhost:3000/api/instances

# Listar comandos disponíveis
curl http://localhost:3000/api/commands

# Executar um comando
curl -X POST http://localhost:3000/api/commands/execute \
  -H "Content-Type: application/json" \
  -d '{"command":"workbench.action.files.newUntitledFile"}'

# Alternar DevTools
curl -X POST http://localhost:3000/api/devtools/toggle
```

### Testando a Comunicação WebSocket

Crie uma página HTML simples para testar a comunicação WebSocket:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Teste WebSocket de Controle do Editor</title>
</head>
<body>
  <h1>Teste WebSocket de Controle do Editor</h1>
  <button id="connect">Conectar</button>
  <button id="disconnect" disabled>Desconectar</button>
  <button id="getInfo" disabled>Obter Informações da Instância</button>
  <button id="toggleDevTools" disabled>Alternar DevTools</button>
  <pre id="output"></pre>

  <script>
    let ws = null;
    const output = document.getElementById('output');
    
    function log(message) {
      output.textContent += message + '\n';
    }
    
    document.getElementById('connect').addEventListener('click', () => {
      ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        log('Conectado ao servidor WebSocket');
        document.getElementById('connect').disabled = true;
        document.getElementById('disconnect').disabled = false;
        document.getElementById('getInfo').disabled = false;
        document.getElementById('toggleDevTools').disabled = false;
      };
      
      ws.onmessage = (event) => {
        log(`Recebido: ${event.data}`);
      };
      
      ws.onclose = () => {
        log('Desconectado do servidor WebSocket');
        document.getElementById('connect').disabled = false;
        document.getElementById('disconnect').disabled = true;
        document.getElementById('getInfo').disabled = true;
        document.getElementById('toggleDevTools').disabled = true;
      };
      
      ws.onerror = (error) => {
        log(`Erro WebSocket: ${error}`);
      };
    });
    
    document.getElementById('disconnect').addEventListener('click', () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    });
    
    document.getElementById('getInfo').addEventListener('click', () => {
      if (ws) {
        ws.send(JSON.stringify({ type: 'get_instance_info' }));
      }
    });
    
    document.getElementById('toggleDevTools').addEventListener('click', () => {
      if (ws) {
        ws.send(JSON.stringify({ type: 'toggle_devtools' }));
      }
    });
  </script>
</body>
</html>
```

## 7. Implantação para Uso Interno da Equipe

### Construindo o Pacote da Extensão

Crie um pacote `.vsix` para distribuição:

```bash
vsce package
```

Isso gerará um arquivo `.vsix` no diretório do seu projeto.

### Instalando a Extensão a partir do Arquivo `.vsix`

Compartilhe o arquivo `.vsix` com os membros da sua equipe, que podem instalá-lo:

1. Abrindo o VS Code
2. Indo para a visualização de Extensões (`Ctrl+Shift+X`)
3. Clicando no menu "..." no canto superior direito
4. Selecionando "Instalar a partir do VSIX..."
5. Navegando até e selecionando o arquivo `.vsix`

### Configurando a Extensão

Cada membro da equipe deve configurar a extensão através das configurações do VS Code:

1. Vá para Configurações (`Ctrl+,`)
2. Pesquise por "editorControl"
3. Ajuste as configurações de portas e auto-início conforme necessário

### Habilitando Atualizações Automáticas

Para uma manutenção mais fácil, configure um mecanismo de atualização simples:

1. Hospede a extensão em um servidor interno ou repositório Git
2. Crie um script de atualização simples que:
   - Baixa a versão mais recente
   - Desinstala a versão atual
   - Instala a nova versão

## 8. Roadmap Progressivo Detalhado

### Fase 1: Configuração Inicial e Funcionalidade Principal (Semanas 1-2)

#### Semana 1: Configuração do Projeto

**Dias 1-2: Configuração Inicial do Projeto**
- Configurar ambiente de desenvolvimento
- Gerar projeto de extensão usando Yeoman
- Configurar configurações do TypeScript
- Configurar ESLint para qualidade de código
- Criar estrutura básica de pastas

**Dias 3-4: Esqueleto dos Componentes Principais**
- Criar ponto de entrada principal da extensão
- Implementar lógica básica de ativação/desativação
- Configurar mecanismo de identificação de instâncias
- Criar arquivos de stub para todos os componentes principais

**Dia 5: Testes Iniciais**
- Configurar configuração de depuração
- Criar ambiente de teste para testes locais
- Testar ativação e desativação básicas
- Corrigir quaisquer problemas iniciais

#### Semana 2: Implementação do Servidor API

**Dias 1-2: Configuração do Servidor Express**
- Instalar dependências do Express
- Criar configuração básica do servidor
- Implementar configuração de middleware
- Configurar estrutura de roteamento

**Dias 3-4: Endpoints API Principais**
- Implementar endpoint de informações da instância
- Criar endpoint de listagem de comandos
- Adicionar endpoint de execução de comandos
- Adicionar tratamento básico de erros

**Dia 5: Testando o Servidor API**
- Testar manualmente todos os endpoints
- Documentar especificação da API
- Corrigir problemas identificados

### Fase 2: WebSocket e Recursos Avançados (Semanas 3-4)

#### Semana 3: Implementação do Servidor WebSocket

**Dias 1-2: Configuração do Servidor WebSocket**
- Instalar dependências WebSocket
- Criar servidor WebSocket básico
- Implementar manipulação de conexão
- Configurar análise de mensagens

**Dias 3-4: Manipuladores de Mensagens WebSocket**
- Implementar execução de comandos via WebSocket
- Adicionar mensagens de informações da instância
- Criar notificações de eventos em tempo real
- Configurar ping/pong para monitoramento de conexão

**Dia 5: Teste WebSocket**
- Criar cliente de teste para WebSocket
- Testar todos os tipos de mensagens
- Documentar API WebSocket
- Corrigir problemas identificados

#### Semana 4: Integração do DevTools

**Dias 1-2: Comandos Básicos do DevTools**
- Pesquisar métodos de acesso ao Electron DevTools
- Implementar comando de alternar DevTools
- Criar endpoint da API para controle do DevTools
- Adicionar mensagens WebSocket para DevTools

**Dias 3-4: Integração Avançada do DevTools**
- Investigar execução de script no DevTools
- Implementar comandos de execução de script do DevTools
- Criar interfaces de API e WebSocket para execução de script
- Documentar limitações e soluções alternativas

**Dia 5: Teste do DevTools**
- Testar funcionalidade do DevTools no VSCode
- Testar funcionalidade do DevTools no Cursor IDE
- Testar funcionalidade do DevTools no WindSurf
- Documentar diferenças entre implementações de editores

### Fase 3: Aprimoramento e Documentação (Semanas 5-6)

#### Semana 5: Qualidade de Código e Aprimoramentos

**Dias 1-2: Revisão e Refatoração de Código**
- Revisar toda a base de código
- Refatorar para arquitetura mais limpa
- Melhorar tratamento de erros
- Adicionar logging para melhor diagnóstico

**Dias 3-4: Otimizações de Desempenho**
- Otimizar inicialização do servidor
- Melhorar eficiência de manipulação de mensagens
- Reduzir uso de memória
- Lidar graciosamente com casos extremos

**Dia 5: Recursos Adicionais**
- Adicionar opções de configuração
- Implementar alternâncias de recursos
- Criar indicadores da barra de status
- Adicionar comandos de diagnóstico

#### Semana 6: Documentação e Empacotamento

**Dias 1-2: Documentação do Usuário**
- Criar README.md detalhado
- Documentar todos os endpoints da API
- Documentar protocolo WebSocket
- Criar exemplos de uso

**Dias 3-4: Documentação do Desenvolvedor**
- Documentar arquitetura do código
- Criar diretrizes de contribuição
- Adicionar documentação inline ao código
- Criar diagramas arquiteturais

**Dia 5: Empacotamento e Distribuição**
- Criar pacote de extensão
- Testar processo de instalação
- Criar documentação de implantação
- Preparar para distribuição à equipe

## 9. Referências e Recursos

### Referências da API de Extensão do VSCode

- [API de Extensão do VS Code](https://code.visualstudio.com/api)
- [Guias de Extensão](https://code.visualstudio.com/api/extension-guides/overview)
- [Referência da API do VS Code](https://code.visualstudio.com/api/references/vscode-api)

### APIs Web e WebSocket

- [Documentação do Express.js](https://expressjs.com/)
- [WS: Biblioteca WebSocket](https://github.com/websockets/ws)

### Ferramentas de Desenvolvimento

- [Gerador de Extensão do Yeoman para VS Code](https://github.com/Microsoft/vscode-generator-code)
- [VSCE (Gerenciador de Extensão do VS Code)](https://github.com/microsoft/vscode-vsce)

### Extensões e Exemplos Relacionados

- [vscode-remote-control](https://github.com/estruyf/vscode-remote-control)
- [vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples)

Este documento fornece um guia abrangente para criar uma extensão do VSCode que pode controlar múltiplas instâncias de editor, com foco no acesso ao console do Electron DevTools no Cursor IDE. O roadmap divide a implementação em tarefas progressivas, facilitando o acompanhamento e o controle do progresso pela sua equipe.