/**
 * EmotionIndicator — shows MiniDora's current emotional state
 * Small badge that animates when emotion changes
 */
import { motion, AnimatePresence } from 'framer-motion';
import { EmotionType } from '@/lib/api';

interface Props {
  emotion: EmotionType;
  className?: string;
}

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; label: string; color: string }> = {
  happy:   { emoji: '😊', label: 'Happy',    color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/25' },
  excited: { emoji: '🎉', label: 'Excited',  color: 'bg-orange-500/15 text-orange-600 border-orange-500/25' },
  worried: { emoji: '💙', label: 'Caring',   color: 'bg-blue-500/15 text-blue-600 border-blue-500/25' },
  curious: { emoji: '🔍', label: 'Curious',  color: 'bg-purple-500/15 text-purple-600 border-purple-500/25' },
  playful: { emoji: '😄', label: 'Playful',  color: 'bg-green-500/15 text-green-600 border-green-500/25' },
  neutral: { emoji: '🤖', label: 'Thinking', color: 'bg-primary/10 text-primary border-primary/20' },
};

export default function EmotionIndicator({ emotion, className = '' }: Props) {
  const config = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={emotion}
        initial={{ opacity: 0, scale: 0.8, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color} ${className}`}
        title={`MiniDora is feeling ${config.label.toLowerCase()}`}
      >
        <span className="text-xs leading-none">{config.emoji}</span>
        <span className="hidden sm:inline">{config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
