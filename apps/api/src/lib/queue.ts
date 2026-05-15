import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import { logger } from './logger';

function buildRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
  };
}

const connection: ConnectionOptions = buildRedisConnection();

// ── Queue definitions ─────────────────────────────────────────
export const QUEUES = {
  SCRIPT: 'script-generation',
  VOICE: 'voice-synthesis',
  VIDEO: 'video-rendering',
  UPLOAD: 'social-upload',
  ANALYTICS: 'analytics-sync',
  TRENDS: 'trend-research',
  IMPROVEMENT: 'ai-improvement',
} as const;

type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const queues = new Map<QueueName, Queue>();
const queueEvents = new Map<QueueName, QueueEvents>();

export function getQueue(name: QueueName): Queue {
  const queue = queues.get(name);
  if (!queue) throw new Error(`Queue "${name}" not initialized`);
  return queue;
}

export function getQueueEvents(name: QueueName): QueueEvents {
  const events = queueEvents.get(name);
  if (!events) throw new Error(`QueueEvents "${name}" not initialized`);
  return events;
}

export async function initQueues() {
  for (const name of Object.values(QUEUES)) {
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    const events = new QueueEvents(name, { connection });

    events.on('completed', ({ jobId }) => {
      logger.info(`[${name}] Job ${jobId} completed`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
      logger.error(`[${name}] Job ${jobId} failed: ${failedReason}`);
    });

    queues.set(name as QueueName, queue);
    queueEvents.set(name as QueueName, events);
    logger.info(`Queue ready: ${name}`);
  }
}

// ── Job payload types ─────────────────────────────────────────

export interface ScriptJobPayload {
  nicheId: string;
  trendId?: string;
  userId: string;
  language: string;
  platform: string;
  duration: number;
  style: string;
}

export interface VoiceJobPayload {
  scriptId: string;
  videoId: string;
  voiceId: string;
  text: string;
  language: string;
  speed?: number;
}

export interface VideoJobPayload {
  videoId: string;
  scriptId: string;
  audioUrl: string;
  orientation: 'VERTICAL' | 'HORIZONTAL' | 'SQUARE';
  style: string;
  duration: number;
}

export interface UploadJobPayload {
  uploadId: string;
  videoId: string;
  socialAccountId: string;
  platform: string;
  scheduledAt?: string;
}

export interface AnalyticsJobPayload {
  userId: string;
  uploadId?: string;
  platform?: string;
  since?: string;
}

// ── Helpers to enqueue jobs ───────────────────────────────────

export async function enqueueScript(payload: ScriptJobPayload, priority = 0) {
  return getQueue(QUEUES.SCRIPT).add('generate-script', payload, { priority });
}

export async function enqueueVoice(payload: VoiceJobPayload, priority = 0) {
  return getQueue(QUEUES.VOICE).add('synthesize-voice', payload, { priority });
}

export async function enqueueVideo(payload: VideoJobPayload, priority = 0) {
  return getQueue(QUEUES.VIDEO).add('render-video', payload, { priority });
}

export async function enqueueUpload(payload: UploadJobPayload, delay = 0) {
  return getQueue(QUEUES.UPLOAD).add('publish-video', payload, { delay });
}

export async function enqueueAnalytics(payload: AnalyticsJobPayload) {
  return getQueue(QUEUES.ANALYTICS).add('sync-analytics', payload);
}

export async function enqueueTrendResearch(nicheId: string, userId: string) {
  return getQueue(QUEUES.TRENDS).add('research-trends', { nicheId, userId });
}
