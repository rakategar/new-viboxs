import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { rpc, sb, type Me, type Role } from './sb';

type AuthState = {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  error: string;
  /** Assurance level sesi (MFA). next=aal2 & current=aal1 → akun punya authenticator tapi sesi belum diverifikasi. */
  aal: { current: string | null; next: string | null } | null;
  refreshAal: () => Promise<void>;
  refresh: () => Promise<Me | null>;
  switchRole: (r: Role) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

/** Peran aktif sah — dipakai halaman untuk tampilan; server tetap memeriksa ulang setiap kueri. */
export const useRole = () => useAuth().me?.active_role ?? null;

const PENDING_INVITE = 'viboxs-studio-invite';
export const rememberInvite = (t: string) => { try { sessionStorage.setItem(PENDING_INVITE, t); } catch { /* storage diblokir */ } };
export const takeInvite = () => { try { const t = sessionStorage.getItem(PENDING_INVITE); sessionStorage.removeItem(PENDING_INVITE); return t; } catch { return null; } };
export const peekInvite = () => { try { return sessionStorage.getItem(PENDING_INVITE); } catch { return null; } };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [aal, setAal] = useState<AuthState['aal']>(null);
  const uid = useRef<string | null>(null);

  const refreshAal = useCallback(async () => {
    const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    setAal(data ? { current: data.currentLevel, next: data.nextLevel } : null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await rpc<Me>('st_bootstrap');
      setMe(m); setError('');
      return m;
    } catch (e) {
      setError((e as Error).message); setMe(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      uid.current = data.session?.user.id ?? null;
      if (data.session) await Promise.all([refresh(), refreshAal()]);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      const next = s?.user.id ?? null;
      if (next !== uid.current) {
        uid.current = next;
        if (next) { setReady(false); Promise.all([refresh(), refreshAal()]).finally(() => setReady(true)); } else { setMe(null); setAal(null); }
      } else if (s) refreshAal();
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [refresh, refreshAal]);

  const switchRole = useCallback(async (r: Role) => {
    await rpc('st_switch_role', { p_role: r });
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => { await sb.auth.signOut(); setMe(null); }, []);

  return <Ctx.Provider value={{ ready, session, me, error, aal, refreshAal, refresh, switchRole, signOut }}>{children}</Ctx.Provider>;
}
