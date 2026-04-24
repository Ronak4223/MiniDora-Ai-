/**
 * Voice system — browser SpeechSynthesis only.
 * No backend dependency. Works offline.
 * 3 presets: Soft, Energetic, Deep
 */

export type VoicePreset = 'soft' | 'energetic' | 'deep';

interface Preset { rate: number; pitch: number; volume: number; preferredNames: string[] }

const PRESETS: Record<VoicePreset, Preset> = {
  soft: {
    rate: 0.85,
    pitch: 1.35,
    volume: 0.85,
    preferredNames: ['samantha', 'karen', 'moira', 'tessa', 'female'],
  },
  energetic: {
    rate: 1.15,
    pitch: 1.2,
    volume: 0.95,
    preferredNames: ['zira', 'hazel', 'victoria'],
  },
  deep: {
    rate: 0.8,
    pitch: 0.75,
    volume: 0.9,
    preferredNames: ['daniel', 'alex', 'male', 'david'],
  },
};

let voicesReady = false;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { voicesReady = true; return Promise.resolve(voices); }
  if (voicesReady) return Promise.resolve(voices);
  return new Promise(resolve => {
    window.speechSynthesis.onvoiceschanged = () => {
      voicesReady = true;
      resolve(window.speechSynthesis.getVoices());
    };
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 600);
  });
}

function sanitize(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[#>*_`~\[\]()]/g, '')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function speak(
  text: string,
  preset: VoicePreset = 'soft',
  rate?: number,
  pitch?: number,
): Promise<void> {
  stop();
  if (!('speechSynthesis' in window)) return;

  const clean = sanitize(text);
  if (!clean) return;

  const cfg    = PRESETS[preset];
  const voices = await loadVoices();

  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate   = rate  ?? cfg.rate;
  utter.pitch  = pitch ?? cfg.pitch;
  utter.volume = cfg.volume;

  // Try to find a preferred voice for the preset
  const matched =
    voices.find(v => cfg.preferredNames.some(n => v.name.toLowerCase().includes(n))) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  if (matched) utter.voice = matched;

  utter.onerror = () => { /* ignore */ };
  window.speechSynthesis.speak(utter);
}

export function stop(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}

export async function previewVoice(preset: VoicePreset): Promise<void> {
  await speak('Hi! This is how I sound as your MiniDora AI companion!', preset);
}
