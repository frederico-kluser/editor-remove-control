import * as vscode from 'vscode';
import { InstanceManager } from '../core/instance-manager';
import { registerDevToolsCommands } from './devtools';
import { startApiServer, stopApiServer } from '../api/server';
import { startWebSocketServer, stopWebSocketServer } from '../websocket/server';
import { showError, showInfo, getConfig } from '../core/utils';

export function registerCommands(context: vscode.ExtensionContext, instanceManager: InstanceManager): void {
  // Registra comandos de controle do servidor
  context.subscriptions.push(
    vscode.commands.registerCommand('editor-control.startServer', async () => {
      const apiPort = getConfig<number>('port', 3000);
      const wsPort = getConfig<number>('wsPort', 3001);
      
      try {
        await startApiServer(apiPort, instanceManager);
        await startWebSocketServer(wsPort, instanceManager);
        showInfo(`Servidores de Controle do Editor iniciados nas portas ${apiPort} (HTTP) e ${wsPort} (WebSocket)`);
      } catch (error: any) {
        showError('Falha ao iniciar servidores', error);
      }
    }),
    
    vscode.commands.registerCommand('editor-control.stopServer', () => {
      stopApiServer();
      stopWebSocketServer();
      showInfo('Servidores de Controle do Editor parados');
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