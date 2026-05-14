'use client';

import { Flame, TrendingUp, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MOCK_TRENDS = [
  { title: 'IA vai substituir 50% dos empregos?', score: 94, source: 'Google', hot: true },
  { title: '10 hábitos dos milionários antes das 7h', score: 87, source: 'YouTube' },
  { title: 'Novo app chinês supera ChatGPT', score: 82, source: 'Twitter' },
  { title: 'Técnica japonesa de produtividade', score: 78, source: 'Reddit' },
  { title: 'Criptomoeda sobe 300% em 1 dia', score: 75, source: 'YouTube' },
  { title: 'Segredo por trás dos bilionários', score: 71, source: 'TikTok' },
];

function ViralBadge({ score }: { score: number }) {
  const cls =
    score >= 90
      ? 'viral-ultra'
      : score >= 80
      ? 'viral-high'
      : score >= 60
      ? 'viral-mid'
      : 'viral-low';

  return (
    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', cls)}>
      {score}
    </span>
  );
}

export function TrendsFeed() {
  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-viral-red" />
          <h3 className="font-semibold text-sm">Tendências Agora</h3>
        </div>
        <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {MOCK_TRENDS.map((trend, i) => (
          <motion.div
            key={trend.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/40 cursor-pointer transition-all"
          >
            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 pt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
                {trend.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{trend.source}</span>
                {trend.hot && (
                  <span className="text-[10px] text-viral-red font-medium flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" /> Hot
                  </span>
                )}
              </div>
            </div>
            <ViralBadge score={trend.score} />
          </motion.div>
        ))}
      </div>

      <button className="mt-4 w-full text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-primary/5 border border-border/50 hover:border-primary/20">
        <TrendingUp className="w-3.5 h-3.5" />
        Ver todas as tendências
      </button>
    </div>
  );
}
