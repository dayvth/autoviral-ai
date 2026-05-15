'use client';

import { motion } from 'framer-motion';
import { BarChart2, Eye, TrendingUp, Clock, Users, Heart, MessageCircle, Share2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const PERIODS = ['7 dias', '30 dias', '90 dias'] as const;
type Period = typeof PERIODS[number];

const PERIOD_DAYS: Record<Period, number> = { '7 dias': 7, '30 dias': 30, '90 dias': 90 };

function fmt(n: number) {
  return Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(n);
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

async function fetchAnalytics(days: number) {
  const res = await api.get(`/analytics/dashboard?days=${days}`);
  return res.data.data;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30 dias');

  const { data, isLoading, mutate } = useSWR(
    `/analytics/dashboard?days=${PERIOD_DAYS[period]}`,
    () => fetchAnalytics(PERIOD_DAYS[period]),
    { revalidateOnFocus: false }
  );

  const stats = data?.summary ?? {};
  const topVideos: any[] = data?.topVideos ?? [];
  const engagement = data?.engagement ?? {};

  const summaryCards = [
    { label: 'Total de Visualizações', value: stats.totalViews != null ? fmt(stats.totalViews) : '—', change: stats.viewsChange, icon: Eye, color: 'text-viral-red' },
    { label: 'Seguidores Ganhos', value: stats.followersGained != null ? fmt(stats.followersGained) : '—', change: stats.followersChange, icon: Users, color: 'text-viral-purple' },
    { label: 'Curtidas', value: stats.totalLikes != null ? fmt(stats.totalLikes) : '—', change: stats.likesChange, icon: Heart, color: 'text-pink-400' },
    { label: 'Tempo Assistido', value: stats.watchTime != null ? `${fmt(stats.watchTime)}h` : '—', change: stats.watchTimeChange, icon: Clock, color: 'text-viral-green' },
  ];

  const maxViews = topVideos.length > 0 ? Math.max(...topVideos.map((v: any) => v.views ?? 0)) : 1;

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Desempenho dos seus vídeos em todas as plataformas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2.5 bg-card border border-border/50 rounded-xl text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  p === period ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-card border border-border/50 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            {isLoading ? (
              <>
                <div className="h-7 shimmer rounded w-2/3 mb-2" />
                <div className="h-3 shimmer rounded w-1/2" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {change != null && (
                  <p className={cn('text-xs mt-1', change >= 0 ? 'text-viral-green' : 'text-red-400')}>
                    {change >= 0 ? '+' : ''}{change}% vs período anterior
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </motion.div>

      <motion.div variants={item} className="bg-card border border-border/50 rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Vídeos com Melhor Desempenho
        </h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 shimmer rounded w-3/4" />
                <div className="h-3 shimmer rounded w-1/2" />
                <div className="h-1.5 shimmer rounded" />
              </div>
            ))}
          </div>
        ) : topVideos.length === 0 ? (
          <div className="text-center py-6">
            <BarChart2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum dado de analytics disponível ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Publique vídeos para ver o desempenho aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topVideos.slice(0, 5).map((video: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{video.title ?? 'Sem título'}</p>
                    <p className="text-xs text-muted-foreground">
                      {video.platform} · {video.views != null ? fmt(video.views) : '—'} views
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {video.ctr != null && <p className="text-xs font-medium text-primary">CTR {video.ctr.toFixed(1)}%</p>}
                    {video.retention != null && <p className="text-xs text-muted-foreground">Ret. {video.retention.toFixed(0)}%</p>}
                  </div>
                </div>
                <Bar value={video.views ?? 0} max={maxViews} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Comentários', value: engagement.comments != null ? fmt(engagement.comments) : '—', icon: MessageCircle, color: 'text-blue-400' },
          { label: 'Compartilhamentos', value: engagement.shares != null ? fmt(engagement.shares) : '—', icon: Share2, color: 'text-viral-green' },
          { label: 'Taxa de Retenção Média', value: engagement.avgRetention != null ? `${engagement.avgRetention.toFixed(1)}%` : '—', icon: BarChart2, color: 'text-viral-purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-card border border-border/50 rounded-2xl flex items-center gap-4">
            <div className={cn('p-2.5 rounded-xl bg-muted', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              {isLoading ? <div className="h-6 shimmer rounded w-16 mt-1" /> : <p className="text-lg font-bold">{value}</p>}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
