import cron from 'node-cron';
import { prisma } from './prisma';
import { enqueueTrendResearch, enqueueScript, enqueueAnalytics } from './queue';
import { logger } from './logger';

export async function initScheduler() {
  // Trend research — every 3 hours
  cron.schedule('0 */3 * * *', async () => {
    logger.info('[Scheduler] Running trend research');
    const niches = await prisma.niche.findMany({ where: { isActive: true } });

    for (const niche of niches) {
      await enqueueTrendResearch(niche.id, niche.userId).catch((err) =>
        logger.error(`Failed to enqueue trend research for niche ${niche.id}`, err)
      );
    }
  });

  // Auto-script generation — runs based on each user's posting frequency
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[Scheduler] Checking content generation schedule');
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
      include: { niche: true },
    });

    for (const schedule of schedules) {
      if (!schedule.niche) continue;

      // Find a fresh trend for this niche
      const trend = await prisma.trend.findFirst({
        where: {
          nicheId: schedule.nicheId ?? undefined,
          isProcessed: false,
          viralScore: { gte: 50 },
        },
        orderBy: { viralScore: 'desc' },
      });

      for (const platform of schedule.platforms) {
        await enqueueScript({
          nicheId: schedule.nicheId!,
          trendId: trend?.id,
          userId: schedule.userId,
          language: schedule.niche.languages[0] ?? 'pt-BR',
          platform,
          duration: 60,
          style: schedule.niche.videoStyle,
        });
      }

      // Update next run
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
          nextRunAt: computeNextRun(schedule.cronExpr),
        },
      });
    }
  });

  // Analytics sync — every hour
  cron.schedule('5 * * * *', async () => {
    logger.info('[Scheduler] Syncing analytics');
    const users = await prisma.user.findMany({ where: { isActive: true } });

    for (const user of users) {
      await enqueueAnalytics({ userId: user.id }).catch(() => {});
    }
  });

  logger.info('[Scheduler] All cron jobs initialized');
}

function computeNextRun(cronExpr: string): Date {
  // node-cron doesn't expose next-date natively; approximate via 24h fallback
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now;
}
