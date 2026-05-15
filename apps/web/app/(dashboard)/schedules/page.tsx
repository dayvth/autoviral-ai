'use client';

import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, Play, Pause, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const PLATFORM_COLORS: Record<string, string> = {
  TIKTOK: 'from-pink-500 to-red-500',
  YOUTUBE_SHORTS: 'from-red-500 to-red-700',
  YOUTUBE: 'from-red-500 to-red-700',
  INSTAGRAM_REELS: 'from-purple-500 to-pink-500',
  INSTAGRAM: 'from-purple-500 to-pink-500',
  FACEBOOK: 'from-blue-600 to-blue-800',
};

const PLATFORM_OPTIONS = [
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'YOUTUBE_SHORTS', label: 'YouTube Shorts' },
  { value: 'INSTAGRAM_REELS', label: 'Instagram Reels' },
  { value: 'FACEBOOK', label: 'Facebook' },
];

const FREQ_OPTIONS = [
  { value: '0 18 * * *', label: 'Diariamente às 18h' },
  { value: '0 12 * * 1,3,5', label: '3x por semana (Seg/Qua/Sex)' },
  { value: '0 10 * * 6,0', label: 'Fins de semana' },
  { value: '0 9 * * 1', label: 'Semanalmente (Segunda)' },
];

function formatNextRun(dateStr: string | null) {
  if (!dateStr) return 'Não agendado';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return 'Em breve';
  if (diff < 3600000) return `em ${Math.round(diff / 60000)}min`;
  if (diff < 86400000) return `hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

async function fetchSchedules() {
  const res = await api.get('/schedules');
  return res.data.data as any[];
}

export default function SchedulesPage() {
  const { data: schedules, isLoading, mutate } = useSWR('/schedules', fetchSchedules, { revalidateOnFocus: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'TIKTOK', cronExpr: '0 18 * * *' });

  async function handleToggle(id: string, currentlyActive: boolean) {
    setTogglingId(id);
    try {
      await api.patch(`/schedules/${id}`, { isActive: !currentlyActive });
      mutate();
      toast.success(currentlyActive ? 'Agendamento pausado' : 'Agendamento ativado');
    } catch {
      toast.error('Erro ao atualizar agendamento');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/schedules/${id}`);
      toast.success('Agendamento excluído');
      mutate();
    } catch {
      toast.error('Erro ao excluir agendamento');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('Digite um nome para o agendamento'); return; }
    setCreating(true);
    try {
      await api.post('/schedules', {
        name: form.name,
        platforms: [form.platform],
        cronExpr: form.cronExpr,
        isActive: true,
      });
      toast.success('Agendamento criado!');
      setShowCreate(false);
      setForm({ name: '', platform: 'TIKTOK', cronExpr: '0 18 * * *' });
      mutate();
    } catch {
      toast.error('Erro ao criar agendamento');
    } finally {
      setCreating(false);
    }
  }

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Automatize a publicação com horários recorrentes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </motion.div>

      {showCreate && (
        <motion.div variants={item} className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Novo Agendamento</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: TikTok Diário - Curiosidades"
              className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plataforma</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequência</label>
              <select
                value={form.cronExpr}
                onChange={(e) => setForm((f) => ({ ...f, cronExpr: e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'Criando...' : 'Criar Agendamento'}
          </button>
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl">
                <div className="w-6 h-6 rounded-lg shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 shimmer rounded w-1/2" />
                  <div className="h-3 shimmer rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!schedules || schedules.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum agendamento criado</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Crie seu primeiro agendamento para publicar automaticamente
            </p>
          </div>
        )}

        {!isLoading && schedules && schedules.map((schedule: any) => (
          <div
            key={schedule.id}
            className={cn(
              'p-4 bg-card border rounded-2xl transition-all',
              schedule.isActive ? 'border-border/50' : 'border-border/30 opacity-70'
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex gap-1 shrink-0 mt-0.5">
                {(schedule.platforms ?? []).map((p: string) => (
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
                    Próximo: {formatNextRun(schedule.nextRunAt)}
                  </span>
                  {schedule.runCount != null && (
                    <><span>·</span><span>{schedule.runCount} execuções</span></>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(schedule.id, schedule.isActive)}
                  disabled={togglingId === schedule.id}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                    schedule.isActive
                      ? 'hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400'
                      : 'hover:bg-viral-green/10 text-muted-foreground hover:text-viral-green'
                  )}
                >
                  {togglingId === schedule.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : schedule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  disabled={deletingId === schedule.id}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingId === schedule.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
