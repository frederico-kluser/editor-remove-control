import { Router } from 'express';

export const instancesRouter = Router();

// Lista todas as instâncias ativas do editor
instancesRouter.get('/', (req: any, res) => {
  const instance = req.instanceManager.getInstance();
  res.json({ instance });
});