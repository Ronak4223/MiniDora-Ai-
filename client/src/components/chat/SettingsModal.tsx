/**
 * MiniDora v2 — Settings Modal
 * Tabs: Characters · Voice · Theme · Profile
 * (Provider tab removed — multi-tier is fully automatic)
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bot, Mic, Palette, User } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useTheme }    from 'next-themes';
import { previewVoice } from '@/lib/voice';
import { cn } from '@/lib/utils';

interface Props { open: boolean; onClose: () => void; }

const CHARACTERS = [
  { id:'minidora', name:'MiniDora', emoji:'🤖', description:'Friendly robotic companion from the future' },
  { id:'sparky',   name:'Sparky',   emoji:'⚡', description:'Upbeat, energetic, enthusiastic friend' },
  { id:'serene',   name:'Serene',   emoji:'🌿', description:'Calm, gentle, deeply supportive' },
  { id:'sage',     name:'Sage',     emoji:'🦉', description:'Philosophical thinker with deep wisdom' },
  { id:'byte',     name:'Byte',     emoji:'💻', description:'Senior dev — precise, clean, practical' },
  { id:'atlas',    name:'Atlas',    emoji:'💼', description:'Formal, structured, business expert' },
  { id:'jinx',     name:'Jinx',     emoji:'😏', description:'Witty, dry, entertainingly sharp' },
  { id:'bloom',    name:'Bloom',    emoji:'💗', description:'Emotionally intelligent, empathetic' },
  { id:'fable',    name:'Fable',    emoji:'📖', description:'Creative storyteller, vivid imagination' },
  { id:'blaze',    name:'Blaze',    emoji:'🔥', description:'Motivational coach who drives action' },
  { id:'nova',     name:'Nova',     emoji:'🎓', description:'Patient tutor who teaches step-by-step' },
  { id:'zero',     name:'Zero',     emoji:'⚫', description:'Ultra-concise — just the answer' },
] as const;

const CHAR_COLORS: Record<string, string> = {
  minidora:'#3b82f6', sparky:'#f59e0b', serene:'#10b981', sage:'#8b5cf6',
  byte:'#6b7280',     atlas:'#4b5563',  jinx:'#ec4899',   bloom:'#f43f5e',
  fable:'#d97706',    blaze:'#ef4444',  nova:'#0ea5e9',   zero:'#71717a',
};

const VOICE_PRESETS = [
  { id:'soft',      label:'Soft',      desc:'Gentle, warm, slightly high-pitched' },
  { id:'energetic', label:'Energetic', desc:'Upbeat, faster, cheerful' },
  { id:'deep',      label:'Deep',      desc:'Lower pitch, slow and calm' },
] as const;

const THEMES = [
  { id:'light',  label:'Light',  desc:'Clean bright interface',    emoji:'☀️' },
  { id:'dark',   label:'Dark',   desc:'Easy on the eyes at night', emoji:'🌙' },
  { id:'system', label:'System', desc:'Follows your OS preference',emoji:'💻' },
] as const;

const TABS = [
  { id:'characters', label:'Characters', Icon: Bot },
  { id:'voice',      label:'Voice',      Icon: Mic },
  { id:'appearance', label:'Theme',      Icon: Palette },
  { id:'profile',    label:'Profile',    Icon: User },
];

export default function SettingsModal({ open, onClose }: Props) {
  const { settings, update } = useSettings();
  const { setTheme }         = useTheme();
  const [tab, setTab]        = useState('characters');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity:0, scale:0.94, y:16 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.94, y:16 }}
              transition={{ type:'spring', stiffness:420, damping:34 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h2 className="font-bold text-foreground">Settings</h2>
                <button onClick={onClose} className="icon-btn"><X size={18} /></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 pt-3 pb-1 shrink-0 overflow-x-auto">
                {TABS.map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0',
                      tab === id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

                {tab === 'characters' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CHARACTERS.map(c => {
                      const active = settings.character === c.id;
                      return (
                        <button key={c.id} onClick={() => update({ character: c.id })}
                          className={cn('relative p-3 rounded-xl border text-left transition-all active:scale-[0.97] overflow-hidden',
                            active ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted')}>
                          <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl" style={{ background: CHAR_COLORS[c.id] }} />
                          <div className="text-2xl mb-1.5 mt-1 leading-none">{c.emoji}</div>
                          <div className="text-xs font-semibold text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{c.description}</div>
                          {active && <span className="absolute top-2.5 right-2 w-2 h-2 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {tab === 'voice' && (
                  <div className="space-y-4">
                    {/* TTS toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted border border-border/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">Voice Responses (TTS)</p>
                        <p className="text-xs text-muted-foreground">AI reads replies aloud via browser</p>
                      </div>
                      <button onClick={() => update({ voiceEnabled: !settings.voiceEnabled })}
                        className={cn('w-11 h-6 rounded-full transition-all relative shrink-0', settings.voiceEnabled ? 'bg-primary' : 'bg-border')}>
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', settings.voiceEnabled ? 'left-6' : 'left-1')} />
                      </button>
                    </div>

                    {/* Preset */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Voice Style</p>
                      {VOICE_PRESETS.map(p => (
                        <button key={p.id} onClick={() => update({ voicePreset: p.id })}
                          className={cn('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98]',
                            settings.voicePreset === p.id ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted')}>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{p.label}</p>
                            <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                          </div>
                          {settings.voicePreset === p.id && <span className="text-primary shrink-0">✓</span>}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Speed — {settings.voiceRate.toFixed(1)}×</label>
                      <input type="range" min="0.5" max="2" step="0.1" value={settings.voiceRate}
                        onChange={e => update({ voiceRate: parseFloat(e.target.value) })}
                        className="w-full accent-primary h-1.5 rounded-full" />
                      <div className="flex justify-between text-[10px] text-muted-foreground/50"><span>0.5× slow</span><span>2× fast</span></div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Pitch — {settings.voicePitch.toFixed(1)}</label>
                      <input type="range" min="0.5" max="2" step="0.1" value={settings.voicePitch}
                        onChange={e => update({ voicePitch: parseFloat(e.target.value) })}
                        className="w-full accent-primary h-1.5 rounded-full" />
                    </div>

                    <button onClick={() => previewVoice(settings.voicePreset)}
                      className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-all active:scale-[0.98]">
                      🔊 Preview Voice
                    </button>

                    <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                        🎤 Voice Input
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 border border-green-500/20 font-medium">Built-in</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Click the radio button in the chat input to speak. Auto-sends when you stop. Works in Chrome, Edge, Safari.</p>
                    </div>
                  </div>
                )}

                {tab === 'appearance' && (
                  <div className="space-y-2">
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => { setTheme(t.id); update({ theme: t.id }); }}
                        className={cn('w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.98]',
                          settings.theme === t.id ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted')}>
                        <span className="text-xl">{t.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.label} Mode</p>
                          <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                        </div>
                        {settings.theme === t.id && <span className="ml-auto text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {tab === 'profile' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Your Name</label>
                      <input value={settings.userName} onChange={e => update({ userName: e.target.value })}
                        placeholder="Enter your name…"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                    <div className="p-3 rounded-xl bg-muted/60 border border-border/50 space-y-1">
                      <p className="text-[11px] text-muted-foreground">✅ All data stored locally on your device</p>
                      <p className="text-[11px] text-muted-foreground">✅ No external tracking or cloud accounts</p>
                      <p className="text-[11px] text-muted-foreground">✅ Chat history persists between sessions</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/60 border border-border/50">
                      <p className="text-xs font-medium text-foreground mb-1.5">AI Tier Status</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        MiniDora automatically routes through vLLM → Ollama → OpenRouter/Gemini → Offline.
                        Configure tiers in <code className="bg-background px-1 rounded">server/.env</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
