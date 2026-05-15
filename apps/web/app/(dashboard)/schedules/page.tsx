'use client';

import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, Play, Pause, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const MOCK_SCHEDULES = [
  {
    id: '1',
    name: 'TikTok Diário - Curiosidades',
    cronExpr: '0 18 * * *',
    platforms: ['TikTok'],
    isActive: true,
    nextRunAt: 'Hoje às 18:00',
    lastRunAt: 'Ontem às 18:00',
    runCount: 14,
  },
  {
    id: '2',
    name: 'YouTube Shorts - 3x por semana',
    cronExpr: '0 12 * * 1,3,5',
    platforms: ['YouTube'],
    isActive: true,
    nextRunAt: 'Seg às 12:00',
    lastRunAt: 'Sex às 12:00',
    runCount: 6,
  },
  {
    id: '3',
    name: 'Instagram Reels - Final de semana',
    cronExpr: '0 10 * * 6,0',
    platforms: ['Instagram'],
    isActive: false,
    nextRunAt: 'Sáb às 10:00',
    lastRunAt: 'Dom passado às 10:00',
    runCount: 4,
  },
];

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: 'from-pink-500 to-red-500',
  YouTube: 'from-red-500 to-red-700',
  Instagram: 'from-purple-500 to-pink-500',
  Facebook: 'from-blue-600 to-blue-800',
};

export default function SchedulesPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automatize a publicação com horários recorrentes
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </motion.div>

      {/* Schedule list */}
      <motion.div variants={item} className="space-y-3">
        {MOCK_SCHEDULES.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum agendamento criado</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Crie seu primeiro agendamento para publicar automaticamente
            </p>
          </div>
        ) : (
          MOCK_SCHEDULES.map((schedule) => (
            <div
              key={schedule.id}
              className={cn(
                'p-4 bg-card border rounded-2xl transition-all',
                schedule.isActive ? 'border-border/50' : 'border-border/30 opacity-70'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Platform indicators */}
                <div className="flex gap-1 shrink-0 mt-0.5">
                  {schedule.platforms.map((p) => (
                    <div key={p} className={cn('w-6 h-6 rounded-lg bg-gradient-to-br', PLATFORM_COLORS[p] ?? 'from-muted to-muted')} />
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{schedule.name}</p>
                    {schedule.isActive && <CheckCircle2 className="w-3.5 h-3.5 text-viral-green shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Próximo: {schedule.nextRunAt}
                    </span>
                    <span>·</span>
                    <span>{schedule.runCount} execuções</span>
                    <span>·</span>
                    <span>Último: {schedule.lastRunAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    schedule.isActive
                      ? 'hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400'
                      : 'hover:bg-viral-green/10 text-muted-foreground hover:text-viral-green'
                  )}>
                    {schedule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
