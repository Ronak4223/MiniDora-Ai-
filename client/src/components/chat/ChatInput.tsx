/**
 * MiniDora v2 — ChatInput
 *
 * - Auto-resize textarea (max 160px)
 * - Voice output toggle (TTS on/off)
 * - Voice input (SpeechRecognition) — checks inside component, not at module level
 * - Stop button replaces Send while AI is streaming
 * - Enter = send, Shift+Enter = newline
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, MicOff, Square, Radio } from 'lucide-react';
import { cn }            from '@/lib/utils';
import { stop as stopTTS } from '@/lib/voice';

interface Props {
  onSend:        (text: string) => void;
  onStop:        () => void;
  disabled:      boolean;
  voiceEnabled:  boolean;
  onToggleVoice: () => void;
}

// Check for SpeechRecognition inside the component to avoid SSR crashes
function getSR() {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      || null;
}

export default function ChatInput({ onSend, onStop, disabled, voiceEnabled, onToggleVoice }: Props) {
  const [text,      setText]      = useState('');
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const srRef       = useRef<SpeechRecognition | null>(null);
  const finalRef    = useRef('');    // stable ref for SR final transcript
  const hasSR       = !!getSR();

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  const handleSend = useCallback(() => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, disabled, onSend]);

  const stopRecording = useCallback(() => {
    srRef.current?.stop();
    srRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    stopTTS();

    finalRef.current = '';
    const sr = new (SR as new () => SpeechRecognition)();
    sr.continuous      = false;
    sr.interimResults  = true;
    sr.lang            = 'en-US';

    sr.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalRef.current += e.results[i][0].transcript;
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setText((finalRef.current || interim).trim());
      resize();
    };

    sr.onend = () => {
      setRecording(false);
      srRef.current = null;
      const final = finalRef.current.trim();
      if (final) {
        onSend(final);
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    };

    sr.onerror = () => {
      setRecording(false);
      srRef.current = null;
    };

    srRef.current = sr;
    sr.start();
    setRecording(true);
  }, [onSend, resize, stopRecording]);

  // Stop recording if AI starts streaming
  useEffect(() => {
    if (disabled && recording) stopRecording();
  }, [disabled, recording, stopRecording]);

  return (
    <div className="glass-surface border-t px-3 py-3 shrink-0">
      <div className={cn(
        'max-w-2xl mx-auto flex items-end gap-2 bg-background border rounded-2xl px-3 py-2 transition-all',
        'focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40',
        recording && 'ring-2 ring-red-400/40 border-red-400/40',
        disabled && !recording && 'opacity-70'
      )}>
        {/* TTS toggle */}
        <button
          type="button"
          onClick={() => { stopTTS(); onToggleVoice(); }}
          className={cn(
            'p-1.5 rounded-xl transition-all active:scale-90 shrink-0 mb-0.5',
            voiceEnabled
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'
          )}
          title={voiceEnabled ? 'Voice output ON — click to turn off' : 'Voice output OFF — click to enable'}
          aria-label={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
        >
          {voiceEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); resize(); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          disabled={disabled}
          placeholder={
            recording  ? '🎤 Listening… speak now' :
            disabled   ? 'MiniDora is thinking…'   :
            'Message MiniDora… (Shift+Enter for new line)'
          }
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none leading-relaxed py-1 min-w-0 max-h-40 overflow-y-auto"
          style={{ height: 'auto' }}
        />

        {/* Right buttons */}
        <div className="flex items-center gap-1 shrink-0 mb-0.5">
          {/* Voice input */}
          {hasSR && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={disabled}
              className={cn(
                'p-1.5 rounded-xl transition-all active:scale-90',
                recording
                  ? 'text-white bg-red-500 shadow-md animate-pulse'
                  : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted disabled:opacity-30'
              )}
              title={recording ? 'Stop recording' : 'Voice input (mic)'}
              aria-label={recording ? 'Stop recording' : 'Start voice input'}
            >
              <Radio size={15} />
            </button>
          )}

          {/* Stop / Send */}
          {disabled ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-90"
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className={cn(
                'p-2 rounded-xl transition-all active:scale-90',
                text.trim()
                  ? 'dora-gradient text-white shadow-sm hover:opacity-90'
                  : 'text-muted-foreground/20 cursor-not-allowed'
              )}
              title="Send message"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/35 mt-1.5 hidden sm:block">
        Enter to send · Shift+Enter for new line{hasSR ? ' · 📻 Radio button for voice input' : ''}
      </p>
    </div>
  );
}
