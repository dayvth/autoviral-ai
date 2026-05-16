import { Worker, Job } from 'bullmq';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { connection, enqueueVoice, ScriptJobPayload } from '../lib/queue';
import { getIo } from '../lib/socket';

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function emit(userId: string, videoId: string, stage: string, progress: number, message: string) {
  try {
    getIo().to(`user:${userId}`).emit('video:progress', { videoId, stage, progress, message });
  } catch {
    // io not ready yet — ignore
  }
}

export function startScriptWorker() {
  const worker = new Worker<ScriptJobPayload>(
    'script-generation',
    async (job: Job<ScriptJobPayload>) => {
      const { nicheId, trendId, userId, videoId, voiceId, language, platform, duration, style } = job.data;

      logger.info(`[ScriptWorker] Job ${job.id} — video ${videoId ?? 'new'}`);
      if (videoId) emit(userId, videoId, 'script', 5, 'Pesquisando tendências...');

      const niche = await prisma.niche.findUniqueOrThrow({ where: { id: nicheId } });
      const trend = trendId ? await prisma.trend.findUnique({ where: { id: trendId } }) : null;

      const context = trend
        ? `Topic: "${trend.title}"\n${trend.description ?? ''}\nKeywords: ${trend.keywords.join(', ')}`
        : `Niche: ${niche.name}\nKeywords: ${niche.keywords.join(', ')}`;

      if (videoId) emit(userId, videoId, 'script', 15, 'Gerando hook viral...');
      const hook = await generateHook(context, language, platform, style);

      if (videoId) emit(userId, videoId, 'script', 35, 'Escrevendo roteiro...');
      const body = await generateBody(hook, context, language, duration, style);

      if (videoId) emit(userId, videoId, 'script', 60, 'Criando chamada para ação...');
      const cta = await generateCta(body, platform, language);

      if (videoId) emit(userId, videoId, 'script', 70, 'Gerando metadados...');
      const meta = await generateMeta({ hook, body, niche: niche.name, platform, language });

      if (videoId) emit(userId, videoId, 'script', 82, 'Salvando roteiro...');
      const script = await prisma.script.create({
        data: {
          nicheId,
          trendId,
          title: meta.title,
          hook,
          body,
          cta,
          description: meta.description,
          hashtags: meta.hashtags,
          keywords: niche.keywords,
          language,
          platform: platform as any,
          duration,
          style: style as any,
          status: 'APPROVED',
          aiModel: 'gpt-4o-mini',
        },
      });

      // Update the pre-created video record (avoids duplicate)
      if (videoId) {
        await prisma.video.update({
          where: { id: videoId },
          data: {
            scriptId: script.id,
            title: meta.title,
            description: meta.description,
            hashtags: meta.hashtags,
            language,
            status: 'SCRIPT_READY',
          },
        });
      } else {
        // Fallback: create video if no pre-existing ID (shouldn't happen with new routes)
        await prisma.video.create({
          data: {
            userId,
            nicheId,
            scriptId: script.id,
            title: meta.title,
            description: meta.description,
            hashtags: meta.hashtags,
            language,
            platform: platform as any,
            status: 'SCRIPT_READY',
            duration,
            orientation: isVertical(platform) ? 'VERTICAL' : 'HORIZONTAL',
          },
        });
      }

      if (trendId) {
        await prisma.trend.update({ where: { id: trendId }, data: { isProcessed: true } });
      }

      const fullText = `${hook} ${body} ${cta}`;
      await enqueueVoice({
        scriptId: script.id,
        videoId: videoId ?? script.id,
        voiceId: voiceId ?? DEFAULT_VOICE_ID,
        text: fullText,
        language,
      });

      if (videoId) emit(userId, videoId, 'script', 100, 'Roteiro pronto! Iniciando narração...');
      logger.info(`[ScriptWorker] Job ${job.id} done`);
      return { scriptId: script.id, videoId };
    },
    {
      connection,
      concurrency: Number(process.env.SCRIPT_WORKER_CONCURRENCY ?? 3),
      limiter: { max: 10, duration: 60_000 },
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[ScriptWorker] Job ${job?.id} failed: ${err.message}`);
    const { videoId, userId } = job?.data ?? {};
    if (videoId) {
      prisma.video.update({ where: { id: videoId }, data: { status: 'FAILED', errorMessage: err.message } }).catch(() => {});
      try { getIo().to(`user:${userId}`).emit('video:error', { videoId, message: err.message }); } catch {}
    }
  });

  logger.info('[ScriptWorker] Started');
  return worker;
}

// ── OpenAI agents ──────────────────────────────────────────────

async function generateHook(context: string, language: string, platform: string, style: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: 'You are an elite viral video hook writer.' },
      {
        role: 'user',
        content: `Write a viral ${style} hook for ${platform} in ${language}.\n${context}\n\nRequirements:\n- 1-2 sentences that stop scrolling within 3 seconds\n- Use emotional triggers: curiosity, surprise, desire, or fear\n- Sound natural and conversational\n- Avoid "Did you know" and generic openers\n\nReturn ONLY the hook text.`,
      },
    ],
  });
  return res.choices[0].message.content!.trim();
}

async function generateBody(hook: string, context: string, language: string, duration: number, style: string): Promise<string> {
  const targetWords = Math.round((duration / 60) * 150);
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: `You are a viral video scriptwriter specializing in ${style} content.` },
      {
        role: 'user',
        content: `Continue this viral video script in ${language}.\n\nHook: "${hook}"\nStyle: ${style}\nTarget: ~${targetWords} words (${duration}s video)\nContext: ${context}\n\nWrite the script body:\n1. Setup / relatable opening (15%)\n2. Core content with 3-5 punchy points (70%)\n3. Reveal or satisfying conclusion (15%)\n\nFormat: Short sentences. High energy. Add [PAUSE] for dramatic breaks.\nReturn ONLY the script body, no hook, no CTA.`,
      },
    ],
  });
  return res.choices[0].message.content!.trim();
}

async function generateCta(body: string, platform: string, language: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Write a natural ${platform} CTA in ${language} (1-2 sentences).\nScript ends: "...${body.slice(-150)}"\nMake it feel organic, not pushy. Return ONLY the CTA.`,
    }],
  });
  return res.choices[0].message.content!.trim();
}

async function generateMeta(opts: { hook: string; body: string; niche: string; platform: string; language: string }) {
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Generate video metadata in ${opts.language} for ${opts.platform}.\nNiche: ${opts.niche}\nHook: "${opts.hook}"\n\nReturn JSON: { "title": "...", "description": "...", "hashtags": ["..."] }\nTitle: max 100 chars. Description: 200-400 chars. Hashtags: 15-20 items.`,
    }],
  });
  return JSON.parse(res.choices[0].message.content!);
}

function isVertical(platform: string) {
  return ['TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'FACEBOOK_REELS'].includes(platform);
}
