import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { connection, VideoJobPayload } from '../lib/queue';
import { logger } from '../lib/logger';
import { getIo } from '../lib/socket';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const TMP_DIR = process.env.TMP_DIR ?? '/tmp/autoviral';

function emit(userId: string, videoId: string, progress: number, message: string) {
  try {
    getIo().to(`user:${userId}`).emit('video:progress', { videoId, stage: 'render', progress, message });
  } catch {}
}

export function startVideoWorker() {
  const worker = new Worker<VideoJobPayload>(
    'video-rendering',
    async (job: Job<VideoJobPayload>) => {
      const { videoId, scriptId, audioUrl, orientation, style, duration } = job.data;

      const video = await prisma.video.findUniqueOrThrow({
        where: { id: videoId },
        select: { userId: true },
      });
      const { userId } = video;

      logger.info(`[VideoWorker] Rendering ${videoId}`);
      emit(userId, videoId, 5, 'Preparando renderização...');

      const workDir = path.join(TMP_DIR, videoId);
      await fs.mkdir(workDir, { recursive: true });

      const supabase = getSupabase();

      try {
        // 1. Download narration audio
        const audioPath = path.join(workDir, 'narration.mp3');
        await downloadFile(audioUrl, audioPath);
        await job.updateProgress(15);
        emit(userId, videoId, 15, 'Áudio baixado. Buscando clips...');

        // 2. Fetch background video clips from Pexels (optional)
        const script = await prisma.script.findUniqueOrThrow({ where: { id: scriptId } });
        const bgClips = await fetchBackgroundClips(script.keywords, orientation, duration);
        await job.updateProgress(25);

        // 3. Build background (from clips or gradient fallback)
        const bgPath = path.join(workDir, 'background.mp4');

        if (bgClips.length > 0) {
          emit(userId, videoId, 25, `${bgClips.length} clips encontrados. Baixando...`);
          const clipPaths: string[] = [];
          for (let i = 0; i < bgClips.length; i++) {
            const clipPath = path.join(workDir, `clip_${i}.mp4`);
            await downloadFile(bgClips[i], clipPath);
            clipPaths.push(clipPath);
            emit(userId, videoId, 25 + Math.round((i / bgClips.length) * 15), `Clip ${i + 1}/${bgClips.length} baixado`);
          }
          await job.updateProgress(45);
          emit(userId, videoId, 50, 'Montando fundo...');
          const audioDurationForBg = await getMediaDuration(audioPath);
          await assembleBackground(clipPaths, bgPath, audioDurationForBg, orientation);
        } else {
          emit(userId, videoId, 35, 'Gerando fundo visual...');
          const audioDurationForBg = await getMediaDuration(audioPath);
          await generateGradientBackground(workDir, bgPath, audioDurationForBg, orientation);
          await job.updateProgress(45);
        }

        await job.updateProgress(60);

        // 4. Get audio duration
        const audioDuration = await getMediaDuration(audioPath);

        // 6. Generate subtitles
        emit(userId, videoId, 62, 'Gerando legendas...');
        const subtitlePath = path.join(workDir, 'subtitles.ass');
        const fullText = `${script.hook} ${script.body} ${script.cta ?? ''}`;
        await generateSubtitles(audioUrl, fullText, subtitlePath, orientation);
        await job.updateProgress(70);

        // 7. Compose final video
        emit(userId, videoId, 72, 'Compondo vídeo final...');
        const finalPath = path.join(workDir, 'final.mp4');
        await composeFinalVideo(bgPath, audioPath, subtitlePath, finalPath, orientation, style);
        await job.updateProgress(85);

        // 8. Generate thumbnail
        emit(userId, videoId, 87, 'Gerando thumbnail...');
        const thumbPath = path.join(workDir, 'thumbnail.jpg');
        await generateThumbnail(finalPath, thumbPath);
        await job.updateProgress(90);

        // 9. Upload to storage
        emit(userId, videoId, 92, 'Enviando para armazenamento...');
        const { videoUrl, thumbnailUrl } = await uploadToStorage(videoId, finalPath, thumbPath, supabase);
        await job.updateProgress(97);

        // 10. Update database
        await prisma.video.update({
          where: { id: videoId },
          data: { videoUrl, thumbnailUrl, status: 'RENDERED', duration: Math.round(audioDuration) },
        });

        await prisma.thumbnail.create({
          data: { videoId, url: thumbnailUrl, isSelected: true, style: 'AUTO' },
        });

        await job.updateProgress(100);
        emit(userId, videoId, 100, 'Vídeo pronto!');
        getIo().to(`user:${userId}`).emit('video:done', { videoId, videoUrl, thumbnailUrl });

        logger.info(`[VideoWorker] ${videoId} rendered successfully`);
        return { videoId, videoUrl, thumbnailUrl };
      } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    },
    {
      connection,
      concurrency: Number(process.env.VIDEO_WORKER_CONCURRENCY ?? 2),
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[VideoWorker] Job ${job?.id} failed: ${err.message}`);
    if (job?.data?.videoId) {
      const { videoId } = job.data;
      prisma.video
        .findUnique({ where: { id: videoId }, select: { userId: true } })
        .then((v) => {
          if (v) {
            emit(v.userId, videoId, 0, `Erro na renderização: ${err.message}`);
            try { getIo().to(`user:${v.userId}`).emit('video:error', { videoId, message: err.message }); } catch {}
          }
          return prisma.video.update({ where: { id: videoId }, data: { status: 'FAILED', errorMessage: err.message } });
        })
        .catch(() => {});
    }
  });

  logger.info('[VideoWorker] Started');
  return worker;
}

// ── FFmpeg helpers ────────────────────────────────────────────

async function getMediaDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

async function assembleBackground(clips: string[], output: string, targetDuration: number, orientation: string) {
  const size = orientation === 'VERTICAL' ? '1080:1920' : '1920:1080';
  const w = orientation === 'VERTICAL' ? 1080 : 1920;
  const h = orientation === 'VERTICAL' ? 1920 : 1080;

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
      { headers: { 'x-internal-secret': process.env.PYTHON_WORKER_SECRET }, timeout: 120_000 }
    );
    await fs.writeFile(outputPath, resp.data.ass_content ?? '');
  } catch {
    await fs.writeFile(outputPath, '[Script Info]\nScriptType: v4.00+\n[V4+ Styles]\n[Events]\n');
  }
}

async function composeFinalVideo(
  bgPath: string, audioPath: string, subtitlePath: string,
  output: string, orientation: string, style: string
) {
  const filters: string[] = [];

  if (style === 'CINEMATIC') filters.push('curves=vintage');
  else if (style === 'ENERGETIC') filters.push('eq=contrast=1.1:saturation=1.2:brightness=0.02');
  else if (style === 'LUXURY') filters.push('curves=lighter,eq=saturation=0.9:contrast=1.05');

  filters.push(`ass='${subtitlePath}'`);

  await execAsync(
    `ffmpeg -y -i "${bgPath}" -i "${audioPath}" ` +
    `-vf "${filters.join(',')}" -c:v libx264 -preset medium -crf 20 ` +
    `-c:a aac -b:a 192k -shortest "${output}"`
  );
}

async function generateThumbnail(videoPath: string, outputPath: string) {
  const duration = await getMediaDuration(videoPath);
  const timestamp = duration * 0.2;
  await execAsync(
    `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
  );
}

async function fetchBackgroundClips(keywords: string[], orientation: string, duration: number): Promise<string[]> {
  if (!process.env.PEXELS_API_KEY) return [];

  const query = keywords.slice(0, 2).join(' ');
  const perPage = Math.min(Math.ceil(duration / 10), 10);

  try {
    const resp = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query,
        per_page: perPage,
        orientation: orientation === 'VERTICAL' ? 'portrait' : 'landscape',
        size: 'medium',
      },
      headers: { Authorization: process.env.PEXELS_API_KEY },
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

async function generateGradientBackground(workDir: string, output: string, duration: number, orientation: string) {
  const w = orientation === 'VERTICAL' ? 1080 : 1920;
  const h = orientation === 'VERTICAL' ? 1920 : 1080;
  // Dark gradient background — looks clean for any niche
  await execAsync(
    `ffmpeg -y -f lavfi -i "gradients=s=${w}x${h}:c0=0x0a0a0f:c1=0x1a0a2e:c2=0x16213e:nb_colors=3:speed=0.3,format=yuv420p" ` +
    `-t ${duration} -c:v libx264 -preset fast -crf 23 "${output}"`
  );
}

async function uploadToStorage(videoId: string, videoPath: string, thumbPath: string, supabase: ReturnType<typeof createClient>) {
  const [videoBuf, thumbBuf] = await Promise.all([fs.readFile(videoPath), fs.readFile(thumbPath)]);
  const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

  await Promise.all([
    supabase.storage.from(bucket).upload(`videos/${videoId}/final.mp4`, videoBuf, { contentType: 'video/mp4', upsert: true }),
    supabase.storage.from(bucket).upload(`videos/${videoId}/thumbnail.jpg`, thumbBuf, { contentType: 'image/jpeg', upsert: true }),
  ]);

  return {
    videoUrl: supabase.storage.from(bucket).getPublicUrl(`videos/${videoId}/final.mp4`).data.publicUrl,
    thumbnailUrl: supabase.storage.from(bucket).getPublicUrl(`videos/${videoId}/thumbnail.jpg`).data.publicUrl,
  };
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
