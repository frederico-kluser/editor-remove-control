/**
 * Editor Control Extension - Cliente de Exemplo
 * 
 * Este script demonstra como uma aplicação Node.js pode se comunicar com a extensão
 * Editor Control via REST API e WebSocket para controlar remotamente instâncias
 * do VSCode, Cursor IDE e WindSurf.
 * 
 * Recursos demonstrados:
 * - Conexão com a API REST
 * - Estabelecimento de conexão WebSocket
 * - Execução de comandos remotamente
 * - Interação com o console do DevTools
 * - Detecção de estados do DevTools (aberto/fechado)
 * - Tratamento de erros e reconexão automática
 */

const http = require('http');
const WebSocket = require('ws');
const { promisify } = require('util');

// Configurações de conexão
const CONFIG = {
  apiPort: 3000,                      // Porta da API REST 
  wsPort: 3001,                       // Porta do WebSocket
  host: 'localhost',                  // Host onde a extensão está rodando
  reconnectInterval: 5000,            // Intervalo de reconexão em ms
  maxReconnectAttempts: 10,           // Número máximo de tentativas de reconexão
  requestTimeout: 10000,              // Timeout para requisições HTTP em ms
  heartbeatInterval: 30000,           // Intervalo para mensagens de heartbeat em ms
};

/**
 * Classe principal do cliente de controle do editor
 */
class EditorControlClient {
  constructor(config = CONFIG) {
    this.config = { ...CONFIG, ...config };
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pendingCommands = new Map();
    this.commandId = 1;
    this.isDevToolsOpen = false;
    this.onDevToolsStateChange = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
  }

  /**
   * Inicia a conexão com a extensão
   */
  async connect() {
    try {
      const instanceInfo = await this.getInstanceInfo();
      console.log('Conectado à instância do editor:', instanceInfo.type);
      this.connectWebSocket();
      return instanceInfo;
    } catch (error) {
      console.error('Falha ao conectar:', error.message);
      throw error;
    }
  }

  /**
   * Encerra a conexão com a extensão
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.clearTimers();
    console.log('Desconectado da extensão');
  }

  /**
   * Limpa os timers internos
   */
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Estabelece conexão WebSocket com a extensão
   */
  connectWebSocket() {
    const url = `ws://${this.config.host}:${this.config.wsPort}`;
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        console.log('Conexão WebSocket estabelecida');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        if (typeof this.onConnected === 'function') {
          this.onConnected();
        }
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error.message);
        }
      });
      
      this.ws.on('close', () => {
        console.log('Conexão WebSocket fechada');
        this.clearTimers();
        
        if (typeof this.onDisconnected === 'function') {
          this.onDisconnected();
        }
        
        this.attemptReconnect();
      });
      
      this.ws.on('error', (error) => {
        console.error('Erro na conexão WebSocket:', error.message);
        
        if (typeof this.onError === 'function') {
          this.onError(error);
        }
      });
    } catch (error) {
      console.error('Falha ao criar conexão WebSocket:', error.message);
      this.attemptReconnect();
    }
  }

  /**
   * Tenta reconectar ao servidor após desconexão
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Número máximo de tentativas de reconexão atingido');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Tentando reconectar (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, this.config.reconnectInterval);
  }

  /**
   * Inicia o envio periódico de mensagens de heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Processa mensagens recebidas via WebSocket
   */
  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'pong':
        // Heartbeat response - conexão está ativa
        break;
        
      case 'command_result':
        // Resolução de um comando pendente
        const pendingCommand = this.pendingCommands.get(message.id);
        if (pendingCommand) {
          if (message.success) {
            pendingCommand.resolve(message.result);
          } else {
            pendingCommand.reject(new Error(message.error));
          }
          this.pendingCommands.delete(message.id);
        }
        break;
        
      case 'instance_info':
        console.log('Informações da instância:', message.data);
        break;
        
      case 'devtools_state':
        const wasOpen = this.isDevToolsOpen;
        this.isDevToolsOpen = message.open;
        
        if (wasOpen !== this.isDevToolsOpen && typeof this.onDevToolsStateChange === 'function') {
          this.onDevToolsStateChange(this.isDevToolsOpen);
        }
        break;
        
      case 'error':
        console.error('Erro recebido do servidor:', message.message);
        break;
        
      default:
        console.log('Mensagem recebida:', message);
    }
  }

  /**
   * Envia uma mensagem via WebSocket
   */
  sendWebSocketMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }
    
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Realiza uma requisição HTTP para a API REST
   */
  async makeHttpRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.config.host,
        port: this.config.apiPort,
        path: `/api${path}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.requestTimeout,
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              reject(new Error(parsedData.error || `Falha na requisição: ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`Falha ao processar resposta: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Erro na requisição: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.abort();
        reject(new Error('Timeout na requisição'));
      });
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  /**
   * Obtém informações sobre a instância atual do editor
   */
  async getInstanceInfo() {
    return this.makeHttpRequest('GET', '/instances');
  }

  /**
   * Lista todos os comandos disponíveis na instância do editor
   */
  async listCommands() {
    return this.makeHttpRequest('GET', '/commands');
  }

  /**
   * Executa um comando no editor via API REST
   */
  async executeCommand(command, args = []) {
    return this.makeHttpRequest('POST', '/commands/execute', { command, args });
  }

  /**
   * Executa um comando no editor via WebSocket
   * Retorna uma promise que será resolvida com o resultado do comando
   */
  executeCommandViaWebSocket(command, args = []) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket não está conectado'));
        return;
      }
      
      const id = this.commandId++;
      
      this.pendingCommands.set(id, { resolve, reject });
      
      // Configura um timeout para a execução do comando
      const timeout = setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error('Timeout na execução do comando'));
        }
      }, this.config.requestTimeout);
      
      try {
        this.sendWebSocketMessage({
          type: 'execute_command',
          id,
          data: {
            command,
            args,
            id
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingCommands.delete(id);
        reject(error);
      }
    });
  }

  /**
   * Alterna a visibilidade do DevTools via API REST
   */
  async toggleDevTools() {
    const result = await this.makeHttpRequest('POST', '/devtools/toggle');
    this.isDevToolsOpen = result.devToolsOpen;
    return this.isDevToolsOpen;
  }

  /**
   * Alterna a visibilidade do DevTools via WebSocket
   */
  async toggleDevToolsViaWebSocket() {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket não está conectado'));
        return;
      }
      
      const id = this.commandId++;
      
      // Usamos uma promise com timeout
      let timeoutId = setTimeout(() => {
        reject(new Error('Timeout ao alternar DevTools'));
      }, this.config.requestTimeout);
      
      // Handler para resposta de estado do DevTools
      const handleDevToolsState = (isOpen) => {
        clearTimeout(timeoutId);
        this.removeDevToolsListener(handleDevToolsState);
        resolve(isOpen);
      };
      
      // Adiciona listener temporário
      this.onDevToolsStateChange = handleDevToolsState;
      
      // Envia a mensagem
      try {
        this.sendWebSocketMessage({
          type: 'toggle_devtools',
          id
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.removeDevToolsListener(handleDevToolsState);
        reject(error);
      }
    });
  }

  /**
   * Remove um listener específico de mudança de estado do DevTools
   */
  removeDevToolsListener(listener) {
    if (this.onDevToolsStateChange === listener) {
      this.onDevToolsStateChange = null;
    }
  }

  /**
   * Executa um script no console do DevTools
   */
  async executeInDevTools(script) {
    return this.makeHttpRequest('POST', '/devtools/execute', { script });
  }
}

/**
 * Função auxiliar para aguardar por um tempo determinado
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Demonstra o uso do cliente
 */
async function demonstrateClient() {
  try {
    // Cria uma instância do cliente
    const client = new EditorControlClient();
    
    // Registra handlers de eventos
    client.onConnected = () => console.log('🟢 Conectado à extensão');
    client.onDisconnected = () => console.log('🔴 Desconectado da extensão');
    client.onError = (error) => console.error('❌ Erro:', error.message);
    client.onDevToolsStateChange = (isOpen) => {
      console.log(`DevTools está ${isOpen ? 'aberto' : 'fechado'}`);
    };
    
    // Conecta à extensão
    console.log('Conectando à extensão...');
    const instanceInfo = await client.connect();
    console.log('Conectado ao editor:', instanceInfo.type);
    
    // Lista comandos disponíveis
    console.log('Buscando comandos disponíveis...');
    const commandsResponse = await client.listCommands();
    console.log(`${commandsResponse.commands.length} comandos disponíveis`);
    
    // Executa um comando via API REST
    console.log('Executando comando via API REST...');
    await client.executeCommand('workbench.action.files.newUntitledFile');
    console.log('Novo arquivo não-salvo criado');
    
    // Aguarda um momento
    await sleep(1000);
    
    // Executa um comando via WebSocket
    console.log('Executando comando via WebSocket...');
    await client.executeCommandViaWebSocket('editor.action.selectAll');
    console.log('Comando "Selecionar Tudo" executado');
    
    // Alternando o DevTools
    console.log('Alternando DevTools...');
    const isDevToolsOpen = await client.toggleDevTools();
    console.log(`DevTools agora está ${isDevToolsOpen ? 'aberto' : 'fechado'}`);
    
    // Executa script no DevTools (funciona apenas se o DevTools estiver aberto)
    if (isDevToolsOpen) {
      console.log('Executando script no console do DevTools...');
      await client.executeInDevTools('console.log("Olá do Editor Control Extension!")');
      console.log('Script executado no DevTools');
    }
    
    // Alterna o DevTools novamente via WebSocket
    await sleep(2000);
    console.log('Alternando DevTools via WebSocket...');
    const newDevToolsState = await client.toggleDevToolsViaWebSocket();
    console.log(`DevTools agora está ${newDevToolsState ? 'aberto' : 'fechado'}`);
    
    // Demonstração de tratamento de erros
    try {
      console.log('Demonstrando tratamento de erros...');
      await client.executeCommand('comando.inexistente');
    } catch (error) {
      console.error('Erro capturado corretamente:', error.message);
    }
    
    // Mantenha o script rodando por mais um tempo antes de desconectar
    await sleep(3000);
    
    // Desconecta
    console.log('Desconectando...');
    client.disconnect();
  } catch (error) {
    console.error('Erro na demonstração:', error);
  }
}

// Executa a demonstração quando o script é executado diretamente
if (require.main === module) {
  demonstrateClient().catch(console.error);
}

// Exporta a classe cliente para uso em outros scripts
module.exports = {
  EditorControlClient,
  CONFIG
};