'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Zap, Globe, Clock, Video, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { VideoProgressTracker } from '@/components/dashboard/VideoProgressTracker';
import { useAuth } from '@/lib/hooks/useAuth';

const NICHES = [
  { id: 'curiosidades', label: 'Curiosidades', emoji: '🤯' },
  { id: 'motivacao', label: 'Motivação', emoji: '🔥' },
  { id: 'financas', label: 'Finanças', emoji: '💰' },
  { id: 'ia', label: 'IA & Tech', emoji: '🤖' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'luxo', label: 'Luxo', emoji: '👑' },
  { id: 'esportes', label: 'Esportes', emoji: '⚽' },
  { id: 'anime', label: 'Anime', emoji: '⚔️' },
  { id: 'historias', label: 'Histórias', emoji: '📖' },
  { id: 'negocios', label: 'Negócios', emoji: '🚀' },
  { id: 'carros', label: 'Carros', emoji: '🏎️' },
  { id: 'frases', label: 'Frases', emoji: '💬' },
];

const PLATFORMS = [
  { id: 'TIKTOK', label: 'TikTok', color: 'from-pink-500 to-red-500', duration: 30 },
  { id: 'YOUTUBE_SHORTS', label: 'YouTube Shorts', color: 'from-red-500 to-red-700', duration: 60 },
  { id: 'INSTAGRAM_REELS', label: 'Instagram Reels', color: 'from-purple-500 to-pink-500', duration: 30 },
  { id: 'YOUTUBE', label: 'YouTube (Longo)', color: 'from-red-600 to-red-800', duration: 480 },
];

const DURATIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1min' },
  { value: 90, label: '1:30' },
  { value: 180, label: '3min' },
];

export default function ContentPage() {
  const { user } = useAuth();
  const [selectedNiches, setSelectedNiches] = useState<string[]>(['curiosidades']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TIKTOK']);
  const [duration, setDuration] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [activeVideoIds, setActiveVideoIds] = useState<string[]>([]);

  function toggleNiche(id: string) {
    setSelectedNiches((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (selectedNiches.length === 0) return toast.error('Selecione pelo menos um nicho');
    if (selectedPlatforms.length === 0) return toast.error('Selecione pelo menos uma plataforma');

    setGenerating(true);
    setActiveVideoIds([]);

    try {
      const results = await Promise.all(
        selectedPlatforms.map((platform) =>
          api.post('/videos/generate', { nicheId: selectedNiches[0], platform, duration })
        )
      );

      const videoIds = results.map((r) => r.data.data.videoId).filter(Boolean);
      setActiveVideoIds(videoIds);
      toast.success(`${videoIds.length} vídeo(s) em geração — acompanhe abaixo!`);
    } catch {
      toast.error('Erro ao iniciar geração. Verifique suas configurações.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Gerar Conteúdo</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Configure e lance a produção automática de vídeos virais
        </p>

        <div className="space-y-8">
          {/* Niches */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Nichos</h2>
              <span className="text-xs text-muted-foreground">
                ({selectedNiches.length} selecionado{selectedNiches.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {NICHES.map((niche) => (
                <button
                  key={niche.id}
                  onClick={() => toggleNiche(niche.id)}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all hover:scale-105 active:scale-95',
                    selectedNiches.includes(niche.id)
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <div className="text-2xl mb-1">{niche.emoji}</div>
                  <div className="text-xs font-medium">{niche.label}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Platforms */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Plataformas</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95',
                    selectedPlatforms.includes(p.id)
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  <div className={cn('w-8 h-1.5 rounded-full bg-gradient-to-r mb-3', p.color)} />
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max {p.duration >= 60 ? `${p.duration / 60}min` : `${p.duration}s`}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Duration */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Duração do Vídeo</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                    duration === d.value
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={cn(
              'flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-semibold text-base transition-all',
              generating
                ? 'bg-primary/50 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/25'
            )}
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando geração...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Gerar {selectedPlatforms.length > 1 ? `${selectedPlatforms.length} Vídeos` : 'Vídeo'} Agora
                <ChevronRight className="w-4 h-4 opacity-70" />
              </>
            )}
          </button>

          {/* Real-time progress tracker */}
          {user && activeVideoIds.length > 0 && (
            <VideoProgressTracker userId={user.id} videoIds={activeVideoIds} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
