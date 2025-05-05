import * as vscode from 'vscode';
import { startApiServer, stopApiServer } from './api/server';
import { startWebSocketServer, stopWebSocketServer } from './websocket/server';
import { InstanceManager } from './core/instance-manager';
import { registerCommands } from './commands/registry';
import { log, showError, showInfo, getConfig } from './core/utils';

export async function activate(context: vscode.ExtensionContext) {
  log('Editor Control Extension agora está ativa');
  
  // Inicializar o gerenciador de instâncias
  const instanceManager = new InstanceManager(context);
  
  // Registrar todos os comandos
  registerCommands(context, instanceManager);
  
  // Auto-iniciar servidores se configurado
  if (getConfig<boolean>('autoStart', true)) {
    const apiPort = getConfig<number>('port', 3000);
    const wsPort = getConfig<number>('wsPort', 3001);
    
    try {
      await startApiServer(apiPort, instanceManager);
      await startWebSocketServer(wsPort, instanceManager);
      showInfo(`Servidores de Controle do Editor iniciados nas portas ${apiPort} (HTTP) e ${wsPort} (WebSocket)`);
    } catch (error: any) {
      showError('Falha ao iniciar servidores', error);
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