'use client';

import { motion } from 'framer-motion';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';

const PLATFORM_MAP: Record<string, string> = {
  'TikTok': 'TIKTOK',
  'YouTube Shorts': 'YOUTUBE_SHORTS',
  'Instagram Reels': 'INSTAGRAM_REELS',
};

const NICHE_MAP: Record<string, string> = {
  'Curiosidades': 'curiosidades',
  'Motivação': 'motivacao',
  'Finanças': 'financas',
  'IA & Tech': 'ia',
  'Fitness': 'fitness',
  'Luxo': 'luxo',
};

const platforms = Object.keys(PLATFORM_MAP) as (keyof typeof PLATFORM_MAP)[];
const niches = Object.keys(NICHE_MAP) as (keyof typeof NICHE_MAP)[];

export function QuickGenerate() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string>('Curiosidades');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('TikTok');

  async function handleGenerate() {
    setLoading(true);
    try {
      await api.post('/videos/generate', {
        nicheId: NICHE_MAP[selectedNiche] ?? 'curiosidades',
        platform: PLATFORM_MAP[selectedPlatform] ?? 'TIKTOK',
        duration: 30,
      });
      setDone(true);
      toast.success('Vídeo na fila! Acompanhe em Meus Vídeos.');
      setTimeout(() => setDone(false), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message;
      toast.error(msg ?? 'Erro ao iniciar geração. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-semibold">Geração Rápida</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie um vídeo viral completo agora</p>
        </div>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full"
          >
            <CheckCircle2 className="w-4 h-4" />
            Vídeo na fila!
          </motion.div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Config */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Nicho</label>
            <div className="flex flex-wrap gap-2">
              {niches.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedNiche(n)}
                  disabled={loading}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-all',
                    selectedNiche === n
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'text-muted-foreground border-border/50 hover:border-border'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Plataforma</label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  disabled={loading}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-all',
                    selectedPlatform === p
                      ? 'bg-viral-purple/15 text-viral-purple border-viral-purple/30'
                      : 'text-muted-foreground border-border/50 hover:border-border'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="md:col-span-2 flex items-center justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || done}
            className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
              {loading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : done ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : (
                <Zap className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold">
                {loading ? 'Enviando para a fila...' : done ? 'Vídeo na fila!' : `Gerar vídeo para ${selectedPlatform}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? 'Aguarde um momento...' : `Nicho: ${selectedNiche} • ~2 min`}
              </p>
            </div>
            {!loading && !done && (
              <span className="text-xs text-primary font-medium border border-primary/30 bg-primary/10 px-3 py-1 rounded-full">
                Clique para iniciar
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
