'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp, Video, Upload, BarChart2, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const AUTOMATION_RULES = [
  {
    id: 'trend_research',
    label: 'Pesquisa de Tendências',
    description: 'Busca automaticamente os temas virais do momento a cada 6 horas',
    icon: TrendingUp,
    color: 'text-viral-red',
    bgColor: 'bg-viral-red/10',
    defaultEnabled: true,
    frequency: 'A cada 6h',
  },
  {
    id: 'script_generation',
    label: 'Geração de Scripts',
    description: 'Cria scripts otimizados para cada tendência identificada com IA',
    icon: Zap,
    color: 'text-viral-purple',
    bgColor: 'bg-viral-purple/10',
    defaultEnabled: true,
    frequency: 'A cada trend',
  },
  {
    id: 'video_rendering',
    label: 'Renderização de Vídeos',
    description: 'Gera vídeos automaticamente assim que os scripts são aprovados',
    icon: Video,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    defaultEnabled: false,
    frequency: 'Por demanda',
  },
  {
    id: 'auto_publish',
    label: 'Publicação Automática',
    description: 'Publica vídeos prontos nos horários de pico de cada plataforma',
    icon: Upload,
    color: 'text-viral-green',
    bgColor: 'bg-viral-green/10',
    defaultEnabled: false,
    frequency: 'No agendamento',
  },
  {
    id: 'analytics_sync',
    label: 'Sincronização de Analytics',
    description: 'Importa métricas de todas as plataformas diariamente',
    icon: BarChart2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    defaultEnabled: true,
    frequency: 'Diariamente',
  },
];

const RECENT_LOGS = [
  { action: 'Pesquisa de tendências concluída', status: 'success', time: 'há 5 min', detail: '8 novos tópicos encontrados' },
  { action: 'Script gerado: "5 Curiosidades..."', status: 'success', time: 'há 12 min', detail: 'Score viral: 87' },
  { action: 'Publicação no TikTok', status: 'success', time: 'há 18h', detail: '@autoviral_oficial' },
  { action: 'Sincronização de analytics', status: 'success', time: 'há 24h', detail: '3 plataformas sincronizadas' },
  { action: 'Renderização falhou', status: 'error', time: 'há 2 dias', detail: 'Serviço de voz indisponível' },
];

export default function AutomationPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATION_RULES.map((r) => [r.id, r.defaultEnabled]))
  );

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <motion.div
      className="p-6 lg:p-8 space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Automação</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure o piloto automático do seu canal de conteúdo
        </p>
      </motion.div>

      {/* Automation rules */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Regras de Automação</h2>
        {AUTOMATION_RULES.map((rule) => {
          const Icon = rule.icon;
          const isOn = enabled[rule.id];
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
              <button
                onClick={() => toggle(rule.id)}
                className={cn('shrink-0 transition-colors', isOn ? 'text-viral-green' : 'text-muted-foreground/40')}
              >
                {isOn ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>
          );
        })}
      </motion.div>

      {/* Recent logs */}
      <motion.div variants={item} className="bg-card border border-border/50 rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Atividade Recente
        </h2>
        <div className="space-y-3">
          {RECENT_LOGS.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                log.status === 'success' ? 'bg-viral-green' : 'bg-red-400'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
