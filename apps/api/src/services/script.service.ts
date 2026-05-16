import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { enqueueVoice } from '../lib/queue';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface GenerateScriptOptions {
  nicheId: string;
  trendId?: string;
  userId: string;
  language: string;
  platform: string;
  duration: number;
  style: string;
}

// ── Multi-agent pipeline ──────────────────────────────────────

export async function generateScript(opts: GenerateScriptOptions) {
  const { nicheId, trendId, userId, language, platform, duration, style } = opts;

  const niche = await prisma.niche.findUniqueOrThrow({ where: { id: nicheId } });
  const trend = trendId ? await prisma.trend.findUnique({ where: { id: trendId } }) : null;

  const context = trend
    ? `Trend topic: "${trend.title}"\nDescription: ${trend.description ?? ''}\nKeywords: ${trend.keywords.join(', ')}`
    : `Niche: ${niche.name}\nKeywords: ${niche.keywords.join(', ')}`;

  // Agent 1 — Hook
  const hook = await runHookAgent(context, language, platform);

  // Agent 2 — Story / body
  const body = await runStoryAgent(hook, context, language, duration, style);

  // Agent 3 — CTA
  const cta = await runCtaAgent(body, platform, language);

  // Agent 4 — Meta (title, description, hashtags)
  const meta = await runMetaAgent({ hook, body, niche: niche.name, trend: trend?.title, platform, language });

  // Compute viral score estimate
  const viralScore = await estimateViralScore({ hook, body, hashtags: meta.hashtags, platform });

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
      viralScore,
      status: 'APPROVED',
      aiModel: 'gpt-4o-mini',
    },
  });

  await prisma.aiGeneration.create({
    data: {
      userId,
      scriptId: script.id,
      type: 'SCRIPT_GENERATION',
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: context,
      response: JSON.stringify({ hook, body, cta, meta }),
      status: 'success',
    },
  });

  if (trendId) {
    await prisma.trend.update({ where: { id: trendId }, data: { isProcessed: true } });
  }

  logger.info(`Script generated: ${script.id} (viral score: ${viralScore})`);
  return script;
}

async function runHookAgent(context: string, language: string, platform: string): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: 'You are an elite viral video hook writer. Your hooks stop people from scrolling within the first 3 seconds.',
      },
      {
        role: 'user',
        content: `Platform: ${platform}
Language: ${language}
${context}

Write ONE powerful hook (1-2 sentences max). It must:
- Create immediate curiosity or shock
- Use a psychological trigger (fear, desire, curiosity, surprise)
- Feel conversational and human
- NOT start with "Did you know" or clichés
- Be in ${language}

Return ONLY the hook text, nothing else.`,
      },
    ],
  });

  return completion.choices[0].message.content!.trim();
}

async function runStoryAgent(
  hook: string,
  context: string,
  language: string,
  duration: number,
  style: string
): Promise<string> {
  const wordsPerMinute = 150;
  const targetWords = Math.round((duration / 60) * wordsPerMinute);

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: `You are a viral video scriptwriter specializing in ${style} content.`,
      },
      {
        role: 'user',
        content: `Hook (already written): "${hook}"
Context: ${context}
Target duration: ${duration} seconds (~${targetWords} words)
Language: ${language}
Style: ${style}

Continue the script after the hook. Structure:
1. Expand the hook with a relatable setup (10% of content)
2. Main value/story with 3-5 key points (70% of content)
3. Build toward a satisfying conclusion (20% of content)

Rules:
- Short sentences. High energy. Easy to understand.
- Use pattern interrupts every 15-20 seconds
- Add [PAUSE] where the narrator should pause
- Add [EMPHASIS] before key words
- Sound natural, like a real person talking
- Write in ${language}

Return ONLY the script body (no hook, no CTA), formatted for narration.`,
      },
    ],
  });

  return completion.choices[0].message.content!.trim();
}

async function runCtaAgent(body: string, platform: string, language: string): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Write a natural, non-pushy CTA for ${platform} in ${language}.
Script end: "...${body.slice(-200)}"

The CTA should:
- Feel organic, not salesy
- Encourage engagement (follow, like, comment) naturally
- Be 1-2 sentences max
- Match the energy of the script

Return ONLY the CTA text.`,
      },
    ],
  });

  return completion.choices[0].message.content!.trim();
}

async function runMetaAgent(opts: {
  hook: string;
  body: string;
  niche: string;
  trend?: string;
  platform: string;
  language: string;
}) {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an SEO and viral content expert. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: `Generate metadata for this video.
Niche: ${opts.niche}
Trend: ${opts.trend ?? 'N/A'}
Platform: ${opts.platform}
Language: ${opts.language}
Hook: "${opts.hook}"
Script excerpt: "${opts.body.slice(0, 300)}..."

Return JSON with:
{
  "title": "compelling video title (max 100 chars)",
  "description": "SEO-optimized description (200-400 chars) in ${opts.language}",
  "hashtags": ["array", "of", "15-20", "relevant", "hashtags"]
}`,
      },
    ],
  });

  return JSON.parse(completion.choices[0].message.content!) as {
    title: string;
    description: string;
    hashtags: string[];
  };
}

async function estimateViralScore(opts: {
  hook: string;
  body: string;
  hashtags: string[];
  platform: string;
}): Promise<number> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Rate this content's viral potential (0-100) for ${opts.platform}.

Hook: "${opts.hook}"
Body excerpt: "${opts.body.slice(0, 400)}"
Hashtag count: ${opts.hashtags.length}

Consider: hook strength, curiosity gap, emotional triggers, platform fit, shareability.

Return JSON: { "score": <number 0-100>, "reasoning": "<brief>" }`,
      },
    ],
  });

  const result = JSON.parse(completion.choices[0].message.content!) as { score: number };
  return Math.min(100, Math.max(0, result.score));
}
