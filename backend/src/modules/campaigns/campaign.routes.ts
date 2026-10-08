import { Router } from 'express';
import { cancelRegistrationController, getCampaignController, listCampaignsController, registerController } from './campaign.controller.js';

export const campaignRouter = Router();
campaignRouter.get('/', listCampaignsController);
campaignRouter.get('/:id', getCampaignController);
campaignRouter.post('/:id/register', registerController);
campaignRouter.delete('/:id/register', cancelRegistrationController);
