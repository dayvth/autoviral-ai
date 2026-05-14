'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ff3b5c', '#ff0000', '#c026d3', '#1d9bf0', '#0866ff'];

const MOCK_DATA = [
  { platform: 'TikTok', views: 485_000 },
  { platform: 'YouTube', views: 312_000 },
  { platform: 'Instagram', views: 198_000 },
  { platform: 'Twitter', views: 45_000 },
  { platform: 'Facebook', views: 28_000 },
];

interface PlatformBreakdownProps {
  data?: any[];
  loading?: boolean;
}

export function PlatformBreakdown({ loading }: PlatformBreakdownProps) {
  const total = MOCK_DATA.reduce((s, d) => s + d.views, 0);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-border/50 bg-card/50 h-full">
        <div className="h-4 w-1/2 shimmer rounded mb-6" />
        <div className="h-[180px] shimmer rounded-full mx-auto w-[180px]" />
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full">
      <h3 className="font-semibold text-sm mb-5">Por Plataforma</h3>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={MOCK_DATA}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="views"
          >
            {MOCK_DATA.map((_, index) => (
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
        {MOCK_DATA.map((d, i) => (
          <div key={d.platform} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-muted-foreground">{d.platform}</span>
            </div>
            <span className="font-medium tabular-nums">
              {((d.views / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
