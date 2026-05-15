'use client';

import { Bell, Search, Zap, X, LogOut, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';

const NOTIFICATIONS = [
  { id: '1', text: 'Seu vídeo foi publicado no TikTok', time: '5 min', read: false },
  { id: '2', text: 'Novo script gerado para "IA & Tech"', time: '1h', read: false },
  { id: '3', text: 'Tendência detectada: ChatGPT vs Gemini', time: '3h', read: true },
  { id: '4', text: 'Agendamento executado com sucesso', time: '6h', read: true },
];

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-background/60 backdrop-blur-sm shrink-0 relative z-40">
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/videos')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm bg-secondary/50 rounded-xl px-3 py-2 border border-border/50 hover:border-border"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block text-xs">Buscar vídeos, nichos...</span>
          <kbd className="hidden sm:block text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border ml-4">⌘K</kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* AI status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-viral-green bg-viral-green/10 border border-viral-green/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-viral-green animate-pulse-slow" />
          IA Ativa
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/60 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-viral-red" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="text-sm font-semibold">Notificações</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <span className="text-xs bg-viral-red/20 text-viral-red px-2 py-0.5 rounded-full">
                      {unread} nova{unread > 1 ? 's' : ''}
                    </span>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className={cn(!n.read ? '' : 'ml-3.5')}>
                        <p className="text-xs font-medium leading-snug">{n.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.time} atrás</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick generate */}
        <Link
          href="/content"
          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-medium transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Gerar agora</span>
        </Link>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/30 transition-colors"
          >
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-sm font-medium truncate">{user?.name ?? 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Plano {user?.plan ?? 'FREE'}
                </span>
              </div>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
