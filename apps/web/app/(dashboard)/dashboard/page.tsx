'use client';

import { motion } from 'framer-motion';
import { Video, Eye, TrendingUp, Zap, Clock, BarChart2, Wifi, Plus } from 'lucide-react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentVideos } from '@/components/dashboard/RecentVideos';
import { ViralChart } from '@/components/charts/ViralChart';
import { TrendsFeed } from '@/components/dashboard/TrendsFeed';
import { QuickGenerate } from '@/components/dashboard/QuickGenerate';
import { PlatformBreakdown } from '@/components/dashboard/PlatformBreakdown';
import { useDashboard } from '@/lib/hooks/useDashboard';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function DashboardPage() {
  const { stats, isLoading } = useDashboard();

  return (
    <motion.div
      className="space-y-8 p-6 lg:p-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sua central de criação de conteúdo viral
          </p>
        </div>
        <Link
          href="/content"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Gerar Vídeo
        </Link>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Vídeos Gerados"
          value={stats?.totalVideos ?? 0}
          icon={Video}
          change={+12}
          loading={isLoading}
          color="brand"
        />
        <StatsCard
          title="Visualizações"
          value={stats?.totalViews ?? 0}
          icon={Eye}
          format="compact"
          change={+28}
          loading={isLoading}
          color="viral-red"
        />
        <StatsCard
          title="Score Viral Médio"
          value={stats?.avgViralScore ?? 0}
          icon={TrendingUp}
          format="score"
          change={+5}
          loading={isLoading}
          color="viral-purple"
        />
        <StatsCard
          title="Tempo de Assistido"
          value={stats?.totalWatchTime ?? 0}
          icon={Clock}
          format="duration"
          change={+19}
          loading={isLoading}
          color="viral-green"
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Views chart — 2/3 width */}
        <motion.div variants={item} className="lg:col-span-2">
          <ViralChart />
        </motion.div>

        {/* Platform breakdown — 1/3 width */}
        <motion.div variants={item}>
          <PlatformBreakdown data={stats?.platformStats ?? []} loading={isLoading} />
        </motion.div>
      </div>

      {/* Lower grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent videos */}
        <motion.div variants={item} className="lg:col-span-2">
          <RecentVideos />
        </motion.div>

        {/* Trending topics */}
        <motion.div variants={item}>
          <TrendsFeed />
        </motion.div>
      </div>

      {/* Quick generate */}
      <motion.div variants={item}>
        <QuickGenerate />
      </motion.div>
    </motion.div>
  );
}
