import { Router, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.post('/push-token', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const token = String(req.body.token ?? '').trim();
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    res.status(400).json({ message: 'A valid Expo push token is required.' });
    return;
  }
  await req.user!.updateOne({ $addToSet: { pushTokens: token } });
  res.status(204).send();
});

notificationRouter.delete('/push-token', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const token = String(req.body.token ?? '').trim();
  if (token) await req.user!.updateOne({ $pull: { pushTokens: token } });
  res.status(204).send();
});
