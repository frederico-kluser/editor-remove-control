import * as WebSocket from 'ws';
import { InstanceManager } from '../../core/instance-manager';
import * as vscode from 'vscode';
import { log } from '../../core/utils';

export function setupMessageHandlers(ws: WebSocket.WebSocket, instanceManager: InstanceManager): void {
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
            } catch (error: any) {
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
          } catch (error: any) {
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
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Falha ao processar mensagem: ${error.message}`
      }));
    }
  });
}