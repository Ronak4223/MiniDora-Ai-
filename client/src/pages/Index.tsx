/**
 * MiniDora v2 — Main Page
 */

import { useState, useCallback } from 'react';
import { useChat }       from '@/hooks/useChat';
import { useSettings }   from '@/hooks/useSettings';
import ChatHeader        from '@/components/chat/ChatHeader';
import ChatMessages      from '@/components/chat/ChatMessages';
import ChatInput         from '@/components/chat/ChatInput';
import ChatSidebar       from '@/components/chat/ChatSidebar';
import SettingsModal     from '@/components/chat/SettingsModal';
import { toast }         from 'sonner';

export default function Index() {
  const {
    messages, typing, send, stop, loaded,
    convos, activeId, newChat, selectConvo, renameConvo, deleteConvo,
    currentEmotion, mascotState, isOfflineMode,
  } = useChat();

  const { settings, update } = useSettings();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const exportChat = useCallback(() => {
    if (messages.length < 2) { toast.info('Nothing to export yet'); return; }
    const lines = messages.map(m =>
      `[${new Date(m.timestamp).toLocaleString()}] ${m.role === 'user' ? 'You' : 'MiniDora'}:\n${m.content}`
    );
    const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `minidora-${new Date().toISOString().slice(0, 10)}.txt` });
    a.click(); URL.revokeObjectURL(url);
    toast.success('Chat exported 📁');
  }, [messages]);

  if (!loaded) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl dora-gradient animate-pulse-soft shadow-lg" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ChatSidebar
        convos={convos} activeId={activeId}
        onSelect={id => { selectConvo(id); setSidebarOpen(false); }}
        onNew={() => { newChat(); setSidebarOpen(false); }}
        onDelete={deleteConvo} onRename={renameConvo}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <ChatHeader
          onMenu={() => setSidebarOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onExport={exportChat}
          currentEmotion={currentEmotion}
          mascotState={mascotState}
          isOfflineMode={isOfflineMode}
        />
        <ChatMessages messages={messages} typing={typing} onSuggestion={send} />
        <ChatInput
          onSend={send} onStop={stop} disabled={typing}
          voiceEnabled={settings.voiceEnabled}
          onToggleVoice={() => update({ voiceEnabled: !settings.voiceEnabled })}
        />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
