import { google } from 'googleapis';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { decrypt } from '../lib/crypto';

// ── Sync analytics from all platforms ─────────────────────────

export async function syncUserAnalytics(userId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { userId, isActive: true },
    include: { uploads: { where: { status: 'PUBLISHED' }, take: 50, orderBy: { publishedAt: 'desc' } } },
  });

  for (const account of accounts) {
    try {
      switch (account.platform) {
        case 'YOUTUBE':
        case 'YOUTUBE_SHORTS':
          await syncYouTubeAnalytics(account);
          break;
        // TikTok and Instagram analytics would follow similar patterns
        default:
          break;
      }
    } catch (err) {
      logger.warn(`[Analytics] Failed to sync ${account.platform} for account ${account.id}`, err);
    }
  }
}

async function syncYouTubeAnalytics(account: any) {
  if (!account.accessToken) return;

  const accessToken = await decrypt(account.accessToken);

  const oauth2 = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken });

  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2 });

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const upload of account.uploads) {
    if (!upload.platformVideoId) continue;

    try {
      const resp = await youtubeAnalytics.reports.query({
        ids: `channel==MINE`,
        startDate,
        endDate,
        metrics: 'views,likes,comments,shares,averageViewDuration,estimatedMinutesWatched',
        filters: `video==${upload.platformVideoId}`,
        dimensions: 'day',
      });

      const rows = resp.data.rows ?? [];
      const totals = rows.reduce(
        (acc: any, row: any) => ({
          views: acc.views + (Number(row[1]) || 0),
          likes: acc.likes + (Number(row[2]) || 0),
          comments: acc.comments + (Number(row[3]) || 0),
          shares: acc.shares + (Number(row[4]) || 0),
          watchTimeSeconds: acc.watchTimeSeconds + (Number(row[5]) || 0) * 60,
        }),
        { views: 0, likes: 0, comments: 0, shares: 0, watchTimeSeconds: 0 }
      );

      await prisma.analytics.upsert({
        where: { id: `yt-${upload.id}-${endDate}` },
        update: totals,
        create: {
          id: `yt-${upload.id}-${endDate}`,
          userId: account.userId,
          videoId: upload.videoId,
          uploadId: upload.id,
          platform: account.platform,
          date: new Date(),
          ...totals,
        },
      });
    } catch (err) {
      logger.warn(`[Analytics] YouTube query failed for upload ${upload.id}`, err);
    }
  }
}

// ── Dashboard aggregates ───────────────────────────────────────

export async function getDashboardStats(userId: string) {
  const [totalVideos, totalViews, recentAnalytics, topVideos, platformStats] = await Promise.all([
    prisma.video.count({ where: { userId } }),

    prisma.analytics.aggregate({
      where: { userId },
      _sum: { views: true, watchTimeSeconds: true, likes: true },
    }),

    prisma.analytics.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: 'asc' },
      take: 30,
    }),

    prisma.analytics.findMany({
      where: { userId },
      orderBy: { views: 'desc' },
      take: 5,
      include: { video: { select: { title: true, thumbnailUrl: true } } },
    }),

    prisma.analytics.groupBy({
      by: ['platform'],
      where: { userId },
      _sum: { views: true, likes: true },
    }),
  ]);

  return {
    totalVideos,
    totalViews: totalViews._sum.views ?? 0,
    totalWatchTime: totalViews._sum.watchTimeSeconds ?? 0,
    totalLikes: totalViews._sum.likes ?? 0,
    dailyStats: recentAnalytics,
    topVideos,
    platformStats,
  };
}

// ── AI improvement: analyze top performers ────────────────────

export async function analyzePerformancePatterns(userId: string) {
  const topVideos = await prisma.video.findMany({
    where: { userId, status: 'PUBLISHED' },
    include: {
      analytics: { orderBy: { views: 'desc' }, take: 1 },
      script: true,
    },
    take: 20,
  });

  const viral = topVideos.filter((v) => (v.analytics[0]?.views ?? 0) > 10_000);
  const notViral = topVideos.filter((v) => (v.analytics[0]?.views ?? 0) < 1_000);

  if (viral.length === 0) return null;

  // Extract patterns from viral content
  const patterns = {
    avgDuration: viral.reduce((acc, v) => acc + (v.duration ?? 0), 0) / viral.length,
    avgViralScore: viral.reduce((acc, v) => acc + (v.viralScore ?? 0), 0) / viral.length,
    topPlatforms: [...new Set(viral.map((v) => v.platform))],
    hookPatterns: viral.map((v) => v.script?.hook).filter(Boolean).slice(0, 5),
    commonHashtags: [...new Set(viral.flatMap((v) => v.script?.hashtags ?? []))].slice(0, 15),
  };

  logger.info(`[Analytics] Viral patterns for user ${userId}:`, patterns);
  return patterns;
}
