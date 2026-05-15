'use client';

import { Eye, ThumbsUp, Play } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';

async function fetchVideos() {
  const res = await api.get('/videos?limit=4');
  return res.data.data.videos as any[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: 'Publicado', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  RENDERING: { label: 'Renderizando', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  PENDING: { label: 'Pendente', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  READY: { label: 'Pronto', color: 'text-primary bg-primary/10 border-primary/20' },
  FAILED: { label: 'Falhou', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

const platformColors: Record<string, string> = {
  TIKTOK: 'text-pink-400',
  YOUTUBE_SHORTS: 'text-red-400',
  INSTAGRAM_REELS: 'text-purple-400',
  YOUTUBE: 'text-red-500',
};

const platformLabels: Record<string, string> = {
  TIKTOK: 'TikTok',
  YOUTUBE_SHORTS: 'YouTube Shorts',
  INSTAGRAM_REELS: 'Instagram Reels',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export function RecentVideos() {
  const { data: videos, isLoading } = useSWR('/videos-recent', fetchVideos, {
    revalidateOnFocus: false,
  });

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Vídeos Recentes</h3>
        <Link href="/videos" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Ver todos
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <div className="w-16 h-10 rounded-lg shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 shimmer rounded w-3/4" />
                <div className="h-2 shimmer rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!videos || videos.length === 0) && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Play className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum vídeo ainda</p>
          <Link href="/content" className="text-xs text-primary mt-1 hover:underline">
            Gerar primeiro vídeo
          </Link>
        </div>
      )}

      {!isLoading && videos && videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video: any) => {
            const status = statusConfig[video.status] ?? statusConfig.PENDING;
            const platColor = platformColors[video.platform] ?? 'text-muted-foreground';
            const platLabel = platformLabels[video.platform] ?? video.platform;
            const views = video.analytics?.[0]?.views ?? 0;
            const likes = video.analytics?.[0]?.likes ?? 0;

            return (
              <div
                key={video.id}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer"
              >
                <div className="w-16 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 border border-border/50">
                  <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{video.title || 'Gerando...'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[10px] font-medium', platColor)}>{platLabel}</span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', status.color)}>
                      {status.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(video.createdAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  {views > 0 ? (
                    <>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <Eye className="w-3 h-3" />
                        {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(views)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <ThumbsUp className="w-3 h-3" />
                        {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(likes)}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
