'use client';

import { Eye, ThumbsUp, Clock, ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_VIDEOS = [
  {
    id: '1',
    title: 'A IA que vai mudar tudo em 2025 — você precisa saber disso',
    platform: 'TikTok',
    status: 'PUBLISHED',
    views: 142_300,
    likes: 8_200,
    viralScore: 92,
    thumbnail: null,
    publishedAt: '2h atrás',
  },
  {
    id: '2',
    title: '5 hábitos dos milionários que ninguém te conta',
    platform: 'YouTube Shorts',
    status: 'PUBLISHED',
    views: 87_400,
    likes: 5_100,
    viralScore: 85,
    thumbnail: null,
    publishedAt: '5h atrás',
  },
  {
    id: '3',
    title: 'Técnica japonesa de foco em 5 minutos',
    platform: 'Instagram Reels',
    status: 'RENDERING',
    views: 0,
    likes: 0,
    viralScore: 78,
    thumbnail: null,
    publishedAt: 'Em processo...',
  },
  {
    id: '4',
    title: 'Por que 95% das pessoas nunca ficam ricas',
    platform: 'TikTok',
    status: 'PENDING',
    views: 0,
    likes: 0,
    viralScore: 81,
    thumbnail: null,
    publishedAt: 'Agendado para 18h',
  },
];

const statusConfig = {
  PUBLISHED: { label: 'Publicado', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  RENDERING: { label: 'Renderizando', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  PENDING: { label: 'Agendado', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  FAILED: { label: 'Falhou', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
} as const;

const platformColors = {
  TikTok: 'text-pink-400',
  'YouTube Shorts': 'text-red-400',
  'Instagram Reels': 'text-purple-400',
};

export function RecentVideos() {
  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-sm">Vídeos Recentes</h3>
        <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Ver todos
        </button>
      </div>

      <div className="space-y-3">
        {MOCK_VIDEOS.map((video) => {
          const status = statusConfig[video.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
          const platColor = platformColors[video.platform as keyof typeof platformColors] ?? 'text-muted-foreground';

          return (
            <div
              key={video.id}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="w-16 h-10 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 border border-border/50 overflow-hidden">
                <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-1 group-hover:text-foreground transition-colors">
                  {video.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn('text-[10px] font-medium', platColor)}>{video.platform}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', status.color)}>
                    {status.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{video.publishedAt}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="shrink-0 text-right space-y-1">
                {video.views > 0 ? (
                  <>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <Eye className="w-3 h-3" />
                      {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(video.views)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <ThumbsUp className="w-3 h-3" />
                      {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(video.likes)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">—</div>
                )}
                <div className={cn(
                  'text-[10px] font-bold',
                  video.viralScore >= 90 ? 'text-viral-purple' : video.viralScore >= 75 ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {video.viralScore}/100
                </div>
              </div>

              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
