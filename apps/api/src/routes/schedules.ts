import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { userId: req.user!.id },
      include: { niche: { select: { name: true } } },
    });
    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { nicheId, name, cronExpr, platforms, timezone } = req.body;
    const schedule = await prisma.schedule.create({
      data: { userId: req.user!.id, nicheId, name, cronExpr, platforms, timezone: timezone ?? 'America/Sao_Paulo' },
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schedule = await prisma.schedule.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
    if (!schedule) throw new AppError(404, 'Schedule not found');
    const updated = await prisma.schedule.update({ where: { id: schedule.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schedule = await prisma.schedule.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
    if (!schedule) throw new AppError(404, 'Schedule not found');
    await prisma.schedule.delete({ where: { id: schedule.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
