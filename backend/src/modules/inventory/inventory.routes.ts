import { Router } from 'express';
import { getBankController, listBanksController, summaryController } from './inventory.controller.js';

export const inventoryRouter = Router();
inventoryRouter.get('/banks', listBanksController);
inventoryRouter.get('/banks/:id', getBankController);
inventoryRouter.get('/summary', summaryController);
