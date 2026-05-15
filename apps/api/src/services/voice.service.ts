import axios from 'axios';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// OpenAI voice map for multilingual TTS
const OPENAI_VOICE_BY_LANG: Record<string, 'alloy' | 'onyx' | 'nova' | 'shimmer' | 'fable' | 'echo'> = {
  'pt-BR': 'onyx',
  'pt': 'onyx',
  'en': 'alloy',
  'en-US': 'alloy',
  'es': 'nova',
  'fr': 'shimmer',
  'de': 'echo',
};

function cleanScript(text: string) {
  return text.replace(/\[PAUSE\]/g, '...').replace(/\[EMPHASIS\]/g, '').trim();
}

async function uploadAudio(videoId: string, buffer: Buffer): Promise<string> {
  const storagePath = `audio/${videoId}/narration.mp3`;
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .getPublicUrl(storagePath);

  await prisma.video.update({
    where: { id: videoId },
    data: { audioUrl: urlData.publicUrl, status: 'VOICE_READY' },
  });

  return urlData.publicUrl;
}

// ── ElevenLabs synthesis ──────────────────────────────────────

async function synthesizeElevenLabs(opts: {
  text: string; voiceId: string; videoId: string;
  speed?: number; stability?: number; similarityBoost?: number;
}): Promise<string> {
  const { text, voiceId, videoId, speed = 1.0, stability = 0.5, similarityBoost = 0.75 } = opts;

  const response = await axios.post(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost, speed },
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
      timeout: 120_000,
    }
  );

  return uploadAudio(videoId, Buffer.from(response.data));
}

// ── OpenAI TTS synthesis (fallback) ───────────────────────────

async function synthesizeOpenAI(opts: { text: string; videoId: string; language: string }): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const voice = OPENAI_VOICE_BY_LANG[opts.language] ?? 'onyx';

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: opts.text,
    response_format: 'mp3',
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return uploadAudio(opts.videoId, buffer);
}

// ── Public API ────────────────────────────────────────────────

export async function synthesizeVoice(opts: {
  text: string;
  voiceId: string;
  videoId: string;
  language: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}): Promise<string> {
  const cleanText = cleanScript(opts.text);
  logger.info(`[Voice] Synthesizing for video ${opts.videoId}`);

  // Try ElevenLabs first if key is available
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      return await synthesizeElevenLabs({ ...opts, text: cleanText });
    } catch (err: any) {
      logger.warn(`[Voice] ElevenLabs failed (${err.message}), falling back to OpenAI TTS`);
    }
  } else {
    logger.info('[Voice] ELEVENLABS_API_KEY not set, using OpenAI TTS');
  }

  // Fallback: OpenAI TTS
  return await synthesizeOpenAI({ text: cleanText, videoId: opts.videoId, language: opts.language });
}

// ── List available voices ──────────────────────────────────────

export async function listVoices(language?: string) {
  const cached = await prisma.voice.findMany({
    where: { isActive: true, ...(language ? { language } : {}) },
    orderBy: { name: 'asc' },
  });
  if (cached.length > 0) return cached;

  if (!process.env.ELEVENLABS_API_KEY) return [];

  try {
    const resp = await axios.get(`${ELEVENLABS_BASE}/voices`, {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      timeout: 15_000,
    });

    const voices = resp.data.voices ?? [];
    await Promise.all(
      voices.map((v: any) =>
        prisma.voice.upsert({
          where: { externalId: v.voice_id },
          update: { name: v.name },
          create: {
            externalId: v.voice_id,
            name: v.name,
            description: v.description,
            language: v.labels?.language ?? 'en',
            gender: v.labels?.gender,
            previewUrl: v.preview_url,
          },
        })
      )
    );
    return prisma.voice.findMany({ where: { isActive: true, ...(language ? { language } : {}) } });
  } catch {
    return [];
  }
}
