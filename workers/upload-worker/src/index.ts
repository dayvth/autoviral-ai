import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { google } from 'googleapis';
import winston from 'winston';
import { decrypt } from './crypto';

const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { worker: 'upload-worker' },
  transports: [new winston.transports.Console()],
});

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const worker = new Worker(
  'social-upload',
  async (job: Job) => {
    const { uploadId, videoId, socialAccountId, platform } = job.data;

    logger.info(`Uploading video ${videoId} to ${platform}`);

    const [upload, video, account] = await Promise.all([
      prisma.upload.findUniqueOrThrow({ where: { id: uploadId } }),
      prisma.video.findUniqueOrThrow({ where: { id: videoId }, include: { script: true } }),
      prisma.socialAccount.findUniqueOrThrow({ where: { id: socialAccountId } }),
    ]);

    await prisma.upload.update({ where: { id: uploadId }, data: { status: 'UPLOADING' } });
    await job.updateProgress(10);

    if (!video.videoUrl) throw new Error('Video URL missing');
    if (!account.accessToken) throw new Error('Access token missing');

    const accessToken = await decrypt(account.accessToken);

    let platformVideoId: string | undefined;
    let platformUrl: string | undefined;

    switch (platform) {
      case 'YOUTUBE':
      case 'YOUTUBE_SHORTS':
        ({ platformVideoId, platformUrl } = await uploadToYoutube({
          accessToken,
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl ?? undefined,
          title: video.title,
          description: video.description ?? '',
          hashtags: video.hashtags,
          isShorts: platform === 'YOUTUBE_SHORTS',
        }));
        break;

      case 'TIKTOK':
        ({ platformVideoId, platformUrl } = await uploadToTiktok({
          accessToken,
          videoUrl: video.videoUrl,
          title: video.title,
          hashtags: video.hashtags,
        }));
        break;

      default:
        throw new Error(`Platform ${platform} not yet supported for upload`);
    }

    await job.updateProgress(95);

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'PUBLISHED',
        platformVideoId,
        platformUrl,
        publishedAt: new Date(),
      },
    });

    await prisma.video.update({ where: { id: videoId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });

    await job.updateProgress(100);
    logger.info(`Upload ${uploadId} published: ${platformUrl}`);
    return { uploadId, platformVideoId, platformUrl };
  },
  { connection, concurrency: Number(process.env.UPLOAD_WORKER_CONCURRENCY ?? 5) }
);

// ── Platform handlers ────────────────────────────────────────

async function uploadToYoutube(opts: {
  accessToken: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description: string;
  hashtags: string[];
  isShorts: boolean;
}) {
  const oauth2 = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  oauth2.setCredentials({ access_token: opts.accessToken });
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });

  const description = `${opts.description}\n\n${opts.hashtags.map((h) => `#${h}`).join(' ')}`;
  const title = opts.isShorts ? `${opts.title} #Shorts` : opts.title;

  // YouTube requires the video to be uploaded via multipart or resumable upload
  // For simplicity, download to buffer first
  const videoResp = await axios.get(opts.videoUrl, { responseType: 'stream', timeout: 120_000 });

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: opts.hashtags.slice(0, 30),
        categoryId: '22', // People & Blogs
      },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
    },
    media: { mimeType: 'video/mp4', body: videoResp.data },
  } as any);

  const videoId = response.data.id!;

  // Upload thumbnail if available
  if (opts.thumbnailUrl) {
    const thumbResp = await axios.get(opts.thumbnailUrl, { responseType: 'stream', timeout: 30_000 });
    await youtube.thumbnails.set({
      videoId,
      media: { mimeType: 'image/jpeg', body: thumbResp.data },
    } as any).catch(() => {}); // non-fatal
  }

  return {
    platformVideoId: videoId,
    platformUrl: `https://youtu.be/${videoId}`,
  };
}

async function uploadToTiktok(opts: {
  accessToken: string;
  videoUrl: string;
  title: string;
  hashtags: string[];
}) {
  // TikTok Content Posting API
  const initResp = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: {
        title: `${opts.title} ${opts.hashtags.slice(0, 5).map((h) => `#${h}`).join(' ')}`.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: opts.videoUrl,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      timeout: 30_000,
    }
  );

  const publishId = initResp.data?.data?.publish_id;

  return {
    platformVideoId: publishId,
    platformUrl: `https://www.tiktok.com/`,
  };
}

// Inline crypto (mirrors the API's crypto module)
async function loadCrypto() {
  const crypto = await import('crypto');
  return crypto;
}

worker.on('failed', (job, err) => {
  logger.error(`Upload job ${job?.id} failed: ${err.message}`);
  if (job?.data?.uploadId) {
    prisma.upload.update({
      where: { id: job.data.uploadId },
      data: { status: 'FAILED', errorMessage: err.message, retryCount: { increment: 1 } },
    }).catch(() => {});
  }
});

logger.info('Upload worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
