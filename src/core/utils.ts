import * as vscode from 'vscode';

/**
 * Funções utilitárias para a extensão
 */

/**
 * Registra uma mensagem de log no console de saída
 */
export function log(message: string): void {
  console.log(`[Editor Control] ${message}`);
}

/**
 * Mostra uma mensagem de erro para o usuário
 */
export function showError(message: string, error?: Error): void {
  const errorMessage = error ? `${message}: ${error.message}` : message;
  vscode.window.showErrorMessage(errorMessage);
  log(`ERRO: ${errorMessage}`);
  if (error && error.stack) {
    log(`Stack: ${error.stack}`);
  }
}

/**
 * Mostra uma mensagem de informação para o usuário
 */
export function showInfo(message: string): void {
  vscode.window.showInformationMessage(message);
  log(message);
}

/**
 * Obtém uma configuração da extensão
 */
export function getConfig<T>(key: string, defaultValue?: T): T {
  const config = vscode.workspace.getConfiguration('editorControl');
  return config.get<T>(key, defaultValue as T);
}