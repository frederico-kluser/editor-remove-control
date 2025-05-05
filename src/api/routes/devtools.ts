import { Router } from 'express';
import * as vscode from 'vscode';

export const devtoolsRouter = Router();

// Alterna a visibilidade do DevTools
devtoolsRouter.post('/toggle', async (req: any, res) => {
  try {
    const isOpen = await vscode.commands.executeCommand('editor-control.toggleDevTools');
    res.json({ success: true, devToolsOpen: isOpen });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Executa script no console do DevTools
devtoolsRouter.post('/execute', async (req: any, res) => {
  const { script } = req.body;
  
  if (!script) {
    return res.status(400).json({ error: 'Script é obrigatório' });
  }
  
  try {
    await vscode.commands.executeCommand('editor-control.executeInDevTools', script);
    res.json({ 
      success: true, 
      message: 'Execução do script iniciada' 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});