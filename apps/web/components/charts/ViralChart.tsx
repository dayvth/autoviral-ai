'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MOCK_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  views: Math.round(Math.random() * 50000 + 5000 + i * 1200),
  viral: Math.round(Math.random() * 30 + 50 + i * 0.5),
}));

const periods = ['7d', '30d', '90d'] as const;
type Period = (typeof periods)[number];

export function ViralChart() {
  const [period, setPeriod] = useState<Period>('30d');

  const data = period === '7d' ? MOCK_DATA.slice(-7) : period === '90d' ? MOCK_DATA : MOCK_DATA.slice(-30);

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-sm">Visualizações</h3>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            {Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(
              data.reduce((s, d) => s + d.views, 0)
            )}
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                period === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(230 100% 62%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(230 100% 62%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(220 8% 55%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            tick={{ fill: 'hsl(220 8% 55%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(220 18% 9%)',
              border: '1px solid hsl(220 15% 15%)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
            formatter={(v: number) => [Intl.NumberFormat('pt-BR').format(v), 'Views']}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="hsl(230 100% 62%)"
            strokeWidth={2}
            fill="url(#viewsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
