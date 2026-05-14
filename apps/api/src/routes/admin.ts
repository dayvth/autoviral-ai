import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (_req, res: Response, next) => {
  try {
    const [users, videos, uploads, jobs] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.upload.count({ where: { status: 'PUBLISHED' } }),
      prisma.job.count({ where: { status: 'FAILED' } }),
    ]);

    const planBreakdown = await prisma.user.groupBy({ by: ['plan'], _count: { id: true } });

    res.json({ success: true, data: { users, videos, publishedUploads: uploads, failedJobs: jobs, planBreakdown } });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, email: true, name: true, plan: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

// GET /api/admin/jobs
router.get('/jobs', async (_req, res: Response, next) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

export default router;
