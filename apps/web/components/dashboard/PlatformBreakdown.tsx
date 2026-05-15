'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ff3b5c', '#ff0000', '#c026d3', '#1d9bf0', '#0866ff'];
const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: 'TikTok', YOUTUBE_SHORTS: 'YouTube', YOUTUBE: 'YouTube',
  INSTAGRAM_REELS: 'Instagram', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
};

interface PlatformBreakdownProps {
  data?: Array<{ platform: string; views: number }>;
  loading?: boolean;
}

export function PlatformBreakdown({ data, loading }: PlatformBreakdownProps) {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-border/50 bg-card/50 h-full">
        <div className="h-4 w-1/2 shimmer rounded mb-6" />
        <div className="h-[180px] shimmer rounded-full mx-auto w-[180px]" />
      </div>
    );
  }

  const chartData = (data && data.length > 0)
    ? data.map((d) => ({ ...d, label: PLATFORM_LABELS[d.platform] ?? d.platform }))
    : [];

  const total = chartData.reduce((s, d) => s + d.views, 0);

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center justify-center text-center">
        <h3 className="font-semibold text-sm mb-3 self-start">Por Plataforma</h3>
        <p className="text-sm text-muted-foreground">Nenhum dado ainda.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Publique vídeos para ver distribuição.</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full">
      <h3 className="font-semibold text-sm mb-5">Por Plataforma</h3>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="views"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(220 18% 9%)',
              border: '1px solid hsl(220 15% 15%)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
            formatter={(v: number) => [Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v), 'Views']}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2 mt-4">
        {chartData.map((d, i) => (
          <div key={d.platform} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{d.label}</span>
            </div>
            <span className="font-medium tabular-nums">
              {total > 0 ? ((d.views / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
