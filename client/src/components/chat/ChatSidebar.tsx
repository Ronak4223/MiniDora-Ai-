/**
 * MiniDora v2 — ChatSidebar
 * Slide-in on mobile, always visible on lg+.
 * Double-click a title to rename inline.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MessageSquare, Search, X } from 'lucide-react';
import { cn }                from '@/lib/utils';
import type { Conversation } from '@/hooks/useChat';
import doraIcon              from '@/assets/dora-icon.png';

interface Props {
  convos:   Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew:    () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  open:     boolean;
  onClose:  () => void;
}

export default function ChatSidebar({ convos, activeId, onSelect, onNew, onDelete, onRename, open, onClose }: Props) {
  const [search,  setSearch]  = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const filtered = convos.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const commitEdit = (id: string) => {
    if (editVal.trim()) onRename(id, editVal.trim());
    setEditing(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="fixed lg:relative lg:!transform-none inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r border-border lg:translate-x-0"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border shrink-0">
          <img src={doraIcon} alt="MiniDora" className="w-7 h-7 rounded-lg shrink-0" />
          <span className="font-bold text-sm text-foreground flex-1 min-w-0 truncate">MiniDora</span>
          <button onClick={onClose} className="icon-btn lg:hidden shrink-0" aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-3 shrink-0">
          <button
            onClick={() => { onNew(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl dora-gradient text-white text-sm font-medium hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-2 shrink-0">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground/50 hover:text-muted-foreground">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? 'No chats match your search' : 'No chats yet — start one!'}
            </p>
          )}

          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(c => {
              const isActive = c.id === activeId;
              return (
                <motion.div
                  key={c.id} layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border',
                    isActive
                      ? 'bg-primary/10 border-primary/20'
                      : 'border-transparent hover:bg-muted hover:border-border/50'
                  )}
                  onClick={() => { if (editing !== c.id) { onSelect(c.id); onClose(); } }}
                >
                  <MessageSquare
                    size={14}
                    className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                  />

                  {editing === c.id ? (
                    <input
                      autoFocus
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(c.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { e.preventDefault(); commitEdit(c.id); }
                        if (e.key === 'Escape') { setEditing(null); }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent text-xs text-foreground focus:outline-none min-w-0"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => { setEditing(c.id); setEditVal(c.title); }}
                      className="flex-1 text-xs text-foreground/80 truncate min-w-0 select-none"
                    >
                      {c.title}
                    </span>
                  )}

                  <button
                    onClick={e => { e.stopPropagation(); onDelete(c.id); }}
                    className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border shrink-0">
          <p className="text-[10px] text-muted-foreground/40 text-center">
            Double-click a chat title to rename
          </p>
        </div>
      </motion.aside>
    </>
  );
}
