'use client';

import { motion } from 'framer-motion';
import { Flame, TrendingUp, Zap, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const MOCK_TRENDS = [
  { id: '1', title: 'IA substitui empregos criativos', source: 'YouTube', viralScore: 95, region: 'BR', keywords: ['IA', 'trabalho', 'futuro'], peakAt: 'Agora' },
  { id: '2', title: 'Novo modelo GPT supera humanos em testes', source: 'Google', viralScore: 91, region: 'BR', keywords: ['GPT', 'IA', 'tecnologia'], peakAt: '2h atrás' },
  { id: '3', title: 'Criptomoedas sobem 30% em 24h', source: 'Twitter', viralScore: 88, region: 'BR', keywords: ['cripto', 'bitcoin', 'investimento'], peakAt: '3h atrás' },
  { id: '4', title: 'Receita viral de bolo de pote faz sucesso', source: 'TikTok', viralScore: 84, region: 'BR', keywords: ['receita', 'viral', 'comida'], peakAt: '5h atrás' },
  { id: '5', title: 'Elon Musk anuncia novo projeto secreto', source: 'Twitter', viralScore: 82, region: 'Global', keywords: ['Elon', 'Tesla', 'SpaceX'], peakAt: '6h atrás' },
  { id: '6', title: 'Dicas para economizar no supermercado', source: 'YouTube', viralScore: 79, region: 'BR', keywords: ['economia', 'finanças', 'dicas'], peakAt: '8h atrás' },
  { id: '7', title: 'Novo treino de 7 minutos queima gordura', source: 'Instagram', viralScore: 76, region: 'BR', keywords: ['fitness', 'treino', 'saúde'], peakAt: '10h atrás' },
  { id: '8', title: 'Carro elétrico popular chega ao Brasil', source: 'Google', viralScore: 73, region: 'BR', keywords: ['carro', 'elétrico', 'brasil'], peakAt: '12h atrás' },
];

const SOURCE_COLORS: Record<string, string> = {
  YouTube: 'text-red-400',
  TikTok: 'text-pink-400',
  Google: 'text-blue-400',
  Twitter: 'text-sky-400',
  Instagram: 'text-purple-400',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-viral-red' : score >= 80 ? 'text-viral-purple' : 'text-viral-green';
  return (
    <div className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', color)}>
      <TrendingUp className="w-3.5 h-3.5" />
      {score}
    </div>
  );
}

export default function TrendsPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Tendências</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tópicos virais em tempo real para inspirar seu conteúdo
          </p>
        </div>
        <button className="flex items-center gap-2 bg-card hover:bg-card/80 border border-border/50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </motion.div>

      {/* Trend cards */}
      <motion.div variants={item} className="space-y-3">
        {MOCK_TRENDS.map((trend, index) => (
          <div
            key={trend.id}
            className="flex items-start gap-4 p-4 bg-card border border-border/50 rounded-2xl hover:border-border transition-all group"
          >
            {/* Rank */}
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{trend.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn('text-xs font-medium', SOURCE_COLORS[trend.source] ?? 'text-muted-foreground')}>
                  {trend.source}
                </span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">{trend.region}</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">{trend.peakAt}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {trend.keywords.map((kw) => (
                  <span key={kw} className="text-xs px-2 py-0.5 bg-muted rounded-lg text-muted-foreground">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <ScoreBadge score={trend.viralScore} />
              <button className="flex items-center gap-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">
                <Zap className="w-3 h-3" />
                Gerar
              </button>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
