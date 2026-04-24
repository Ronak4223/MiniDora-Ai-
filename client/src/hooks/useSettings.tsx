import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { VoicePreset } from '@/lib/voice';

export interface Settings {
  character:    string;
  voiceEnabled: boolean;
  voicePreset:  VoicePreset;
  voiceRate:    number;
  voicePitch:   number;
  theme:        'light' | 'dark' | 'system';
  userName:     string;
}

const DEFAULTS: Settings = {
  character: 'minidora', voiceEnabled: false, voicePreset: 'soft',
  voiceRate: 1, voicePitch: 1.1, theme: 'system', userName: '',
};

interface Ctx { settings: Settings; update: (p: Partial<Settings>) => void; }
const Ctx = createContext<Ctx>({ settings: DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem('minidora-settings');
      if (!raw) return DEFAULTS;
      const p = JSON.parse(raw);
      // Strip stale 'provider' field if present from v1
      const { provider: _p, ...rest } = p;
      return { ...DEFAULTS, ...rest };
    } catch { return DEFAULTS; }
  });

  useEffect(() => { localStorage.setItem('minidora-settings', JSON.stringify(settings)); }, [settings]);
  const update = useCallback((p: Partial<Settings>) => setSettings(prev => ({ ...prev, ...p })), []);
  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
