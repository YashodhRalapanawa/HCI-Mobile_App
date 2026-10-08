import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, type UserDocument } from '../modules/users/user.model.js';

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface JwtPayload {
  id: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'Account associated with token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    void error;
    res.status(401).json({ message: 'Invalid or expired session token. Please log in again.' });
  }
}
