'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp, Video, Upload, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const AUTOMATION_RULES = [
  {
    id: 'trendResearch',
    label: 'Pesquisa de Tendências',
    description: 'Busca automaticamente os temas virais do momento a cada 6 horas',
    icon: TrendingUp,
    color: 'text-viral-red',
    bgColor: 'bg-viral-red/10',
    frequency: 'A cada 6h',
  },
  {
    id: 'scriptGeneration',
    label: 'Geração de Scripts',
    description: 'Cria scripts otimizados para cada tendência identificada com IA',
    icon: Zap,
    color: 'text-viral-purple',
    bgColor: 'bg-viral-purple/10',
    frequency: 'A cada trend',
  },
  {
    id: 'videoRendering',
    label: 'Renderização de Vídeos',
    description: 'Gera vídeos automaticamente assim que os scripts são aprovados',
    icon: Video,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    frequency: 'Por demanda',
  },
  {
    id: 'autoPublish',
    label: 'Publicação Automática',
    description: 'Publica vídeos prontos nos horários de pico de cada plataforma',
    icon: Upload,
    color: 'text-viral-green',
    bgColor: 'bg-viral-green/10',
    frequency: 'No agendamento',
  },
  {
    id: 'analyticsSync',
    label: 'Sincronização de Analytics',
    description: 'Importa métricas de todas as plataformas diariamente',
    icon: BarChart2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    frequency: 'Diariamente',
  },
];

async function fetchSettings() {
  const res = await api.get('/settings');
  return res.data.data;
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn('relative rounded-full transition-colors shrink-0', enabled ? 'bg-viral-green' : 'bg-muted')}
      style={{ height: '22px', width: '40px' }}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', enabled ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export default function AutomationPage() {
  const { data: settings, mutate } = useSWR('/automation-settings', fetchSettings, { revalidateOnFocus: false });

  const automationState: Record<string, boolean> = settings?.automation ?? {
    trendResearch: true,
    scriptGeneration: true,
    videoRendering: false,
    autoPublish: false,
    analyticsSync: true,
  };

  async function toggle(id: string) {
    const current = automationState[id] ?? false;
    const updated = { ...automationState, [id]: !current };
    mutate({ ...settings, automation: updated }, false);
    try {
      await api.patch('/settings', { automation: updated });
      toast.success(`${!current ? 'Ativado' : 'Desativado'} com sucesso`);
    } catch {
      mutate();
      toast.error('Erro ao salvar preferência');
    }
  }

  const recentLogs: any[] = settings?.recentLogs ?? [];

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Automação</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure o piloto automático do seu canal de conteúdo
        </p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Regras de Automação</h2>
        {AUTOMATION_RULES.map((rule) => {
          const Icon = rule.icon;
          const isOn = automationState[rule.id] ?? false;
          return (
            <div
              key={rule.id}
              className={cn(
                'flex items-center gap-4 p-4 bg-card border rounded-2xl transition-all',
                isOn ? 'border-border/50' : 'border-border/30'
              )}
            >
              <div className={cn('p-2.5 rounded-xl shrink-0', rule.bgColor)}>
                <Icon className={cn('w-4 h-4', rule.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{rule.label}</p>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                    {rule.frequency}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>
              </div>
              <Toggle enabled={isOn} onToggle={() => toggle(rule.id)} />
            </div>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="bg-card border border-border/50 rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Atividade Recente
        </h2>
        {recentLogs.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">As automações ativadas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  log.status === 'success' ? 'bg-viral-green' : 'bg-red-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.action}</p>
                  {log.detail && <p className="text-xs text-muted-foreground">{log.detail}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
