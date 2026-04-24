/**
 * MiniDora v2 — AuthContext
 *
 * Purely local auth — no backend dependency.
 * Accounts stored in localStorage with SHA-256 password hashing.
 *
 * Added: loginAsGuest() — creates an ephemeral guest session,
 * no password, no account record. Used by Demo button.
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface User {
  id:     string;
  name:   string;
  email:  string;
  avatar: string;
  guest?: boolean;
}

interface Ctx {
  user:          User | null;
  isLoading:     boolean;
  login:         (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup:        (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginAsGuest:  () => Promise<void>;
  logout:        () => void;
}

const AuthContext = createContext<Ctx>({
  user: null, isLoading: true,
  login:        async () => ({ ok: false }),
  signup:       async () => ({ ok: false }),
  loginAsGuest: async () => {},
  logout:       () => {},
});

const AVATARS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-green-500 to-teal-400',
  'from-orange-500 to-red-400',
];
const getAvatar = (name: string) => AVATARS[name.charCodeAt(0) % AVATARS.length];

async function hashPassword(pw: string): Promise<string> {
  try {
    const enc  = new TextEncoder().encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  } catch {
    // Fallback for environments without subtle crypto
    return btoa(unescape(encodeURIComponent(pw)));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('minidora-session');
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        if (parsed?.id) setUser(parsed);
      }
    } catch { /* corrupt — ignore */ }
    setIsLoading(false);
  }, []);

  const saveSession = (u: User) => {
    setUser(u);
    localStorage.setItem('minidora-session', JSON.stringify(u));
  };

  // ── Guest / Demo login (no account needed) ──────────────────
  const loginAsGuest = useCallback(async () => {
    const guest: User = {
      id:     'guest-' + crypto.randomUUID().slice(0, 8),
      name:   'Guest',
      email:  '',
      avatar: 'from-primary to-accent',
      guest:  true,
    };
    saveSession(guest);
  }, []);

  // ── Signup ───────────────────────────────────────────────────
  const signup = useCallback(async (name: string, email: string, password: string) => {
    const trimName  = name.trim();
    const trimEmail = email.trim().toLowerCase();

    if (!trimName)                               return { ok: false, error: 'Name is required' };
    if (!trimEmail.includes('@'))                return { ok: false, error: 'Enter a valid email address' };
    if (password.length < 6)                     return { ok: false, error: 'Password must be at least 6 characters' };

    const key = `minidora-user-${trimEmail}`;
    if (localStorage.getItem(key))               return { ok: false, error: 'An account with this email already exists' };

    try {
      const pw = await hashPassword(password);
      const u: User = { id: crypto.randomUUID(), name: trimName, email: trimEmail, avatar: getAvatar(trimName) };
      localStorage.setItem(key, JSON.stringify({ ...u, pw }));
      saveSession(u);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sign up failed. Please try again.' };
    }
  }, []);

  // ── Login ────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || !password) return { ok: false, error: 'Email and password are required' };

    const raw = localStorage.getItem(`minidora-user-${trimEmail}`);
    if (!raw) return { ok: false, error: 'No account found with this email' };

    try {
      const stored = JSON.parse(raw);
      const pw     = await hashPassword(password);
      if (stored.pw !== pw) return { ok: false, error: 'Incorrect password' };
      const { pw: _, ...u } = stored;
      saveSession(u as User);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Login failed. Please try again.' };
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('minidora-session');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
