'use client';

import { Flame, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

async function fetchTrends() {
  const res = await api.get('/trends?limit=6');
  return res.data.data as any[];
}

function ViralBadge({ score }: { score: number }) {
  const cls =
    score >= 90 ? 'viral-ultra' :
    score >= 80 ? 'viral-high' :
    score >= 60 ? 'viral-mid' : 'viral-low';
  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cls)}>
      {Math.round(score)}
    </span>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  YOUTUBE: 'text-red-400',
  TIKTOK: 'text-pink-400',
  GOOGLE: 'text-blue-400',
  TWITTER: 'text-sky-400',
  INSTAGRAM: 'text-purple-400',
  REDDIT: 'text-orange-400',
};

export function TrendsFeed() {
  const router = useRouter();
  const { data: trends, isLoading, mutate } = useSWR('/trends-feed', fetchTrends, {
    revalidateOnFocus: false,
  });

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-viral-red" />
          <h3 className="font-semibold text-sm">Tendências Agora</h3>
        </div>
        <button
          onClick={() => mutate()}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-5 h-3 shimmer rounded" />
              <div className="flex-1 h-3 shimmer rounded" />
              <div className="w-8 h-5 shimmer rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!trends || trends.length === 0) && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Flame className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma tendência ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tendências são coletadas automaticamente</p>
        </div>
      )}

      {!isLoading && trends && trends.length > 0 && (
        <div className="space-y-2">
          {trends.map((trend: any, i: number) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/40 cursor-pointer transition-all"
            >
              <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 pt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
                  {trend.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-[10px] font-medium', SOURCE_COLORS[trend.source] ?? 'text-muted-foreground')}>
                    {trend.source}
                  </span>
                  {trend.viralScore >= 90 && (
                    <span className="text-[10px] text-viral-red font-medium flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> Hot
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ViralBadge score={trend.viralScore} />
                <button
                  onClick={(e) => { e.stopPropagation(); router.push('/content'); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-primary/20 text-primary"
                  title="Gerar vídeo com esta tendência"
                >
                  <Zap className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push('/trends')}
        className="mt-4 w-full text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-primary/5 border border-border/50 hover:border-primary/20"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        Ver todas as tendências
      </button>
    </div>
  );
}
