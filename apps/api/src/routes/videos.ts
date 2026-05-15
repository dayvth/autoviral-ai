import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { enqueueScript, enqueueVoice, enqueueVideo } from '../lib/queue';
import { io } from '../index';

const router = Router();

router.use(authenticate);

// GET /api/videos — list user videos
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const status = req.query.status as string | undefined;
    const nicheId = req.query.nicheId as string | undefined;

    const where = {
      userId: req.user!.id,
      ...(status ? { status: status as any } : {}),
      ...(nicheId ? { nicheId } : {}),
    };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          niche: { select: { name: true } },
          uploads: { select: { platform: true, status: true, platformUrl: true } },
          analytics: { orderBy: { views: 'desc' }, take: 1 },
        },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({ success: true, data: { videos, total, page, limit } });
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/:id
router.get('/:id', param('id').isString(), async (req: AuthRequest, res: Response, next) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
      include: {
        script: true,
        niche: true,
        uploads: { include: { socialAccount: { select: { platform: true, accountName: true } } } },
        analytics: { orderBy: { date: 'desc' }, take: 30 },
        thumbnails: true,
      },
    });

    if (!video) throw new AppError(404, 'Video not found');
    res.json({ success: true, data: video });
  } catch (err) {
    next(err);
  }
});

const NICHE_DEFAULTS: Record<string, string> = {
  curiosidades: 'Curiosidades',
  motivacao: 'Motivação',
  financas: 'Finanças',
  ia: 'IA & Tech',
  fitness: 'Fitness',
  luxo: 'Luxo',
  esportes: 'Esportes',
  anime: 'Anime',
  historias: 'Histórias',
  negocios: 'Negócios',
  carros: 'Carros',
  frases: 'Frases',
};

async function resolveOrCreateNiche(userId: string, nicheId: string, platform: string) {
  // Try by real DB id first
  let niche = await prisma.niche.findFirst({ where: { id: nicheId, userId } });
  if (niche) return niche;

  // Try by slug
  niche = await prisma.niche.findFirst({ where: { slug: nicheId, userId } });
  if (niche) return niche;

  // Auto-create with sensible defaults
  const name = NICHE_DEFAULTS[nicheId] ?? nicheId;
  return prisma.niche.create({
    data: {
      userId,
      name,
      slug: nicheId,
      keywords: [nicheId],
      languages: ['pt-BR'],
      platforms: [platform as any],
      postingFrequency: 'DAILY',
      videoStyle: 'CINEMATIC',
    },
  });
}

// POST /api/videos/generate — trigger full video creation pipeline
router.post(
  '/generate',
  [
    body('nicheId').isString().notEmpty(),
    body('platform').isIn(['YOUTUBE', 'YOUTUBE_SHORTS', 'TIKTOK', 'INSTAGRAM_REELS', 'FACEBOOK_REELS']),
    body('duration').isInt({ min: 15, max: 600 }).optional(),
    body('trendId').isString().optional(),
    body('voiceId').isString().optional(),
  ],
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR');

      const { nicheId, platform, duration = 60, trendId, voiceId } = req.body;
      const userId = req.user!.id;

      // Resolve niche — auto-creates if slug not yet in DB
      const niche = await resolveOrCreateNiche(userId, nicheId, platform);

      // Create video record
      const video = await prisma.video.create({
        data: {
          userId,
          nicheId: niche.id,
          title: 'Generating...',
          platform,
          status: 'PENDING',
          duration,
          orientation: ['TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS'].includes(platform)
            ? 'VERTICAL'
            : 'HORIZONTAL',
        },
      });

      // Enqueue script generation (voice and video will be chained in workers)

      const job = await enqueueScript({
        nicheId: niche.id,
        trendId,
        userId,
        videoId: video.id,
        voiceId,
        language: niche.languages[0] ?? 'pt-BR',
        platform,
        duration,
        style: niche.videoStyle,
      });

      // Update video with job reference
      await prisma.video.update({
        where: { id: video.id },
        data: { renderJobId: job.id as string },
      });

      // Notify via WebSocket
      io.to(`user:${userId}`).emit('video:started', { videoId: video.id, jobId: job.id });

      res.status(202).json({
        success: true,
        data: { videoId: video.id, jobId: job.id, message: 'Video generation queued' },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/videos/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });

    if (!video) throw new AppError(404, 'Video not found');

    await prisma.video.delete({ where: { id: video.id } });

    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
