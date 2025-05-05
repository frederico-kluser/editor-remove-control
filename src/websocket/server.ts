import * as WebSocket from 'ws';
import { InstanceManager } from '../core/instance-manager';
import { setupMessageHandlers } from './handlers/index';
import { log } from '../core/utils';

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
      
      wss.on('connection', (ws: WebSocket.WebSocket) => {
        log('Nova conexão WebSocket estabelecida');
        
        // Configura o tratamento de mensagens
        setupMessageHandlers(ws, instanceManager);
        
        // Envia informações iniciais da instância
        ws.send(JSON.stringify({
          type: 'instance_info',
          data: instanceManager.getInstance()
        }));
        
        ws.on('close', () => {
          log('Conexão WebSocket fechada');
        });
      });
      
      wss.on('listening', () => {
        log(`Servidor WebSocket executando na porta ${port}`);
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
    log('Servidor WebSocket parado');
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