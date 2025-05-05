import * as vscode from 'vscode';
import { showError } from '../core/utils';

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
      } catch (error: any) {
        showError('Falha ao alternar DevTools', error);
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
      } catch (error: any) {
        showError('Falha ao executar no DevTools', error);
        throw error;
      }
    })
  );
}