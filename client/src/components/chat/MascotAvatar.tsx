/**
 * MiniDora v2 — MascotAvatar
 *
 * State-driven animated avatar:
 *   idle      → green dot, normal
 *   listening → blue dot + gentle scale pulse
 *   thinking  → yellow dot + spinning ring overlay
 *   offline   → orange dot + greyscale
 */

import { motion, AnimatePresence } from 'framer-motion';
import doraLogo from '@/assets/dora-logo.png';
import { cn } from '@/lib/utils';
import type { MascotState } from '@/hooks/useChat';

interface Props {
  state?:     MascotState;
  size?:      number;
  className?: string;
  showLabel?: boolean;
}

const CFG: Record<MascotState, { dot: string; ring: string; label: string; spinning: boolean; pulseDot: boolean }> = {
  idle:      { dot: 'bg-green-400',  ring: 'ring-primary/20',     label: 'Online',    spinning: false, pulseDot: false },
  listening: { dot: 'bg-blue-400',   ring: 'ring-blue-400/30',    label: 'Listening…', spinning: false, pulseDot: true  },
  thinking:  { dot: 'bg-yellow-400', ring: 'ring-yellow-400/30',  label: 'Thinking…', spinning: true,  pulseDot: true  },
  offline:   { dot: 'bg-orange-400', ring: 'ring-orange-400/30',  label: 'Offline',   spinning: false, pulseDot: true  },
};

export default function MascotAvatar({ state = 'idle', size = 36, className, showLabel = false }: Props) {
  const cfg     = CFG[state];
  const dotSize = Math.max(8, Math.round(size * 0.24));

  return (
    <div className={cn('relative shrink-0 flex flex-col items-center gap-1', className)}>
      {/* Avatar */}
      <motion.div
        style={{ width: size, height: size }}
        className={cn('relative rounded-full ring-2 shadow-md overflow-hidden transition-shadow duration-300', cfg.ring)}
        animate={
          state === 'listening'
            ? { scale: [1, 1.06, 1], transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } }
            : state === 'thinking'
            ? { scale: [1, 1.04, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
            : { scale: 1 }
        }
      >
        <img
          src={doraLogo}
          alt="MiniDora"
          draggable={false}
          className={cn(
            'w-full h-full object-cover rounded-full transition-all duration-500',
            state === 'offline' && 'grayscale brightness-75 saturate-0'
          )}
          style={{ width: size, height: size }}
        />

        {/* Thinking — spinning ring */}
        <AnimatePresence>
          {state === 'thinking' && (
            <motion.div
              key="spin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.2 },
                rotate:  { duration: 0.9, repeat: Infinity, ease: 'linear' },
              }}
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 border-r-yellow-400/30"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status dot */}
      <motion.span
        key={state + '-dot'}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card',
          cfg.dot,
          cfg.pulseDot && 'animate-pulse'
        )}
        style={{ width: dotSize, height: dotSize }}
        title={cfg.label}
      />

      {/* Optional state label */}
      {showLabel && (
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[9px] font-medium text-muted-foreground leading-none"
        >
          {cfg.label}
        </motion.span>
      )}
    </div>
  );
}
