'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  change?: number;
  format?: 'number' | 'compact' | 'score' | 'duration';
  loading?: boolean;
  color?: 'brand' | 'viral-red' | 'viral-purple' | 'viral-green' | 'viral-orange';
}

const colorMap = {
  brand: {
    bg: 'bg-brand-500/10',
    icon: 'text-brand-400',
    border: 'border-brand-500/20',
    glow: 'shadow-brand-500/10',
  },
  'viral-red': {
    bg: 'bg-viral-red/10',
    icon: 'text-viral-red',
    border: 'border-viral-red/20',
    glow: 'shadow-viral-red/10',
  },
  'viral-purple': {
    bg: 'bg-viral-purple/10',
    icon: 'text-viral-purple',
    border: 'border-viral-purple/20',
    glow: 'shadow-viral-purple/10',
  },
  'viral-green': {
    bg: 'bg-viral-green/10',
    icon: 'text-viral-green',
    border: 'border-viral-green/20',
    glow: 'shadow-viral-green/10',
  },
  'viral-orange': {
    bg: 'bg-viral-orange/10',
    icon: 'text-viral-orange',
    border: 'border-viral-orange/20',
    glow: 'shadow-viral-orange/10',
  },
};

function formatValue(value: number, format: StatsCardProps['format']) {
  switch (format) {
    case 'compact':
      return Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    case 'score':
      return `${value.toFixed(0)}`;
    case 'duration': {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    default:
      return Intl.NumberFormat('pt-BR').format(value);
  }
}

export function StatsCard({ title, value, icon: Icon, change, format = 'number', loading, color = 'brand' }: StatsCardProps) {
  const colors = colorMap[color];
  const isPositive = (change ?? 0) >= 0;

  if (loading) {
    return (
      <div className="p-5 rounded-2xl border border-border/50 bg-card/50">
        <div className="space-y-3">
          <div className="h-4 w-2/3 shimmer rounded" />
          <div className="h-8 w-1/2 shimmer rounded" />
          <div className="h-3 w-1/3 shimmer rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border bg-card/50 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg glow-card',
        colors.border,
        colors.glow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn('p-2 rounded-xl', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.icon)} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {formatValue(value, format)}
          {format === 'score' && <span className="text-base font-normal text-muted-foreground">/100</span>}
        </p>

        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change}% este mês</span>
          </div>
        )}
      </div>
    </div>
  );
}
