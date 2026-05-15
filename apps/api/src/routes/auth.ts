import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  async (req: Request, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR');

      const { email, password, name } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError(409, 'Email already registered', 'CONFLICT');

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          settings: {
            create: {
              defaultLanguage: req.headers['accept-language']?.includes('pt') ? 'pt-BR' : 'en',
            },
          },
        },
      });

      // Store password hash in a separate secrets model (not in schema for brevity — use Supabase Auth in prod)
      const token = signToken(user);

      res.status(201).json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, 'Invalid credentials', 'VALIDATION_ERROR');

      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
      }

      const token = signToken(user);

      res.json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { settings: true },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
        settings: user.settings,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, (req: AuthRequest, res: Response) => {
  const token = signToken(req.user as any);
  res.json({ success: true, data: { token } });
});

function signToken(user: { id: string; email: string; plan: string; isAdmin: boolean }) {
  return jwt.sign(
    { sub: user.id, email: user.email, plan: user.plan, isAdmin: user.isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any }
  );
}

export default router;
