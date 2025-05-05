import { Express } from 'express';
import { instancesRouter } from './instances';
import { commandsRouter } from './commands';
import { devtoolsRouter } from './devtools';

export function registerRoutes(app: Express): void {
  app.use('/api/instances', instancesRouter);
  app.use('/api/commands', commandsRouter);
  app.use('/api/devtools', devtoolsRouter);
}