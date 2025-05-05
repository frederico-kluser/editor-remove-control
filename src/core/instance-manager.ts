import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { EditorInstance } from '../types';

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