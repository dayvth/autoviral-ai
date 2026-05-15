import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { connection, enqueueVideo, VoiceJobPayload } from '../lib/queue';
import { synthesizeVoice } from '../services/voice.service';
import { getIo } from '../lib/socket';

function emit(userId: string, videoId: string, stage: string, progress: number, message: string) {
  try {
    getIo().to(`user:${userId}`).emit('video:progress', { videoId, stage, progress, message });
  } catch {}
}

export function startVoiceWorker() {
  const worker = new Worker<VoiceJobPayload>(
    'voice-synthesis',
    async (job: Job<VoiceJobPayload>) => {
      const { scriptId, videoId, voiceId, text, language, speed } = job.data;

      const video = await prisma.video.findUniqueOrThrow({
        where: { id: videoId },
        select: { userId: true, orientation: true, duration: true },
      });
      const { userId, orientation, duration } = video;

      logger.info(`[VoiceWorker] Job ${job.id} — video ${videoId}`);
      emit(userId, videoId, 'voice', 5, 'Conectando ao ElevenLabs...');

      await job.updateProgress(10);
      emit(userId, videoId, 'voice', 20, 'Sintetizando narração...');

      const audioUrl = await synthesizeVoice({ text, voiceId, videoId, language, speed });

      await job.updateProgress(85);
      emit(userId, videoId, 'voice', 85, 'Áudio gerado! Preparando renderização...');

      await enqueueVideo({
        videoId,
        scriptId,
        audioUrl,
        orientation: (orientation ?? 'VERTICAL') as 'VERTICAL' | 'HORIZONTAL' | 'SQUARE',
        style: 'CINEMATIC',
        duration: duration ?? 60,
      });

      await job.updateProgress(100);
      emit(userId, videoId, 'voice', 100, 'Voz pronta! Renderizando vídeo...');

      logger.info(`[VoiceWorker] Job ${job.id} done`);
      return { videoId, audioUrl };
    },
    {
      connection,
      concurrency: Number(process.env.VOICE_WORKER_CONCURRENCY ?? 3),
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[VoiceWorker] Job ${job?.id} failed: ${err.message}`);
    if (job?.data?.videoId) {
      const { videoId } = job.data;
      prisma.video
        .findUnique({ where: { id: videoId }, select: { userId: true } })
        .then((v) => {
          if (v) {
            emit(v.userId, videoId, 'voice', 0, `Erro: ${err.message}`);
            try { getIo().to(`user:${v.userId}`).emit('video:error', { videoId, message: err.message }); } catch {}
          }
          return prisma.video.update({ where: { id: videoId }, data: { status: 'FAILED', errorMessage: err.message } });
        })
        .catch(() => {});
    }
  });

  logger.info('[VoiceWorker] Started');
  return worker;
}
