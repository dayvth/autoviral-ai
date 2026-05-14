'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, CheckCircle2, Video, Mic, Subtitles, Upload } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 'trends', label: 'Pesquisando tendências', icon: Zap, duration: 1200 },
  { id: 'script', label: 'Gerando roteiro viral', icon: Video, duration: 2000 },
  { id: 'voice', label: 'Sintetizando voz IA', icon: Mic, duration: 1800 },
  { id: 'render', label: 'Renderizando vídeo', icon: Video, duration: 3000 },
  { id: 'captions', label: 'Adicionando legendas', icon: Subtitles, duration: 1000 },
  { id: 'upload', label: 'Publicando automaticamente', icon: Upload, duration: 1500 },
];

const platforms = ['TikTok', 'YouTube Shorts', 'Instagram Reels'] as const;
const niches = ['Curiosidades', 'Motivação', 'Finanças', 'IA & Tech', 'Fitness', 'Luxo'] as const;

export function QuickGenerate() {
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState<string>('Curiosidades');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('TikTok');

  async function handleGenerate() {
    setGenerating(true);
    setDone(false);
    setCurrentStep(0);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, steps[i].duration));
    }

    setGenerating(false);
    setDone(true);
    setTimeout(() => { setDone(false); setCurrentStep(-1); }, 4000);
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
            Vídeo publicado!
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
                  disabled={generating}
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
                  disabled={generating}
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

        {/* Progress */}
        <div className="md:col-span-2">
          {generating || done ? (
            <div className="space-y-2">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isDone = i < currentStep || done;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i <= currentStep || done ? 1 : 0.3, x: 0 }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                      isActive ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-secondary/20',
                      isDone && 'border-emerald-500/20 bg-emerald-500/5'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      isActive ? 'bg-primary/20' : isDone ? 'bg-emerald-500/20' : 'bg-secondary'
                    )}>
                      {isActive ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className={cn(
                      'text-sm',
                      isActive ? 'text-foreground font-medium' : isDone ? 'text-emerald-400' : 'text-muted-foreground'
                    )}>
                      {step.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto flex gap-1">
                        {[0, 1, 2].map((j) => (
                          <motion.div
                            key={j}
                            className="w-1 h-1 rounded-full bg-primary"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.2 }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <button
                onClick={handleGenerate}
                className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Gerar vídeo para {selectedPlatform}</p>
                  <p className="text-sm text-muted-foreground mt-1">Nicho: {selectedNiche} • ~2 min</p>
                </div>
                <span className="text-xs text-primary font-medium border border-primary/30 bg-primary/10 px-3 py-1 rounded-full">
                  Clique para iniciar
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
