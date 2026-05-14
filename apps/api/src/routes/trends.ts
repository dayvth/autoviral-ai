import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { enqueueTrendResearch } from '../lib/queue';

const router = Router();
router.use(authenticate);

// GET /api/trends — current trends for user's niches
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const niches = await prisma.niche.findMany({
      where: { userId: req.user!.id, isActive: true },
      select: { id: true },
    });
    const nicheIds = niches.map((n) => n.id);

    const trends = await prisma.trend.findMany({
      where: {
        nicheId: { in: nicheIds },
        isProcessed: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { viralScore: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: trends });
  } catch (err) { next(err); }
});

// POST /api/trends/refresh — manually trigger trend research
router.post('/refresh', async (req: AuthRequest, res: Response, next) => {
  try {
    const { nicheId } = req.body;
    await enqueueTrendResearch(nicheId, req.user!.id);
    res.json({ success: true, message: 'Trend research queued' });
  } catch (err) { next(err); }
});

export default router;
