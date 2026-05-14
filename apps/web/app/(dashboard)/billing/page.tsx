'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Zap, Crown, Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    icon: Zap,
    color: 'border-border/50',
    features: [
      '5 vídeos/mês',
      '2 nichos',
      '1 conta por plataforma',
      'Resolução HD',
      'Sem automação',
    ],
    limits: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 97,
    icon: Crown,
    color: 'border-primary/50 bg-primary/5',
    badge: 'Mais Popular',
    features: [
      '200 vídeos/mês',
      'Nichos ilimitados',
      '5 contas por plataforma',
      '4K + Vertical + Horizontal',
      'Automação completa',
      'Analytics avançado',
      'ElevenLabs vozes',
      'Geração de thumbnails',
      'Agendamento inteligente',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 297,
    icon: Building2,
    color: 'border-amber-500/30',
    features: [
      'Vídeos ilimitados',
      'Nichos e contas ilimitados',
      'API access',
      'White-label',
      'Equipe multi-usuário',
      'IA de melhoria contínua',
      'Suporte prioritário',
      'Onboarding dedicado',
    ],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = 'FREE'; // would come from user context

  async function handleUpgrade(planId: string) {
    if (planId === 'FREE') return;
    setLoading(planId);
    try {
      const res = await api.post('/billing/checkout', { plan: planId });
      window.location.href = res.data.data.url;
    } catch {
      toast.error('Erro ao processar checkout');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Planos</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Escale sua produção de conteúdo viral
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  'relative p-6 rounded-2xl border backdrop-blur-sm',
                  plan.color,
                  plan.id === 'PRO' && 'shadow-xl shadow-primary/10'
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-primary text-white shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn('w-5 h-5', plan.id === 'PRO' ? 'text-primary' : plan.id === 'BUSINESS' ? 'text-amber-400' : 'text-muted-foreground')} />
                    <span className="font-semibold">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={cn(
                        'w-4 h-4 mt-0.5 shrink-0',
                        plan.id === 'PRO' ? 'text-primary' : plan.id === 'BUSINESS' ? 'text-amber-400' : 'text-muted-foreground'
                      )} />
                      <span className={plan.limits && plan.id === 'FREE' ? 'text-muted-foreground' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loading === plan.id || plan.price === 0}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    isCurrent
                      ? 'bg-secondary/60 text-muted-foreground cursor-default'
                      : plan.id === 'PRO'
                      ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25'
                      : plan.id === 'BUSINESS'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                      : 'bg-secondary/50 text-muted-foreground cursor-default',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {loading === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent ? 'Plano Atual' : plan.price === 0 ? 'Gratuito' : `Assinar ${plan.name}`}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          7 dias grátis em todos os planos pagos · Cancele a qualquer momento · Suporte em português
        </p>
      </motion.div>
    </div>
  );
}
