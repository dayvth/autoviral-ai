import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; plan: string; isAdmin: boolean };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing authorization token', 'UNAUTHORIZED'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      plan: string;
      isAdmin: boolean;
    };

    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return next(new AppError(403, 'Admin access required', 'FORBIDDEN'));
  }
  next();
}

export function requirePlan(...plans: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !plans.includes(req.user.plan)) {
      return next(
        new AppError(403, `This feature requires one of: ${plans.join(', ')} plan`, 'PLAN_REQUIRED')
      );
    }
    next();
  };
}
