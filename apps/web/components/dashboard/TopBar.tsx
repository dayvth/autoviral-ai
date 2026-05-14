'use client';

import { Bell, Search, Zap } from 'lucide-react';
import { useState } from 'react';

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-background/60 backdrop-blur-sm shrink-0">
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm bg-secondary/50 rounded-xl px-3 py-2 border border-border/50 hover:border-border"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block text-xs">Buscar vídeos, nichos...</span>
          <kbd className="hidden sm:block text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border ml-4">⌘K</kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* AI status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-viral-green bg-viral-green/10 border border-viral-green/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-viral-green animate-pulse-slow" />
          IA Ativa
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/60 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-viral-red" />
        </button>

        {/* Quick generate shortcut */}
        <button className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-medium transition-all">
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Gerar agora</span>
        </button>
      </div>
    </header>
  );
}
