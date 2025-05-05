import { Router } from 'express';
import * as vscode from 'vscode';

export const commandsRouter = Router();

// Lista todos os comandos disponíveis
commandsRouter.get('/', async (req: any, res) => {
  try {
    const commands = await vscode.commands.getCommands(true);
    res.json({ commands });
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});