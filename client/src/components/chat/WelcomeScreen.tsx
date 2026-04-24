import { motion } from 'framer-motion';
import doraWelcome from '@/assets/dora-welcome.png';

const CHIPS = [
  { e: '🍰', t: 'Tell me about doracake!' },
  { e: '🛸', t: 'What\'s the 22nd century like?' },
  { e: '💙', t: 'I\'m feeling a bit sad today' },
  { e: '💡', t: 'I need help with something' },
  { e: '😄', t: 'Tell me a joke!' },
  { e: '🚀', t: 'What gadgets do you have?' },
];

export default function WelcomeScreen({ onSuggestion }: { onSuggestion: (t: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-5 w-full max-w-md"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl scale-150 pointer-events-none" />
          <motion.img
            src={doraWelcome} alt="MiniDora" draggable={false}
            className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl animate-float"
          />
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            Hey there! I'm MiniDora 🐾
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Robotic cat companion from the 22nd century. I help, I listen, I occasionally obsess over doracake.
          </p>
          <p className="text-xs text-muted-foreground/60 italic">
            What's on your mind today?
          </p>
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
          {CHIPS.map((c, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              onClick={() => onSuggestion(c.t)}
              className="flex items-start gap-2 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 hover:bg-muted text-left text-xs text-foreground/80 hover:text-foreground transition-all active:scale-95 shadow-sm hover:shadow-md"
            >
              <span className="text-base leading-none mt-0.5 shrink-0">{c.e}</span>
              <span className="leading-snug">{c.t}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
