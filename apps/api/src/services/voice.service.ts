import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// ── Voice synthesis via ElevenLabs ────────────────────────────

export async function synthesizeVoice(opts: {
  text: string;
  voiceId: string;
  videoId: string;
  language: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}): Promise<string> {
  const { text, voiceId, videoId, speed = 1.0, stability = 0.5, similarityBoost = 0.75 } = opts;

  logger.info(`[Voice] Synthesizing for video ${videoId}, voice ${voiceId}`);

  // Clean script markers for TTS
  const cleanText = text
    .replace(/\[PAUSE\]/g, '...')
    .replace(/\[EMPHASIS\]/g, '')
    .trim();

  const response = await axios.post(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      text: cleanText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        speed,
      },
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

  const audioBuffer = Buffer.from(response.data);
  const storagePath = `audio/${videoId}/narration.mp3`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .upload(storagePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET!)
    .getPublicUrl(storagePath);

  await prisma.video.update({
    where: { id: videoId },
    data: { audioUrl: urlData.publicUrl, status: 'VOICE_READY' },
  });

  logger.info(`[Voice] Audio uploaded: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

// ── List available voices ──────────────────────────────────────

export async function listVoices(language?: string) {
  const cached = await prisma.voice.findMany({
    where: { isActive: true, ...(language ? { language } : {}) },
    orderBy: { name: 'asc' },
  });

  if (cached.length > 0) return cached;

  // Fetch from ElevenLabs API and cache
  const resp = await axios.get(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
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

  return prisma.voice.findMany({
    where: { isActive: true, ...(language ? { language } : {}) },
  });
}

// ── Generate subtitle timestamps via ElevenLabs alignment ─────

export async function getAlignmentTimestamps(audioUrl: string, text: string) {
  // Use ElevenLabs dubbing/alignment API (or fall back to Whisper via Python worker)
  try {
    const resp = await axios.post(
      `${process.env.PYTHON_WORKER_URL}/transcribe`,
      { audio_url: audioUrl, text },
      {
        headers: { 'x-internal-secret': process.env.PYTHON_WORKER_SECRET },
        timeout: 120_000,
      }
    );
    return resp.data.words as Array<{ word: string; start: number; end: number }>;
  } catch (err) {
    logger.error('[Voice] Alignment failed', err);
    return [];
  }
}
