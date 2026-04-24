/**
 * MiniDora v2 — Login Page
 *
 * Fixes vs v1:
 *  - "Try Demo" bypasses auth entirely (no fragile email/password pairing)
 *  - Footer no longer says "Powered by Gemini" (multi-tier system now)
 *  - signup mode validates name is required before submit
 *  - focus first input on mount
 *  - keyboard: Enter submits, Tab moves between fields naturally
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Bot, Sparkles, PlayCircle } from 'lucide-react';
import { useAuth }              from '@/contexts/AuthContext';
import { cn }                   from '@/lib/utils';
import doraWelcome              from '@/assets/dora-welcome.png';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const { login, signup, loginAsGuest } = useAuth();
  const navigate  = useNavigate();
  const emailRef  = useRef<HTMLInputElement>(null);

  const [mode,     setMode]   = useState<Mode>('login');
  const [name,     setName]   = useState('');
  const [email,    setEmail]  = useState('');
  const [password, setPw]     = useState('');
  const [showPw,   setShowPw] = useState(false);
  const [loading,  setLoading]= useState(false);
  const [error,    setError]  = useState('');

  // Focus email on mount & mode switch
  useEffect(() => { emailRef.current?.focus(); }, [mode]);

  const switchMode = (m: Mode) => {
    setMode(m); setError('');
    setName(''); setEmail(''); setPw('');
  };

  const submit = useCallback(async () => {
    setError('');
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return; }
    if (!email.trim())  { setError('Email is required'); return; }
    if (!password)      { setError('Password is required'); return; }

    setLoading(true);
    try {
      const r = mode === 'signup'
        ? await signup(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
      if (r.ok) navigate('/', { replace: true });
      else setError(r.error || 'Something went wrong. Please try again.');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, name, email, password, login, signup, navigate]);

  // Demo: guest session — no email/password needed
  const handleDemo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loginAsGuest();
      navigate('/', { replace: true });
    } catch {
      setError('Could not start demo. Please try creating an account.');
    } finally {
      setLoading(false);
    }
  }, [loginAsGuest, navigate]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) submit();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-auto">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] bg-primary/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">

          {/* Hero */}
          <div className="px-8 pt-8 pb-5 text-center bg-gradient-to-b from-primary/5 to-transparent">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" aria-hidden />
                <motion.img src={doraWelcome} alt="MiniDora"
                  className="relative w-20 h-20 object-contain drop-shadow-xl animate-float" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">MiniDora AI</h1>
            <p className="text-xs text-muted-foreground mt-1">Your companion from the 22nd century ✨</p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-border">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={cn('flex-1 py-3 text-sm font-medium transition-all focus-visible:outline-none',
                  mode === m
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground')}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-3">

            {/* Name field (signup only) */}
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div key="name-field"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}
                    placeholder="Your name" autoComplete="name" disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                ref={emailRef}
                type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
                placeholder="you@example.com" autoComplete="email" disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPw(e.target.value)} onKeyDown={onKey}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs"
                  role="alert"
                >
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={submit} disabled={loading}
              className="w-full py-2.5 rounded-xl dora-gradient text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Please wait…</>
                : mode === 'login'
                  ? <><Bot size={15} /> Sign In</>
                  : <><Sparkles size={15} /> Create Account</>
              }
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground/50">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Demo / guest */}
            <button
              onClick={handleDemo} disabled={loading}
              className="w-full py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/70 text-sm font-medium text-muted-foreground hover:text-foreground transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <PlayCircle size={15} className="text-primary" />
              Try Demo — no account needed
            </button>

            <p className="text-center text-[10px] text-muted-foreground/40 leading-relaxed">
              No email verification · Data stored on your device only
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/30 mt-3">
          MiniDora AI · Hybrid Local-First Intelligence
        </p>
      </motion.div>
    </div>
  );
}
