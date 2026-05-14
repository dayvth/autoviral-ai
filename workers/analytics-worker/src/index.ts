import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import winston from 'winston';
import crypto from 'crypto';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { worker: 'analytics-worker' },
  transports: [new winston.transports.Console()],
});

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const KEY = Buffer.from((process.env.JWT_SECRET ?? '').padEnd(32, '0').slice(0, 32));

function decrypt(encoded: string): string {
  const [ivHex, tagHex, encryptedHex] = encoded.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

const worker = new Worker(
  'analytics-sync',
  async (job: Job) => {
    const { userId } = job.data;

    const accounts = await prisma.socialAccount.findMany({
      where: { userId, isActive: true },
      include: {
        uploads: {
          where: { status: 'PUBLISHED', platformVideoId: { not: null } },
          take: 30,
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    for (const account of accounts) {
      if (!account.accessToken) continue;

      try {
        const token = decrypt(account.accessToken);

        if (['YOUTUBE', 'YOUTUBE_SHORTS'].includes(account.platform)) {
          await syncYouTube(account, token, userId);
        }
        // TikTok, Instagram analytics would follow here

        await prisma.socialAccount.update({ where: { id: account.id }, data: { lastSyncAt: new Date() } });
      } catch (err: any) {
        logger.warn(`Analytics sync failed for account ${account.id}: ${err.message}`);
      }
    }

    return { userId, synced: accounts.length };
  },
  { connection, concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY ?? 10) }
);

async function syncYouTube(account: any, accessToken: string, userId: string) {
  const oauth2 = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  oauth2.setCredentials({ access_token: accessToken });
  const ytAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2 });

  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];

  for (const upload of account.uploads) {
    if (!upload.platformVideoId) continue;

    try {
      const resp = await ytAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: start,
        endDate: end,
        metrics: 'views,likes,comments,shares,averageViewDuration,estimatedMinutesWatched',
        filters: `video==${upload.platformVideoId}`,
      });

      const rows = resp.data.rows ?? [];
      const views = rows.reduce((s: number, r: any) => s + Number(r[1] ?? 0), 0);
      const likes = rows.reduce((s: number, r: any) => s + Number(r[2] ?? 0), 0);
      const comments = rows.reduce((s: number, r: any) => s + Number(r[3] ?? 0), 0);
      const shares = rows.reduce((s: number, r: any) => s + Number(r[4] ?? 0), 0);
      const watchSecs = rows.reduce((s: number, r: any) => s + Number(r[6] ?? 0), 0) * 60;

      const uid = `yt-${upload.id}`;
      await prisma.analytics.upsert({
        where: { id: uid },
        update: { views, likes, comments, shares, watchTimeSeconds: Math.round(watchSecs) },
        create: {
          id: uid,
          userId,
          videoId: upload.videoId,
          uploadId: upload.id,
          platform: account.platform,
          views,
          likes,
          comments,
          shares,
          watchTimeSeconds: Math.round(watchSecs),
        },
      });
    } catch {
      // Non-fatal per video
    }
  }
}

worker.on('failed', (job, err) => logger.error(`Analytics job ${job?.id} failed: ${err.message}`));

logger.info('Analytics worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
