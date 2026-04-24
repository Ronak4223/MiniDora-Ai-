/**
 * MiniDora v2 — ChatBubble
 * Renders a single message with: markdown, cache badge, LivePreview, emoji sticker, actions
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ThumbsUp, ThumbsDown, Volume2, VolumeX, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn }           from '@/lib/utils';
import type { Message } from '@/hooks/useChat';
import MascotAvatar     from './MascotAvatar';
import DoraEmojiDisplay from './DoraEmojiDisplay';
import LivePreview      from './LivePreview';
import { speak, stop as stopVoice, isSpeaking } from '@/lib/voice';
import { useSettings }  from '@/hooks/useSettings';
import { selectEmoji, shouldShowSecondEmoji, detectTone, recordFeedback } from '@/lib/emoji-engine';

interface Props { message: Message; isLast?: boolean; previousUserMessage?: string; }

export default function ChatBubble({ message, isLast, previousUserMessage = '' }: Props) {
  const { settings }   = useSettings();
  const isUser         = message.role === 'user';
  const time           = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isPro          = ['atlas', 'byte', 'zero'].includes(settings.character);

  const [copied,      setCopied]      = useState(false);
  const [speaking,    setSpeaking]    = useState(false);
  const [feedback,    setFeedback]    = useState<'up' | 'down' | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Emoji selection — stable per message
  const emojiPair = useMemo(() => {
    if (isUser || !message.content || message.content.length < 30) return { main: null, second: null };
    const main = selectEmoji(previousUserMessage, message.content, isPro);
    if (!main) return { main: null, second: null };
    const tone   = detectTone(previousUserMessage, message.content);
    const second = shouldShowSecondEmoji(message.content, tone) ? selectEmoji(previousUserMessage, message.content + '_2', isPro) : null;
    return { main, second };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  if (!message.content && !isUser) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeak = () => {
    if (speaking) { stopVoice(); setSpeaking(false); }
    else {
      speak(message.content, settings.voicePreset, settings.voiceRate, settings.voicePitch);
      setSpeaking(true);
      const iv = setInterval(() => { if (!isSpeaking()) { setSpeaking(false); clearInterval(iv); } }, 500);
    }
  };

  const giveFeedback = (type: 'up' | 'down') => {
    if (feedback) return;
    setFeedback(type);
    recordFeedback(type === 'up' ? 'positive' : 'negative');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex items-end gap-2 px-3 sm:px-5 py-1', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isUser && <div className="shrink-0 mb-5"><MascotAvatar size={28} state="idle" /></div>}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end max-w-[80%] sm:max-w-[65%]' : 'items-start max-w-[88%] sm:max-w-[75%]')}>
        {/* Cache badge */}
        {!isUser && message.fromCache && (
          <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
            className="flex items-center gap-1 text-[9px] text-amber-500 font-medium mb-0.5 ml-1">
            <Zap size={9} /> Instant (cached)
          </motion.div>
        )}

        {/* Bubble */}
        <div className={cn(
          'px-4 py-3 text-sm leading-relaxed break-words rounded-2xl shadow-sm',
          isUser
            ? 'bg-card border border-border/60 text-foreground rounded-br-sm'
            : 'dora-gradient text-white rounded-bl-sm'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className={cn(
              '[&>p]:mb-2 [&>p:last-child]:mb-0',
              '[&>ul]:mb-2 [&>ul]:pl-4 [&>ul>li]:list-disc [&>ul>li]:mb-0.5',
              '[&>ol]:mb-2 [&>ol]:pl-4 [&>ol>li]:list-decimal [&>ol>li]:mb-0.5',
              '[&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2',
              '[&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-1',
              '[&>blockquote]:border-l-2 [&>blockquote]:border-white/40 [&>blockquote]:pl-3 [&>blockquote]:my-2',
              '[&>pre]:bg-black/25 [&>pre]:rounded-xl [&>pre]:p-3 [&>pre]:text-xs [&>pre]:overflow-x-auto [&>pre]:my-2',
              '[&_code]:bg-black/25 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs',
            )}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Live code preview */}
        {!isUser && message.tool?.type === 'generateWebsiteCode' && showPreview && (
          <LivePreview tool={message.tool} onClose={() => setShowPreview(false)} />
        )}
        {!isUser && message.tool?.type === 'generateWebsiteCode' && !showPreview && (
          <button onClick={() => setShowPreview(true)} className="text-[10px] text-primary/70 hover:text-primary ml-1 mt-0.5">
            Show preview ↓
          </button>
        )}

        {/* Emoji sticker */}
        {!isUser && emojiPair.main && (
          <AnimatePresence>
            <motion.div key={`emoji-${message.id}`} initial={{ scale:0, opacity:0, y:6 }} animate={{ scale:1, opacity:1, y:0 }}
              transition={{ delay:0.28, type:'spring', stiffness:400, damping:22 }}
              className="flex items-center gap-1.5 ml-1">
              <DoraEmojiDisplay emoji={emojiPair.main} size={38} />
              {emojiPair.second && (
                <motion.div initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }}
                  transition={{ delay:0.44, type:'spring', stiffness:360, damping:20 }}>
                  <DoraEmojiDisplay emoji={emojiPair.second} size={32} />
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Action row */}
        <div className="flex items-center gap-0.5 px-1">
          <span className="text-[10px] text-muted-foreground/50 tabular-nums mr-1">{time}</span>
          <button onClick={copy} className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors" title="Copy">
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </button>
          {!isUser && (
            <button onClick={toggleSpeak} title={speaking ? 'Stop' : 'Read aloud'}
              className={cn('p-1 rounded transition-colors', speaking ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}>
              {speaking ? <VolumeX size={10} /> : <Volume2 size={10} />}
            </button>
          )}
          {!isUser && isLast && (
            <>
              <button onClick={() => giveFeedback('up')} disabled={!!feedback} title="Good response"
                className={cn('p-1 rounded transition-all', feedback === 'up' ? 'text-green-500' : 'text-muted-foreground/30 hover:text-green-400 disabled:opacity-40')}>
                <ThumbsUp size={10} />
              </button>
              <button onClick={() => giveFeedback('down')} disabled={!!feedback} title="Fewer emojis"
                className={cn('p-1 rounded transition-all', feedback === 'down' ? 'text-red-400' : 'text-muted-foreground/30 hover:text-red-400 disabled:opacity-40')}>
                <ThumbsDown size={10} />
              </button>
              <AnimatePresence>
                {feedback && (
                  <motion.span initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                    className="text-[9px] text-muted-foreground/50 italic ml-0.5">
                    {feedback === 'up' ? 'noted 🐾' : 'toning down…'}
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
