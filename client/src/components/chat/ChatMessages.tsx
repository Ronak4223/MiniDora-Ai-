import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { Message } from '@/hooks/useChat';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';

interface Props { messages: Message[]; typing: boolean; onSuggestion: (t: string) => void; }

export default function ChatMessages({ messages, typing, onSuggestion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showBtn, setShowBtn] = useState(false);

  const scrollToBottom = useCallback((force = false) => {
    const el = containerRef.current;
    if (!el) return;
    if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 150)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = () => setShowBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    el.addEventListener('scroll', fn, { passive: true });
    return () => el.removeEventListener('scroll', fn);
  }, []);

  const getPrevUser = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (messages[j].role === 'user') return messages[j].content;
    return '';
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-background relative">
      <div className="py-4 min-h-full flex flex-col">
        {messages.length <= 1 && !typing
          ? <WelcomeScreen onSuggestion={onSuggestion} />
          : (
            <div className="flex flex-col gap-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.map((msg, i) => (
                  <ChatBubble key={msg.id} message={msg} isLast={i === messages.length - 1}
                    previousUserMessage={msg.role === 'assistant' ? getPrevUser(i) : ''} />
                ))}
              </AnimatePresence>
            </div>
          )}
        {typing && <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}><TypingIndicator /></motion.div>}
        <div ref={bottomRef} className="h-2 shrink-0" />
      </div>
      <AnimatePresence>
        {showBtn && (
          <motion.button initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            onClick={() => scrollToBottom(true)}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95">
            <ArrowDown size={12} /> Jump to bottom
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
