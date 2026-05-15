import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/scripts
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const scripts = await prisma.script.findMany({
      where: { videos: { some: { userId: req.user!.id } } },
      orderBy: { viralScore: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: scripts });
  } catch (err) { next(err); }
});

// GET /api/scripts/:id
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const script = await prisma.script.findFirst({
      where: { id: req.params.id as string },
      include: { trend: true, videos: { where: { userId: req.user!.id } } },
    });
    if (!script) throw new AppError(404, 'Script not found');
    res.json({ success: true, data: script });
  } catch (err) { next(err); }
});

// PATCH /api/scripts/:id — manual edit
router.patch('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const script = await prisma.script.findFirst({
      where: { id: req.params.id, videos: { some: { userId: req.user!.id } } },
    });
    if (!script) throw new AppError(404, 'Script not found');

    const updated = await prisma.script.update({
      where: { id: script.id },
      data: {
        title: req.body.title,
        hook: req.body.hook,
        body: req.body.body,
        cta: req.body.cta,
        description: req.body.description,
        hashtags: req.body.hashtags,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
