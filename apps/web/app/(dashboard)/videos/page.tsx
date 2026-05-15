'use client';

import { motion } from 'framer-motion';
import { Video, Plus, Search, Play, Clock, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-viral-green/20 text-viral-green border-viral-green/30',
  RENDERING: 'bg-viral-purple/20 text-viral-purple border-viral-purple/30',
  READY: 'bg-primary/20 text-primary border-primary/30',
  SCRIPT_READY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VOICE_READY: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
  PENDING: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Publicado', RENDERING: 'Renderizando', READY: 'Pronto',
  SCRIPT_READY: 'Script pronto', VOICE_READY: 'Voz pronta',
  FAILED: 'Falhou', PENDING: 'Pendente',
};

const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: 'TikTok', YOUTUBE_SHORTS: 'YouTube Shorts',
  INSTAGRAM_REELS: 'Instagram Reels', YOUTUBE: 'YouTube', FACEBOOK: 'Facebook',
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

async function fetchVideos(url: string) {
  const res = await api.get(url);
  return res.data.data as { videos: any[]; total: number; page: number };
}

export default function VideosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const params = new URLSearchParams({ limit: '20' });
  if (statusFilter !== 'ALL') params.set('status', statusFilter);

  const { data, isLoading, mutate } = useSWR(`/videos?${params}`, fetchVideos, {
    revalidateOnFocus: false,
    refreshInterval: 15_000,
  });

  const videos = (data?.videos ?? []).filter((v: any) =>
    !search || v.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Vídeos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `${data.total} vídeo${data.total !== 1 ? 's' : ''} no total` : 'Carregando...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2.5 bg-card border border-border/50 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/content"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Novo Vídeo
          </Link>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar vídeos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PUBLISHED', 'READY', 'RENDERING', 'PENDING', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                statusFilter === s ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl">
                <div className="w-24 h-14 shimmer rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 shimmer rounded w-2/3" />
                  <div className="h-3 shimmer rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {search ? 'Nenhum vídeo encontrado' : 'Você ainda não tem vídeos'}
            </p>
            {!search && (
              <Link href="/content" className="mt-3 text-sm text-primary hover:underline">
                Gerar seu primeiro vídeo
              </Link>
            )}
          </div>
        )}

        {!isLoading && videos.map((video: any) => (
          <div
            key={video.id}
            className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl hover:border-border transition-all"
          >
            <div className="w-24 h-14 bg-muted rounded-xl shrink-0 flex items-center justify-center">
              {video.thumbnailUrl
                ? <img src={video.thumbnailUrl} className="w-full h-full object-cover rounded-xl" alt="" />
                : <Play className="w-5 h-5 text-muted-foreground/50" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{video.title || 'Gerando...'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {PLATFORM_LABELS[video.platform] ?? video.platform} · {timeAgo(video.createdAt)} atrás
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              {(video.analytics?.[0]?.views ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(video.analytics[0].views)}
                </div>
              )}
              {video.viralScore && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  {Math.round(video.viralScore)}
                </div>
              )}
              {video.duration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {video.duration}s
                </div>
              )}
            </div>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0', STATUS_COLORS[video.status] ?? STATUS_COLORS.PENDING)}>
              {STATUS_LABELS[video.status] ?? video.status}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
