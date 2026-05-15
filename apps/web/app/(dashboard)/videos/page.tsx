'use client';

import { motion } from 'framer-motion';
import { Video, Plus, Search, Filter, Play, Clock, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-viral-green/20 text-viral-green border-viral-green/30',
  RENDERING: 'bg-viral-purple/20 text-viral-purple border-viral-purple/30',
  READY: 'bg-primary/20 text-primary border-primary/30',
  FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
  PENDING: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Publicado',
  RENDERING: 'Renderizando',
  READY: 'Pronto',
  FAILED: 'Falhou',
  PENDING: 'Pendente',
};

const MOCK_VIDEOS = [
  { id: '1', title: '5 Curiosidades que vão te surpreender', platform: 'TikTok', status: 'PUBLISHED', views: 12400, duration: 30, viralScore: 87, createdAt: '2025-05-10' },
  { id: '2', title: 'Como a IA está mudando o mundo em 2025', platform: 'YouTube Shorts', status: 'PUBLISHED', views: 8200, duration: 60, viralScore: 74, createdAt: '2025-05-09' },
  { id: '3', title: 'O segredo dos milionários que ninguém te conta', platform: 'Instagram Reels', status: 'READY', views: 0, duration: 30, viralScore: 91, createdAt: '2025-05-11' },
  { id: '4', title: 'Treino de 10 minutos que transforma o corpo', platform: 'TikTok', status: 'RENDERING', views: 0, duration: 60, viralScore: 0, createdAt: '2025-05-11' },
  { id: '5', title: 'Carros mais rápidos do mundo em 2025', platform: 'YouTube Shorts', status: 'PENDING', views: 0, duration: 90, viralScore: 0, createdAt: '2025-05-11' },
];

export default function VideosPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = MOCK_VIDEOS.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Vídeos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie e acompanhe todos os seus vídeos
          </p>
        </div>
        <Link
          href="/content"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Novo Vídeo
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar vídeos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PUBLISHED', 'READY', 'RENDERING', 'PENDING', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'border-border/50 text-muted-foreground hover:border-border'
              )}
            >
              {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Video list */}
      <motion.div variants={item} className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum vídeo encontrado</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              {search ? 'Tente outro termo de busca' : 'Gere seu primeiro vídeo para começar'}
            </p>
          </div>
        ) : (
          filtered.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl hover:border-border transition-all"
            >
              {/* Thumbnail placeholder */}
              <div className="w-24 h-14 bg-muted rounded-xl shrink-0 flex items-center justify-center">
                <Play className="w-5 h-5 text-muted-foreground/50" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{video.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{video.platform} · {video.createdAt}</p>
              </div>

              <div className="hidden sm:flex items-center gap-4 shrink-0">
                {video.views > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {video.views.toLocaleString('pt-BR')}
                  </div>
                )}
                {video.viralScore > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    {video.viralScore}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {video.duration}s
                </div>
              </div>

              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0', STATUS_COLORS[video.status])}>
                {STATUS_LABELS[video.status]}
              </span>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
