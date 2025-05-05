import express from 'express';
import * as http from 'http';
import cors from 'cors';
import { InstanceManager } from '../core/instance-manager';
import { registerRoutes } from './routes';
import { log } from '../core/utils';

let app: express.Express | null = null;
let server: http.Server | null = null;

/**
 * Inicia o servidor API na porta especificada
 */
export async function startApiServer(port: number, instanceManager: InstanceManager): Promise<void> {
  if (server) {
    throw new Error('O servidor API já está em execução');
  }

  app = express();
  
  // Middleware
  app.use(express.json());
  app.use(cors({ origin: 'http://localhost' })); // Restringir ao localhost
  
  // Define o gerenciador de instâncias no objeto de requisição
  app.use((req: any, res, next) => {
    req.instanceManager = instanceManager;
    next();
  });
  
  // Registra todas as rotas
  registerRoutes(app);

  // Inicia o servidor
  return new Promise((resolve, reject) => {
    // Neste ponto sabemos que app não é null
    const expressApp = app as express.Express;
    
    server = expressApp.listen(port, () => {
      log(`Servidor API de controle do editor executando na porta ${port}`);
      resolve();
    });
    
    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Para o servidor API
 */
export function stopApiServer(): void {
  if (server) {
    server.close();
    server = null;
    app = null;
    log('Servidor API parado');
  }
}