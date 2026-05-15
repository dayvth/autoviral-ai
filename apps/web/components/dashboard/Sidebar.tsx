'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Video, TrendingUp, BarChart2, Settings,
  Users, Calendar, Zap, CreditCard, ChevronRight, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Gerar Conteúdo', href: '/content', icon: Zap, badge: 'IA', badgeColor: 'bg-viral-purple/20 text-viral-purple border-viral-purple/30' },
  { label: 'Meus Vídeos', href: '/videos', icon: Video },
  { label: 'Tendências', href: '/trends', icon: Flame, badge: 'Novo', badgeColor: 'bg-viral-red/20 text-viral-red border-viral-red/30' },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Contas Sociais', href: '/accounts', icon: Users },
  { label: 'Agendamentos', href: '/schedules', icon: Calendar },
  { label: 'Automação', href: '/automation', icon: TrendingUp },
];

const bottomItems = [
  { label: 'Planos', href: '/billing', icon: CreditCard },
  { label: 'Configurações', href: '/settings', icon: Settings },
];

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-muted-foreground',
  PRO: 'text-viral-purple',
  BUSINESS: 'text-viral-red',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U';
  const planLabel = user?.plan ? `Plano ${user.plan}` : 'Carregando...';
  const planColor = PLAN_COLORS[user?.plan ?? 'FREE'];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight">AutoViral</p>
            <p className="text-xs text-muted-foreground">AI Studio</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={cn('w-4 h-4 shrink-0 relative z-10', isActive && 'text-primary')} />
              <span className="relative z-10 flex-1">{item.label}</span>
              {item.badge && (
                <span className={cn('relative z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded border', item.badgeColor)}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 relative z-10 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-border/50 space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* User mini */}
        <Link href="/settings" className="mt-3 p-3 rounded-xl bg-secondary/40 flex items-center gap-3 hover:bg-secondary/60 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name ?? user?.email ?? 'Usuário'}</p>
            <p className={cn('text-[11px]', planColor)}>{planLabel}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
