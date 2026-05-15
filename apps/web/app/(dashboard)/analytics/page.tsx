'use client';

import { motion } from 'framer-motion';
import { BarChart2, Eye, TrendingUp, Clock, Users, Heart, MessageCircle, Share2 } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const PERIODS = ['7 dias', '30 dias', '90 dias', 'Todo período'];

const SUMMARY_STATS = [
  { label: 'Total de Visualizações', value: '48.2K', change: +23, icon: Eye, color: 'text-viral-red' },
  { label: 'Seguidores Ganhos', value: '1.340', change: +18, icon: Users, color: 'text-viral-purple' },
  { label: 'Curtidas', value: '9.8K', change: +31, icon: Heart, color: 'text-pink-400' },
  { label: 'Tempo Assistido', value: '214h', change: +12, icon: Clock, color: 'text-viral-green' },
];

const TOP_VIDEOS = [
  { title: '5 Curiosidades que vão te surpreender', platform: 'TikTok', views: 12400, ctr: 8.2, retention: 72 },
  { title: 'Como a IA está mudando o mundo', platform: 'YouTube Shorts', views: 8200, ctr: 6.5, retention: 68 },
  { title: 'O segredo dos milionários', platform: 'Instagram Reels', views: 6100, ctr: 7.1, retention: 75 },
  { title: 'Treino de 10 minutos', platform: 'TikTok', views: 4800, ctr: 5.9, retention: 64 },
];

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div
        className="bg-primary h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const activePeriod = '30 dias';

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Desempenho dos seus vídeos em todas as plataformas
          </p>
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                p === activePeriod
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_STATS.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-card border border-border/50 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-viral-green mt-1">+{change}% vs período anterior</p>
          </div>
        ))}
      </motion.div>

      {/* Top performing videos */}
      <motion.div variants={item} className="bg-card border border-border/50 rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Vídeos com Melhor Desempenho
        </h2>
        <div className="space-y-4">
          {TOP_VIDEOS.map((video, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">{video.platform} · {video.views.toLocaleString('pt-BR')} views</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-medium text-primary">CTR {video.ctr}%</p>
                  <p className="text-xs text-muted-foreground">Ret. {video.retention}%</p>
                </div>
              </div>
              <Bar value={video.views} max={12400} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Engagement breakdown */}
      <motion.div variants={item} className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Comentários', value: '1.240', icon: MessageCircle, color: 'text-blue-400' },
          { label: 'Compartilhamentos', value: '3.180', icon: Share2, color: 'text-viral-green' },
          { label: 'Taxa de Retenção Média', value: '69.8%', icon: BarChart2, color: 'text-viral-purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-card border border-border/50 rounded-2xl flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-muted ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
