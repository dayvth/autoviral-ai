'use client';

import { motion } from 'framer-motion';
import { Flame, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const SOURCE_COLORS: Record<string, string> = {
  YOUTUBE: 'text-red-400', TIKTOK: 'text-pink-400', GOOGLE: 'text-blue-400',
  TWITTER: 'text-sky-400', INSTAGRAM: 'text-purple-400', REDDIT: 'text-orange-400',
  NEWS: 'text-amber-400', MANUAL: 'text-muted-foreground',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-viral-red' : score >= 80 ? 'text-viral-purple' : 'text-viral-green';
  return (
    <div className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', color)}>
      <TrendingUp className="w-3.5 h-3.5" />
      {Math.round(score)}
    </div>
  );
}

async function fetchTrends() {
  const res = await api.get('/trends?limit=20');
  return res.data.data as any[];
}

const MOCK_TRENDS = [
  { id: 'm1', title: 'IA substitui empregos criativos', source: 'YOUTUBE', viralScore: 95, region: 'BR', keywords: ['ia', 'trabalho', 'futuro'], createdAt: new Date().toISOString() },
  { id: 'm2', title: 'Novo modelo GPT supera humanos em testes', source: 'GOOGLE', viralScore: 91, region: 'BR', keywords: ['gpt', 'ia'], createdAt: new Date().toISOString() },
  { id: 'm3', title: 'Criptomoedas sobem 30% em 24h', source: 'TWITTER', viralScore: 88, region: 'BR', keywords: ['cripto', 'bitcoin'], createdAt: new Date().toISOString() },
  { id: 'm4', title: 'Dicas para economizar no supermercado', source: 'YOUTUBE', viralScore: 79, region: 'BR', keywords: ['economia', 'finanças'], createdAt: new Date().toISOString() },
  { id: 'm5', title: 'Novo treino de 7 minutos queima gordura', source: 'INSTAGRAM', viralScore: 76, region: 'BR', keywords: ['fitness', 'treino'], createdAt: new Date().toISOString() },
];

export default function TrendsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR('/trends-page', fetchTrends, { revalidateOnFocus: false });

  const trends = (data && data.length > 0) ? data : MOCK_TRENDS;

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tendências</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tópicos virais em tempo real para inspirar seu conteúdo
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 bg-card hover:bg-card/80 border border-border/50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Atualizar
        </button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {trends.map((trend: any, index: number) => (
          <div
            key={trend.id}
            className="flex items-start gap-4 p-4 bg-card border border-border/50 rounded-2xl hover:border-border transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{trend.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn('text-xs font-medium', SOURCE_COLORS[trend.source] ?? 'text-muted-foreground')}>
                  {trend.source}
                </span>
                {trend.region && <><span className="text-muted-foreground/40 text-xs">·</span><span className="text-xs text-muted-foreground">{trend.region}</span></>}
              </div>
              {trend.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(trend.keywords as string[]).slice(0, 3).map((kw) => (
                    <span key={kw} className="text-xs px-2 py-0.5 bg-muted rounded-lg text-muted-foreground">#{kw}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <ScoreBadge score={trend.viralScore} />
              <button
                onClick={() => router.push('/content')}
                className="flex items-center gap-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20"
              >
                <Zap className="w-3 h-3" />
                Gerar
              </button>
            </div>
          </div>
        ))}
      </motion.div>

      {!isLoading && data && data.length === 0 && (
        <motion.div variants={item} className="text-center py-8">
          <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma tendência coletada ainda.</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Tendências são coletadas automaticamente a cada 6h.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
