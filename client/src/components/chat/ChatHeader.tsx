/**
 * MiniDora v2 — ChatHeader
 * Shows live mascot state, emotion indicator, offline badge
 */

import { motion } from 'framer-motion';
import { Menu, Settings, Sun, Moon, LogOut, Download } from 'lucide-react';
import { useTheme }    from 'next-themes';
import { useSettings } from '@/hooks/useSettings';
import { useAuth }     from '@/contexts/AuthContext';
import { cn }          from '@/lib/utils';
import MascotAvatar    from './MascotAvatar';
import EmotionIndicator from './EmotionIndicator';
import type { EmotionType } from '@/lib/api';
import type { MascotState } from '@/hooks/useChat';

const CHAR_NAMES: Record<string, { name: string; emoji: string }> = {
  minidora:'MiniDora 🤖', sparky:'Sparky ⚡', serene:'Serene 🌿', sage:'Sage 🦉',
  byte:'Byte 💻', atlas:'Atlas 💼', jinx:'Jinx 😏', bloom:'Bloom 💗',
  fable:'Fable 📖', blaze:'Blaze 🔥', nova:'Nova 🎓', zero:'Zero ⚫',
};

const MASCOT_LABEL: Record<MascotState, { text: string; color: string }> = {
  idle:      { text: 'Online',    color: 'text-green-500' },
  listening: { text: 'Listening…', color: 'text-blue-500' },
  thinking:  { text: 'Thinking…', color: 'text-yellow-500' },
  offline:   { text: 'Offline',   color: 'text-orange-500' },
};

interface Props {
  onMenu?:       () => void;
  onSettings?:   () => void;
  onExport?:     () => void;
  currentEmotion?: EmotionType;
  mascotState?:    MascotState;
  isOfflineMode?:  boolean;
}

export default function ChatHeader({ onMenu, onSettings, onExport, currentEmotion = 'neutral', mascotState = 'idle', isOfflineMode = false }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const { settings }  = useSettings();
  const { user, logout } = useAuth();

  const charLabel = CHAR_NAMES[settings.character] || CHAR_NAMES.minidora;
  const initials  = user?.name ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  const ml        = MASCOT_LABEL[mascotState];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-surface border-b h-14 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-30"
    >
      {onMenu && (
        <button onClick={onMenu} className="icon-btn lg:hidden shrink-0" aria-label="Open menu">
          <Menu size={18} />
        </button>
      )}

      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <MascotAvatar size={32} state={mascotState} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground truncate">{charLabel}</span>
            <EmotionIndicator emotion={currentEmotion} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {user?.name && (
              <p className="text-[10px] text-muted-foreground hidden sm:block truncate">
                Hey {user.name.split(' ')[0]}! 👋
              </p>
            )}
            <motion.span key={mascotState} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}
              className={cn('text-[9px] font-semibold', ml.color)}>
              {ml.text}
            </motion.span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {/* Online/offline dot */}
        <span className={cn('w-2 h-2 rounded-full mx-1 transition-colors', isOfflineMode ? 'bg-orange-400 animate-pulse' : 'bg-green-400')}
          title={isOfflineMode ? 'Offline mode' : 'All AI tiers active'} />

        {onExport   && <button onClick={onExport}   className="icon-btn" title="Export chat"><Download size={16} /></button>}
        {onSettings && <button onClick={onSettings} className="icon-btn" title="Settings"><Settings size={16} /></button>}
        <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="icon-btn" title="Toggle theme">
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border">
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-gradient-to-br', user?.avatar || 'from-primary to-accent')}>
            {initials}
          </div>
          <button onClick={logout} className="icon-btn text-muted-foreground/60 hover:text-destructive" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
