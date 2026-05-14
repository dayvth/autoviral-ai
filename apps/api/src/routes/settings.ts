import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { userId: req.user!.id } });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.put('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      update: req.body,
      create: { userId: req.user!.id, ...req.body },
    });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

export default router;
