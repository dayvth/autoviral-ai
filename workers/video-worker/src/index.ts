import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { worker: 'video-worker' },
  transports: [new winston.transports.Console()],
});

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const TMP_DIR = process.env.TMP_DIR ?? '/tmp/autoviral';

// ── Worker ────────────────────────────────────────────────────

const worker = new Worker(
  'video-rendering',
  async (job: Job) => {
    const { videoId, scriptId, audioUrl, orientation, style, duration } = job.data;

    logger.info(`Rendering video ${videoId}`);
    await job.updateProgress(5);

    const workDir = path.join(TMP_DIR, videoId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      // 1. Download narration audio
      const audioPath = path.join(workDir, 'narration.mp3');
      await downloadFile(audioUrl, audioPath);
      await job.updateProgress(15);

      // 2. Fetch background video clips from Pexels
      const script = await prisma.script.findUniqueOrThrow({ where: { id: scriptId } });
      const bgClips = await fetchBackgroundClips(script.keywords, orientation, duration);
      await job.updateProgress(25);

      // 3. Download background clips
      const clipPaths: string[] = [];
      for (let i = 0; i < bgClips.length; i++) {
        const clipPath = path.join(workDir, `clip_${i}.mp4`);
        await downloadFile(bgClips[i], clipPath);
        clipPaths.push(clipPath);
      }
      await job.updateProgress(45);

      // 4. Get audio duration
      const audioDuration = await getMediaDuration(audioPath);

      // 5. Assemble background (concatenate/trim clips to match audio)
      const bgPath = path.join(workDir, 'background.mp4');
      await assembleBackground(clipPaths, bgPath, audioDuration, orientation);
      await job.updateProgress(60);

      // 6. Generate subtitles (via Python worker)
      const subtitlePath = path.join(workDir, 'subtitles.ass');
      const fullText = `${script.hook} ${script.body} ${script.cta ?? ''}`;
      await generateSubtitles(audioUrl, fullText, subtitlePath, orientation);
      await job.updateProgress(70);

      // 7. Compose final video with FFmpeg
      const finalPath = path.join(workDir, 'final.mp4');
      await composeFinalVideo(bgPath, audioPath, subtitlePath, finalPath, orientation, style);
      await job.updateProgress(85);

      // 8. Generate thumbnail
      const thumbPath = path.join(workDir, 'thumbnail.jpg');
      await generateThumbnail(finalPath, thumbPath);
      await job.updateProgress(90);

      // 9. Upload to storage
      const { videoUrl, thumbnailUrl } = await uploadToStorage(videoId, finalPath, thumbPath);
      await job.updateProgress(97);

      // 10. Update database
      await prisma.video.update({
        where: { id: videoId },
        data: { videoUrl, thumbnailUrl, status: 'RENDERED', duration: Math.round(audioDuration) },
      });

      // Save thumbnail
      await prisma.thumbnail.create({
        data: { videoId, url: thumbnailUrl, isSelected: true, style: 'AUTO' },
      });

      await job.updateProgress(100);
      logger.info(`Video ${videoId} rendered successfully`);
      return { videoId, videoUrl, thumbnailUrl };
    } finally {
      // Cleanup temp files
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  },
  {
    connection,
    concurrency: Number(process.env.VIDEO_WORKER_CONCURRENCY ?? 2),
  }
);

// ── FFmpeg helpers ────────────────────────────────────────────

async function getMediaDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

async function assembleBackground(
  clips: string[], output: string, targetDuration: number, orientation: string
) {
  const size = orientation === 'VERTICAL' ? '1080:1920' : '1920:1080';
  const w = orientation === 'VERTICAL' ? 1080 : 1920;
  const h = orientation === 'VERTICAL' ? 1920 : 1080;

  // Create concat file
  const concatFile = output.replace('.mp4', '_concat.txt');
  const listContent = clips.map((c) => `file '${c}'`).join('\n');
  await fs.writeFile(concatFile, listContent);

  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" ` +
    `-vf "scale=${size}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1" ` +
    `-t ${targetDuration} -c:v libx264 -preset fast -crf 23 -an "${output}"`
  );
}

async function generateSubtitles(audioUrl: string, text: string, outputPath: string, orientation: string) {
  try {
    const resp = await axios.post(
      `${process.env.PYTHON_WORKER_URL}/subtitles`,
      { audio_url: audioUrl, text, orientation },
      {
        headers: { 'x-internal-secret': process.env.PYTHON_WORKER_SECRET },
        timeout: 120_000,
      }
    );

    await fs.writeFile(outputPath, resp.data.ass_content ?? '');
  } catch {
    // Write empty subtitle file as fallback
    await fs.writeFile(outputPath, '[Script Info]\nScriptType: v4.00+\n[V4+ Styles]\n[Events]\n');
  }
}

async function composeFinalVideo(
  bgPath: string, audioPath: string, subtitlePath: string,
  output: string, orientation: string, style: string
) {
  const filters: string[] = [];

  // Style-specific color grading
  if (style === 'CINEMATIC') {
    filters.push('curves=vintage');
  } else if (style === 'ENERGETIC') {
    filters.push('eq=contrast=1.1:saturation=1.2:brightness=0.02');
  } else if (style === 'LUXURY') {
    filters.push('curves=lighter,eq=saturation=0.9:contrast=1.05');
  }

  // Subtitles filter
  filters.push(`ass='${subtitlePath}'`);

  const vf = filters.join(',');

  await execAsync(
    `ffmpeg -y -i "${bgPath}" -i "${audioPath}" ` +
    `-vf "${vf}" -c:v libx264 -preset medium -crf 20 ` +
    `-c:a aac -b:a 192k -shortest "${output}"`
  );
}

async function generateThumbnail(videoPath: string, outputPath: string) {
  // Extract frame at 20% of video duration (usually a good hook frame)
  const duration = await getMediaDuration(videoPath);
  const timestamp = duration * 0.2;

  await execAsync(
    `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
  );
}

// ── External media ────────────────────────────────────────────

async function fetchBackgroundClips(
  keywords: string[], orientation: string, duration: number
): Promise<string[]> {
  const query = keywords.slice(0, 2).join(' ');
  const perPage = Math.ceil(duration / 10); // ~10s per clip

  try {
    const resp = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query,
        per_page: Math.min(perPage, 10),
        orientation: orientation === 'VERTICAL' ? 'portrait' : 'landscape',
        size: 'medium',
      },
      headers: { Authorization: process.env.PEXELS_API_KEY! },
      timeout: 15_000,
    });

    return (resp.data.videos ?? [])
      .map((v: any) => {
        const file = v.video_files.find((f: any) =>
          orientation === 'VERTICAL' ? f.height >= f.width : f.width >= f.height
        ) ?? v.video_files[0];
        return file?.link;
      })
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function uploadToStorage(videoId: string, videoPath: string, thumbPath: string) {
  const videoBuf = await fs.readFile(videoPath);
  const thumbBuf = await fs.readFile(thumbPath);

  const videoStoragePath = `videos/${videoId}/final.mp4`;
  const thumbStoragePath = `videos/${videoId}/thumbnail.jpg`;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

  await Promise.all([
    supabase.storage.from(bucket).upload(videoStoragePath, videoBuf, { contentType: 'video/mp4', upsert: true }),
    supabase.storage.from(bucket).upload(thumbStoragePath, thumbBuf, { contentType: 'image/jpeg', upsert: true }),
  ]);

  const videoUrl = supabase.storage.from(bucket).getPublicUrl(videoStoragePath).data.publicUrl;
  const thumbnailUrl = supabase.storage.from(bucket).getPublicUrl(thumbStoragePath).data.publicUrl;

  return { videoUrl, thumbnailUrl };
}

async function downloadFile(url: string, dest: string) {
  const resp = await axios.get(url, { responseType: 'stream', timeout: 60_000 });
  const writer = createWriteStream(dest);
  resp.data.pipe(writer);
  return new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

worker.on('failed', (job, err) => {
  logger.error(`Video job ${job?.id} failed: ${err.message}`);
  if (job?.data?.videoId) {
    prisma.video.update({
      where: { id: job.data.videoId },
      data: { status: 'FAILED', errorMessage: err.message },
    }).catch(() => {});
  }
});

logger.info('Video worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
