'use client';

import { motion } from 'framer-motion';
import { Users, Plus, CheckCircle2, AlertCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { useState } from 'react';
import { toast } from 'sonner';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } } };

const PLATFORMS_TO_CONNECT = [
  { id: 'TIKTOK', label: 'TikTok', color: 'from-pink-500 to-red-500', description: 'Publique Reels e Shorts automaticamente' },
  { id: 'YOUTUBE_SHORTS', label: 'YouTube', color: 'from-red-500 to-red-700', description: 'Canal de Shorts e vídeos longos' },
  { id: 'INSTAGRAM_REELS', label: 'Instagram', color: 'from-purple-500 to-pink-500', description: 'Feed, Stories e Reels' },
  { id: 'FACEBOOK', label: 'Facebook', color: 'from-blue-600 to-blue-800', description: 'Páginas e Reels' },
];

const PLATFORM_COLOR_MAP: Record<string, string> = {
  TIKTOK: 'from-pink-500 to-red-500',
  YOUTUBE_SHORTS: 'from-red-500 to-red-700',
  YOUTUBE: 'from-red-500 to-red-700',
  INSTAGRAM_REELS: 'from-purple-500 to-pink-500',
  INSTAGRAM: 'from-purple-500 to-pink-500',
  FACEBOOK: 'from-blue-600 to-blue-800',
};

const PLATFORM_LABEL_MAP: Record<string, string> = {
  TIKTOK: 'TikTok',
  YOUTUBE_SHORTS: 'YouTube',
  YOUTUBE: 'YouTube',
  INSTAGRAM_REELS: 'Instagram',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
};

async function fetchAccounts() {
  const res = await api.get('/social/accounts');
  return res.data.data as any[];
}

export default function AccountsPage() {
  const { data: accounts, isLoading, mutate } = useSWR('/social/accounts', fetchAccounts, { revalidateOnFocus: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/social/accounts/${id}`);
      toast.success('Conta desconectada');
      mutate();
    } catch {
      toast.error('Erro ao desconectar conta');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    try {
      await api.post(`/social/accounts/${id}/refresh`);
      toast.success('Conta atualizada');
      mutate();
    } catch {
      toast.error('Erro ao atualizar conta');
    } finally {
      setRefreshingId(null);
    }
  }

  function handleConnect(platformId: string) {
    toast.info(`Conectando ${platformId}... Redirecionando para autorização OAuth.`);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'https://autoviral-ai.onrender.com/api'}/social/oauth/${platformId.toLowerCase()}`;
  }

  const connectedPlatformIds = (accounts ?? []).map((a: any) => a.platform);

  return (
    <motion.div className="p-6 lg:p-8 space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Contas Sociais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte suas redes sociais para publicação automática
        </p>
      </motion.div>

      {isLoading && (
        <motion.div variants={item} className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl">
              <div className="w-10 h-10 rounded-xl shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 shimmer rounded w-1/2" />
                <div className="h-3 shimmer rounded w-1/3" />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!isLoading && accounts && accounts.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contas Conectadas</h2>
          {accounts.map((account: any) => (
            <div key={account.id} className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-2xl">
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br shrink-0', PLATFORM_COLOR_MAP[account.platform] ?? 'from-muted to-muted')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{account.username ?? account.name ?? 'Conta conectada'}</p>
                  {account.isActive && <CheckCircle2 className="w-3.5 h-3.5 text-viral-green shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PLATFORM_LABEL_MAP[account.platform] ?? account.platform}
                  {account.followers != null && ` · ${Number(account.followers).toLocaleString('pt-BR')} seguidores`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  'text-xs px-2 py-1 rounded-lg font-medium',
                  account.isActive ? 'bg-viral-green/15 text-viral-green' : 'bg-muted text-muted-foreground'
                )}>
                  {account.isActive ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => handleRefresh(account.id)}
                  disabled={refreshingId === account.id}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', refreshingId === account.id && 'animate-spin')} />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  disabled={deletingId === account.id}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingId === account.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conectar Nova Conta</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {PLATFORMS_TO_CONNECT.map((platform) => {
            const alreadyConnected = connectedPlatformIds.includes(platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => !alreadyConnected && handleConnect(platform.id)}
                disabled={alreadyConnected}
                className={cn(
                  'flex items-center gap-4 p-4 bg-card border rounded-2xl text-left transition-all',
                  alreadyConnected
                    ? 'border-viral-green/30 opacity-70 cursor-default'
                    : 'border-border/50 hover:border-border hover:scale-[1.01] active:scale-[0.99]'
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br shrink-0', platform.color)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{platform.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                </div>
                {alreadyConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-viral-green shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={item} className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Integração OAuth segura.</span>{' '}
          Seus tokens são criptografados e armazenados com segurança. Você pode revogar o acesso a qualquer momento.
        </div>
      </motion.div>
    </motion.div>
  );
}
