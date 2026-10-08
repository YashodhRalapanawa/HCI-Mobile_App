import { Router } from 'express';
import { createSusController, statsController } from './community.controller.js';

export const communityRouter = Router();
communityRouter.post('/sus', createSusController);
communityRouter.get('/stats', statsController);
