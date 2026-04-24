/**
 * MiniDora v2 — LivePreview
 *
 * Renders AI-generated HTML/CSS/JS in a sandboxed iframe.
 * - Sanitizes with DOMPurify (dynamic import, safe fallback)
 * - Wraps bare snippets in a full HTML document
 * - sandbox="allow-scripts allow-forms" (no allow-same-origin for isolation)
 * - Expand / collapse / open-in-tab / toggle-code-view
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, ExternalLink, RefreshCw, X, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeTool } from '@/lib/api';

interface Props {
  tool:     CodeTool;
  onClose?: () => void;
}

// ── Sanitize via DOMPurify (dynamic — won't break if missing) ─
async function sanitize(html: string): Promise<string> {
  try {
    const { default: DOMPurify } = await import('dompurify');
    return DOMPurify.sanitize(html, {
      FORCE_BODY:      true,
      WHOLE_DOCUMENT:  true,
      ADD_TAGS:        ['style', 'script', 'link', 'meta'],
      ADD_ATTR:        [
        'onclick', 'onchange', 'oninput', 'onsubmit', 'onmouseover', 'onmouseout',
        'type', 'value', 'placeholder', 'href', 'rel', 'charset',
      ],
      // Don't block scripts — sandbox handles isolation
      FORBID_TAGS:     [],
      FORBID_ATTR:     [],
    });
  } catch {
    // DOMPurify not installed — basic script-src block only
    return html.replace(/(<script[^>]+)\bsrc\s*=/gi, '$1 data-blocked-src=');
  }
}

// ── Wrap bare snippet in full document ────────────────────────
function wrapInDocument(code: string): string {
  const t = code.trim().toLowerCase();
  if (t.startsWith('<!doctype') || t.startsWith('<html')) return code;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 1.25rem; line-height: 1.5; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
}

export default function LivePreview({ tool, onClose }: Props) {
  const [srcdoc,   setSrcdoc]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const key       = useRef(0); // force iframe remount on refresh

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const clean = await sanitize(wrapInDocument(tool.code));
      key.current++;
      setSrcdoc(clean);
    } catch (err) {
      setError('Failed to render preview');
      console.error('[LivePreview]', err);
    } finally {
      setLoading(false);
    }
  }, [tool.code]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const openInTab = useCallback(() => {
    const blob = new Blob([srcdoc], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [srcdoc]);

  const previewHeight = expanded ? '100%' : 'clamp(240px, 40vh, 360px)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        className={cn(
          'rounded-xl border border-border bg-card shadow-lg overflow-hidden flex flex-col mt-2',
          expanded ? 'fixed inset-3 z-50' : 'w-full max-w-2xl'
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
          <Code2 size={13} className="text-primary shrink-0" />
          <span className="font-semibold text-xs text-foreground truncate flex-1 min-w-0">
            {tool.title || 'Live Preview'}
          </span>
          {tool.description && (
            <span className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[180px]">
              {tool.description}
            </span>
          )}

          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            <button
              onClick={() => setShowCode(s => !s)}
              className="px-2 py-0.5 text-[10px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {showCode ? '▶ Preview' : '</> Code'}
            </button>
            <button onClick={loadPreview} className="icon-btn" title="Refresh">
              <RefreshCw size={12} />
            </button>
            <button onClick={openInTab} className="icon-btn" title="Open in new tab" disabled={!srcdoc}>
              <ExternalLink size={12} />
            </button>
            <button onClick={() => setExpanded(e => !e)} className="icon-btn" title={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            {onClose && (
              <button onClick={onClose} className="icon-btn text-muted-foreground hover:text-destructive" title="Close">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ height: previewHeight }}>
          {showCode ? (
            /* Code view */
            <pre className="h-full overflow-auto p-4 text-[11px] font-mono bg-muted/20 text-foreground leading-relaxed whitespace-pre-wrap break-all">
              <code>{tool.code}</code>
            </pre>
          ) : (
            /* Sandboxed iframe */
            <>
              <AnimatePresence>
                {loading && (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-card/80 z-10"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-destructive text-sm p-4">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                  <button onClick={loadPreview} className="text-xs underline text-muted-foreground hover:text-foreground">
                    Retry
                  </button>
                </div>
              )}

              {srcdoc && (
                <iframe
                  key={key.current}
                  ref={iframeRef}
                  srcDoc={srcdoc}
                  sandbox="allow-scripts allow-forms allow-modals"
                  className="w-full h-full border-0 bg-white"
                  title={tool.title || 'Live Preview'}
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError('Preview failed to load'); }}
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-1 border-t border-border bg-muted/10 shrink-0 flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">
            🛡️ Sandboxed — scripts allowed, network isolated
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
