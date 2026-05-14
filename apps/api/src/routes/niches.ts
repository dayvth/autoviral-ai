import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { enqueueTrendResearch } from '../lib/queue';

const router = Router();
router.use(authenticate);

// GET /api/niches
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const niches = await prisma.niche.findMany({
      where: { userId: req.user!.id },
      include: { _count: { select: { videos: true, trends: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: niches });
  } catch (err) {
    next(err);
  }
});

// POST /api/niches
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 60 }),
    body('keywords').isArray({ min: 1, max: 30 }),
    body('languages').isArray({ min: 1 }),
    body('platforms').isArray({ min: 1 }),
    body('postingFrequency').isIn(['HOURLY', 'THREE_TIMES_DAILY', 'DAILY', 'TWICE_WEEKLY', 'WEEKLY', 'MONTHLY']),
  ],
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR');

      const { name, description, keywords, languages, platforms, postingFrequency, videoStyle, voiceId } =
        req.body;

      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const niche = await prisma.niche.create({
        data: {
          userId: req.user!.id,
          name,
          description,
          slug,
          keywords,
          languages,
          platforms,
          postingFrequency,
          videoStyle: videoStyle ?? 'CINEMATIC',
          voiceId,
        },
      });

      // Immediately kick off trend research
      await enqueueTrendResearch(niche.id, req.user!.id);

      res.status(201).json({ success: true, data: niche });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/niches/:id
router.patch('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const niche = await prisma.niche.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!niche) throw new AppError(404, 'Niche not found');

    const updated = await prisma.niche.update({
      where: { id: niche.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        keywords: req.body.keywords,
        languages: req.body.languages,
        platforms: req.body.platforms,
        postingFrequency: req.body.postingFrequency,
        videoStyle: req.body.videoStyle,
        voiceId: req.body.voiceId,
        isActive: req.body.isActive,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/niches/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const niche = await prisma.niche.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!niche) throw new AppError(404, 'Niche not found');
    await prisma.niche.delete({ where: { id: niche.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
