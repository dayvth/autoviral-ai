import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import winston from 'winston';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { worker: 'script-worker' },
  transports: [new winston.transports.Console()],
});

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

// ── Worker ────────────────────────────────────────────────────

const worker = new Worker(
  'script-generation',
  async (job: Job) => {
    const { nicheId, trendId, userId, language, platform, duration, style } = job.data;

    logger.info(`Processing script job ${job.id} for niche ${nicheId}`);
    await job.updateProgress(5);

    // Fetch context
    const niche = await prisma.niche.findUniqueOrThrow({ where: { id: nicheId } });
    const trend = trendId ? await prisma.trend.findUnique({ where: { id: trendId } }) : null;

    const context = trend
      ? `Topic: "${trend.title}"\n${trend.description ?? ''}\nKeywords: ${trend.keywords.join(', ')}`
      : `Niche: ${niche.name}\nKeywords: ${niche.keywords.join(', ')}`;

    await job.updateProgress(10);

    // Agent 1 — Hook
    const hook = await generateHook(context, language, platform, style);
    await job.updateProgress(30);

    // Agent 2 — Body
    const body = await generateBody(hook, context, language, duration, style);
    await job.updateProgress(55);

    // Agent 3 — CTA
    const cta = await generateCta(body, platform, language);
    await job.updateProgress(65);

    // Agent 4 — Meta
    const meta = await generateMeta({ hook, body, niche: niche.name, platform, language });
    await job.updateProgress(80);

    // Persist script
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

    await job.updateProgress(90);

    // Create video record
    const video = await prisma.video.create({
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

    // Mark trend used
    if (trendId) {
      await prisma.trend.update({ where: { id: trendId }, data: { isProcessed: true } });
    }

    await job.updateProgress(100);

    logger.info(`Script job ${job.id} done → video ${video.id}`);

    // Return data so the voice-worker can pick up
    return { scriptId: script.id, videoId: video.id, hook, body, cta };
  },
  {
    connection,
    concurrency: Number(process.env.SCRIPT_WORKER_CONCURRENCY ?? 5),
    limiter: { max: 10, duration: 60_000 }, // max 10 scripts/min (API limits)
  }
);

worker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, { videoId: result.videoId });
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

logger.info('Script worker started');

// ── Agents ────────────────────────────────────────────────────

async function generateHook(context: string, language: string, platform: string, style: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: 'You are an elite viral video hook writer.' },
      {
        role: 'user',
        content: `Write a viral ${style} hook for ${platform} in ${language}.
${context}

Requirements:
- 1-2 sentences that stop scrolling within 3 seconds
- Use emotional triggers: curiosity, surprise, desire, or fear
- Sound natural and conversational
- Avoid "Did you know" and generic openers

Return ONLY the hook text.`,
      },
    ],
  });
  return completion.choices[0].message.content!.trim();
}

async function generateBody(
  hook: string, context: string, language: string, duration: number, style: string
): Promise<string> {
  const targetWords = Math.round((duration / 60) * 150);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: `You are a viral video scriptwriter specializing in ${style} content.` },
      {
        role: 'user',
        content: `Continue this viral video script in ${language}.

Hook: "${hook}"
Style: ${style}
Target: ~${targetWords} words (${duration}s video)
Context: ${context}

Write the script body:
1. Setup / relatable opening (15%)
2. Core content with 3-5 punchy points (70%)
3. Reveal or satisfying conclusion (15%)

Format: Short sentences. High energy. Add [PAUSE] for dramatic breaks.
Return ONLY the script body, no hook, no CTA.`,
      },
    ],
  });
  return completion.choices[0].message.content!.trim();
}

async function generateCta(body: string, platform: string, language: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Write a natural ${platform} CTA in ${language} (1-2 sentences).
Script ends: "...${body.slice(-150)}"
Make it feel organic, not pushy. Return ONLY the CTA.`,
    }],
  });
  return completion.choices[0].message.content!.trim();
}

async function generateMeta(opts: { hook: string; body: string; niche: string; platform: string; language: string }) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Generate video metadata in ${opts.language} for ${opts.platform}.
Niche: ${opts.niche}
Hook: "${opts.hook}"

Return JSON: { "title": "...", "description": "...", "hashtags": ["..."] }
Title: max 100 chars. Description: 200-400 chars. Hashtags: 15-20 items.`,
    }],
  });
  return JSON.parse(completion.choices[0].message.content!);
}

function isVertical(platform: string) {
  return ['TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'FACEBOOK_REELS'].includes(platform);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
