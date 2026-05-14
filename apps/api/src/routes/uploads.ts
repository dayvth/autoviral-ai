import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { enqueueUpload } from '../lib/queue';

const router = Router();
router.use(authenticate);

// POST /api/uploads — schedule an upload
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { videoId, socialAccountId, scheduledAt } = req.body;

    const [video, account] = await Promise.all([
      prisma.video.findFirst({ where: { id: videoId, userId: req.user!.id } }),
      prisma.socialAccount.findFirst({ where: { id: socialAccountId, userId: req.user!.id } }),
    ]);

    if (!video) throw new AppError(404, 'Video not found');
    if (!account) throw new AppError(404, 'Social account not found');
    if (video.status !== 'READY') throw new AppError(400, 'Video is not ready for upload');

    const upload = await prisma.upload.create({
      data: {
        videoId: video.id,
        socialAccountId: account.id,
        platform: account.platform,
        status: 'PENDING',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });

    const delay = scheduledAt ? Math.max(0, new Date(scheduledAt).getTime() - Date.now()) : 0;
    await enqueueUpload({ uploadId: upload.id, videoId: video.id, socialAccountId: account.id, platform: account.platform, scheduledAt }, delay);

    res.status(201).json({ success: true, data: upload });
  } catch (err) { next(err); }
});

// GET /api/uploads
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const uploads = await prisma.upload.findMany({
      where: { video: { userId: req.user!.id } },
      include: {
        video: { select: { title: true, thumbnailUrl: true } },
        socialAccount: { select: { platform: true, accountName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: uploads });
  } catch (err) { next(err); }
});

export default router;
