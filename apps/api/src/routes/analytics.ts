import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDashboardStats, analyzePerformancePatterns } from '../services/analytics.service';

const router = Router();
router.use(authenticate);

// GET /api/analytics/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const stats = await getDashboardStats(req.user!.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/patterns — AI improvement data
router.get('/patterns', async (req: AuthRequest, res: Response, next) => {
  try {
    const patterns = await analyzePerformancePatterns(req.user!.id);
    res.json({ success: true, data: patterns });
  } catch (err) {
    next(err);
  }
});

export default router;
