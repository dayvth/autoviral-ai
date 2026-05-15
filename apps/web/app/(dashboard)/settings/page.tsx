'use client';

import { motion } from 'framer-motion';
import { Settings, User, Bell, Palette, Shield, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import useSWR from 'swr';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'preferences', label: 'Preferências', icon: Palette },
  { id: 'security', label: 'Segurança', icon: Shield },
];

const LANGUAGES = ['pt-BR', 'en-US', 'es-ES'];
const STYLES = ['CINEMATIC', 'DOCUMENTARY', 'ENERGETIC', 'CALM', 'COMEDY', 'EDUCATIONAL', 'MOTIVATIONAL'];
const FREQUENCIES = ['HOURLY', 'THREE_TIMES_DAILY', 'DAILY', 'TWICE_WEEKLY', 'WEEKLY'];
const FREQUENCY_LABELS: Record<string, string> = {
  HOURLY: 'A cada hora', THREE_TIMES_DAILY: '3x por dia', DAILY: 'Diário', TWICE_WEEKLY: '2x por semana', WEEKLY: 'Semanal',
};

async function fetchSettings() {
  const [meRes, settingsRes] = await Promise.all([
    api.get('/auth/me'),
    api.get('/settings'),
  ]);
  return { user: meRes.data.data, settings: settingsRes.data.data };
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={cn('relative rounded-full transition-colors shrink-0', enabled ? 'bg-primary' : 'bg-muted')} style={{ height: '22px', width: '40px' }}>
      <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', enabled ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const { data, mutate } = useSWR('/settings-page', fetchSettings, { revalidateOnFocus: false });

  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyViral, setNotifyViral] = useState(true);
  const [autoImprove, setAutoImprove] = useState(true);
  const [language, setLanguage] = useState('pt-BR');
  const [style, setStyle] = useState('CINEMATIC');
  const [frequency, setFrequency] = useState('DAILY');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!data) return;
    setName(data.user.name ?? '');
    setBrandName(data.settings?.brandName ?? '');
    setNotifyUpload(data.settings?.notifyOnUpload ?? true);
    setNotifyViral(data.settings?.notifyOnViral ?? true);
    setAutoImprove(data.settings?.autoImprove ?? true);
    setLanguage(data.settings?.defaultLanguage ?? 'pt-BR');
    setStyle(data.settings?.defaultVideoStyle ?? 'CINEMATIC');
    setFrequency(data.settings?.postingFrequency ?? 'DAILY');
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      if (activeTab === 'security') {
        if (newPassword && newPassword !== confirmPassword) {
          toast.error('As senhas não coincidem');
          return;
        }
        if (newPassword && newPassword.length < 8) {
          toast.error('A senha deve ter pelo menos 8 caracteres');
          return;
        }
        toast.success('Senha atualizada! (funcionalidade em breve)');
        return;
      }

      const settingsPayload: Record<string, any> = {};
      if (activeTab === 'profile') {
        await api.patch('/settings', { brandName });
        if (name !== data?.user.name) {
          settingsPayload.name = name;
        }
      }
      if (activeTab === 'notifications') {
        settingsPayload.notifyOnUpload = notifyUpload;
        settingsPayload.notifyOnViral = notifyViral;
      }
      if (activeTab === 'preferences') {
        settingsPayload.defaultLanguage = language;
        settingsPayload.defaultVideoStyle = style;
        settingsPayload.postingFrequency = frequency;
        settingsPayload.autoImprove = autoImprove;
      }

      if (Object.keys(settingsPayload).length > 0) {
        await api.patch('/settings', settingsPayload);
      }

      toast.success('Configurações salvas!');
      mutate();
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  const email = data?.user.email ?? '';

  return (
    <motion.div className="p-6 lg:p-8 space-y-6 max-w-3xl" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Personalize sua experiência e preferências de conteúdo</p>
      </motion.div>

      <motion.div variants={item} className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={item} className="bg-card border border-border/50 rounded-2xl p-5 space-y-5">
        {activeTab === 'profile' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <input type="email" value={email} disabled
                className="w-full px-3 py-2.5 bg-muted/30 border border-border/30 rounded-xl text-sm text-muted-foreground cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Marca</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Ex: AutoViral"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            {[
              { label: 'Notificar quando vídeo for publicado', value: notifyUpload, toggle: () => setNotifyUpload(!notifyUpload) },
              { label: 'Notificar quando vídeo viralizar', value: notifyViral, toggle: () => setNotifyViral(!notifyViral) },
            ].map(({ label, value, toggle }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <p className="text-sm">{label}</p>
                <Toggle enabled={value} onToggle={toggle} />
              </div>
            ))}
          </>
        )}

        {activeTab === 'preferences' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Idioma padrão</label>
              <div className="flex gap-2 flex-wrap">
                {LANGUAGES.map((lang) => (
                  <button key={lang} onClick={() => setLanguage(lang)}
                    className={cn('px-3 py-1.5 rounded-xl border text-sm font-medium transition-all',
                      language === lang ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/50 text-muted-foreground hover:border-border')}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estilo padrão de vídeo</label>
              <div className="flex gap-2 flex-wrap">
                {STYLES.map((s) => (
                  <button key={s} onClick={() => setStyle(s)}
                    className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                      style === s ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/50 text-muted-foreground hover:border-border')}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequência de postagem</label>
              <div className="flex gap-2 flex-wrap">
                {FREQUENCIES.map((f) => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                      frequency === f ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/50 text-muted-foreground hover:border-border')}>
                    {FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Melhoria automática com IA</p>
                <p className="text-xs text-muted-foreground">Scripts são refinados automaticamente com base nas métricas</p>
              </div>
              <Toggle enabled={autoImprove} onToggle={() => setAutoImprove(!autoImprove)} />
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova senha</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar nova senha</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </motion.div>
    </motion.div>
  );
}
