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