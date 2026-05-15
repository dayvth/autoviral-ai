'use client';

import { useEffect, useRef, useState } from 'react';
import { io as socketIo, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressEvent {
  videoId: string;
  stage: 'script' | 'voice' | 'render';
  progress: number;
  message: string;
}

interface DoneEvent {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
}

interface ErrorEvent {
  videoId: string;
  message: string;
}

interface TrackedVideo {
  videoId: string;
  stage: 'script' | 'voice' | 'render' | 'done' | 'error';
  scriptProgress: number;
  voiceProgress: number;
  renderProgress: number;
  message: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

const STAGES = [
  { key: 'script', label: 'Roteiro', description: 'Gerando com IA' },
  { key: 'voice', label: 'Narração', description: 'Síntese de voz' },
  { key: 'render', label: 'Vídeo', description: 'Renderizando' },
] as const;

function stageIndex(stage: TrackedVideo['stage']) {
  if (stage === 'script') return 0;
  if (stage === 'voice') return 1;
  if (stage === 'render') return 2;
  if (stage === 'done') return 3;
  return -1;
}

function stageProgress(video: TrackedVideo, stageKey: string) {
  if (stageKey === 'script') return video.scriptProgress;
  if (stageKey === 'voice') return video.voiceProgress;
  return video.renderProgress;
}

interface Props {
  userId: string;
  videoIds: string[];
}

export function VideoProgressTracker({ userId, videoIds }: Props) {
  const [videos, setVideos] = useState<Record<string, TrackedVideo>>(() =>
    Object.fromEntries(
      videoIds.map((id) => [
        id,
        { videoId: id, stage: 'script', scriptProgress: 0, voiceProgress: 0, renderProgress: 0, message: 'Aguardando...' },
      ])
    )
  );

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const socket = socketIo(apiUrl, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:user', userId);
    });

    socket.on('video:progress', (ev: ProgressEvent) => {
      if (!videoIds.includes(ev.videoId)) return;
      setVideos((prev) => {
        const cur = prev[ev.videoId] ?? { videoId: ev.videoId, stage: ev.stage, scriptProgress: 0, voiceProgress: 0, renderProgress: 0, message: '' };
        return {
          ...prev,
          [ev.videoId]: {
            ...cur,
            stage: ev.stage,
            message: ev.message,
            scriptProgress: ev.stage === 'script' ? ev.progress : cur.scriptProgress,
            voiceProgress: ev.stage === 'voice' ? ev.progress : cur.voiceProgress,
            renderProgress: ev.stage === 'render' ? ev.progress : cur.renderProgress,
          },
        };
      });
    });

    socket.on('video:done', (ev: DoneEvent) => {
      if (!videoIds.includes(ev.videoId)) return;
      setVideos((prev) => ({
        ...prev,
        [ev.videoId]: {
          ...prev[ev.videoId],
          stage: 'done',
          scriptProgress: 100,
          voiceProgress: 100,
          renderProgress: 100,
          message: 'Vídeo pronto!',
          videoUrl: ev.videoUrl,
          thumbnailUrl: ev.thumbnailUrl,
        },
      }));
    });

    socket.on('video:error', (ev: ErrorEvent) => {
      if (!videoIds.includes(ev.videoId)) return;
      setVideos((prev) => ({
        ...prev,
        [ev.videoId]: { ...prev[ev.videoId], stage: 'error', message: ev.message, errorMessage: ev.message },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, videoIds.join(',')]);

  const videoList = Object.values(videos);
  if (videoList.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-4"
    >
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Progresso da Geração
      </h3>

      {videoList.map((video) => (
        <VideoCard key={video.videoId} video={video} />
      ))}
    </motion.div>
  );
}

function VideoCard({ video }: { video: TrackedVideo }) {
  const isDone = video.stage === 'done';
  const isError = video.stage === 'error';
  const activeIdx = stageIndex(video.stage);

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl border p-5 space-y-4 transition-colors',
        isDone ? 'border-green-500/30 bg-green-500/5' : isError ? 'border-red-500/30 bg-red-500/5' : 'border-border/60 bg-card'
      )}
    >
      {/* Stage pipeline */}
      <div className="flex items-start gap-3">
        {STAGES.map((stage, i) => {
          const isDoneStage = activeIdx > i || isDone;
          const isActive = activeIdx === i && !isDone && !isError;
          const progress = stageProgress(video, stage.key);

          return (
            <div key={stage.key} className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isDoneStage ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={cn('text-xs font-medium truncate', isActive ? 'text-primary' : isDoneStage ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {stage.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', isDoneStage || isDone ? 'bg-green-500' : 'bg-primary')}
                  initial={{ width: 0 }}
                  animate={{ width: `${isDoneStage ? 100 : isActive ? progress : 0}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              <p className={cn('text-[10px] mt-1 truncate', isActive ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
                {stage.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={video.message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'text-xs',
              isDone ? 'text-green-500 font-medium' : isError ? 'text-red-400' : 'text-muted-foreground'
            )}
          >
            {isError ? (
              <span className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> {video.errorMessage ?? 'Erro desconhecido'}
              </span>
            ) : (
              video.message
            )}
          </motion.p>
        </AnimatePresence>

        {isDone && video.videoUrl && (
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-green-500 hover:text-green-400 transition-colors whitespace-nowrap"
          >
            Ver vídeo <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
