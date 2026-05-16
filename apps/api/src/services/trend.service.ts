import axios from 'axios';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── Main trend research orchestrator ──────────────────────────

export async function researchTrends(nicheId: string, userId: string) {
  const niche = await prisma.niche.findUniqueOrThrow({ where: { id: nicheId } });
  const keywords = niche.keywords;
  const language = niche.languages[0] ?? 'pt-BR';

  logger.info(`[Trends] Researching for niche: ${niche.name}`);

  const results = await Promise.allSettled([
    fetchYoutubeTrends(keywords, language),
    fetchRedditTrends(keywords),
    fetchGoogleTrends(keywords, language),
    generateAiTrends(niche.name, keywords, language),
  ]);

  const allTrends: RawTrend[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTrends.push(...result.value);
    } else {
      logger.warn('[Trends] One source failed:', result.reason?.message);
    }
  }

  // Deduplicate and score
  const scored = await scoreTrends(allTrends, niche.name);

  // Persist
  const created = await Promise.all(
    scored.map((trend) =>
      prisma.trend.upsert({
        where: { id: `${trend.source}-${trend.title.slice(0, 50)}`.replace(/\s/g, '-') },
        update: { viralScore: trend.viralScore },
        create: {
          id: `${trend.source}-${trend.title.slice(0, 50)}`.replace(/\s/g, '-'),
          nicheId,
          title: trend.title,
          description: trend.description,
          source: trend.source as any,
          sourceUrl: trend.url,
          keywords: trend.keywords,
          hashtags: trend.hashtags,
          viralScore: trend.viralScore,
          language,
          isProcessed: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      })
    )
  );

  logger.info(`[Trends] Saved ${created.length} trends for niche ${niche.name}`);
  return created;
}

// ── Data sources ──────────────────────────────────────────────

interface RawTrend {
  title: string;
  description?: string;
  url?: string;
  source: string;
  keywords: string[];
  hashtags: string[];
  viralScore: number;
}

async function fetchYoutubeTrends(keywords: string[], language: string): Promise<RawTrend[]> {
  if (!process.env.YOUTUBE_DATA_API_KEY) return [];

  const lang = language.split('-')[0]; // pt-BR → pt
  const regionCode = language.split('-')[1] ?? 'BR';

  const resp = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode,
      hl: lang,
      maxResults: 20,
      key: process.env.YOUTUBE_DATA_API_KEY,
    },
    timeout: 10_000,
  });

  return (resp.data.items ?? [])
    .filter((item: any) => {
      const text = `${item.snippet.title} ${item.snippet.description}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw.toLowerCase()));
    })
    .map((item: any) => ({
      title: item.snippet.title,
      description: item.snippet.description?.slice(0, 300),
      url: `https://youtu.be/${item.id}`,
      source: 'YOUTUBE',
      keywords,
      hashtags: (item.snippet.tags ?? []).slice(0, 10),
      viralScore: Math.min(100, Math.log10((Number(item.statistics?.viewCount) || 1) / 1000) * 20),
    }));
}

async function fetchRedditTrends(keywords: string[]): Promise<RawTrend[]> {
  const query = keywords.slice(0, 3).join('+');
  const resp = await axios.get(`https://www.reddit.com/search.json`, {
    params: { q: query, sort: 'hot', limit: 15, t: 'day' },
    headers: { 'User-Agent': 'AutoViralAI/1.0' },
    timeout: 10_000,
  });

  return (resp.data?.data?.children ?? []).map((post: any) => ({
    title: post.data.title,
    description: post.data.selftext?.slice(0, 300),
    url: `https://reddit.com${post.data.permalink}`,
    source: 'REDDIT',
    keywords,
    hashtags: [],
    viralScore: Math.min(100, (post.data.score / 1000) * 10),
  }));
}

async function fetchGoogleTrends(keywords: string[], language: string): Promise<RawTrend[]> {
  // Google Trends doesn't have a free API; use the Python worker via internal HTTP
  try {
    const geo = language.split('-')[1] ?? 'BR';
    const resp = await axios.post(
      `${process.env.PYTHON_WORKER_URL}/trends/google`,
      { keywords, geo },
      {
        headers: { 'x-internal-secret': process.env.PYTHON_WORKER_SECRET },
        timeout: 30_000,
      }
    );

    return (resp.data?.trends ?? []).map((t: any) => ({
      title: t.title,
      description: t.description,
      source: 'GOOGLE',
      keywords,
      hashtags: [],
      viralScore: t.score ?? 50,
    }));
  } catch {
    return [];
  }
}

async function generateAiTrends(niche: string, keywords: string[], language: string): Promise<RawTrend[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Generate 5 trending content ideas for the "${niche}" niche targeting ${language} audience.
Keywords: ${keywords.join(', ')}

For each idea return:
- A viral, curiosity-inducing title
- Brief description (2-3 sentences)
- Estimated viral score (0-100)
- Relevant hashtags (5-8)

Return JSON: { "trends": [{ "title", "description", "viralScore", "hashtags" }] }`,
      },
    ],
  });

  const data = JSON.parse(completion.choices[0].message.content!) as {
    trends: Array<{ title: string; description: string; viralScore: number; hashtags: string[] }>;
  };

  return data.trends.map((t) => ({
    ...t,
    source: 'MANUAL',
    keywords,
    url: undefined,
  }));
}

async function scoreTrends(trends: RawTrend[], niche: string): Promise<RawTrend[]> {
  if (trends.length === 0) return [];

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Re-score these trends for the "${niche}" niche on viral potential (0-100).
Consider: relevance, timeliness, emotional appeal, shareability.

Trends: ${JSON.stringify(trends.map((t, i) => ({ i, title: t.title })))}

Return JSON: { "scores": { "0": <score>, "1": <score>, ... } }`,
      },
    ],
  });

  const { scores } = JSON.parse(completion.choices[0].message.content!) as { scores: Record<string, number> };

  return trends.map((t, i) => ({
    ...t,
    viralScore: scores[String(i)] ?? t.viralScore,
  })).sort((a, b) => b.viralScore - a.viralScore);
}
