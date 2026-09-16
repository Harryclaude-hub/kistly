import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, errText } from './supabase'
import type { Profile } from './types'

interface AuthValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_path'>>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.warn('[auth] Profil konnte nicht geladen werden:', error.message)
      return
    }
    if (data) {
      setProfile(data as Profile)
      return
    }
    // Der Trigger legt das Profil an. Fehlt es trotzdem, hier nachziehen,
    // statt die App ohne Profil weiterlaufen zu lassen.
    const { data: created } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select('*')
      .maybeSingle()
    if (created) setProfile(created as Profile)
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
      if (data.session?.user) void loadProfile(data.session.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) void loadProfile(next.user.id)
      else setProfile(null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      ready,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(errText(error))
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: displayName?.trim() ? { display_name: displayName.trim() } : undefined,
            emailRedirectTo: `${location.origin}/login`,
          },
        })
        if (error) throw new Error(errText(error))
        // Ohne Session heisst: das Projekt verlangt noch eine Bestaetigung.
        return { needsConfirm: !data.session }
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(errText(error))
      },
      async sendReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/passwort-neu`,
        })
        if (error) throw new Error(errText(error))
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(errText(error))
      },
      async updateProfile(patch) {
        if (!session?.user) throw new Error('Nicht angemeldet')
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select('*')
          .single()
        if (error) throw new Error(errText(error))
        setProfile(data as Profile)
      },
      async refreshProfile() {
        if (session?.user) await loadProfile(session.user.id)
      },
    }),
    [session, profile, ready, loadProfile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth ausserhalb von AuthProvider benutzt')
  return v
}

export function displayNameOf(p: Profile | null | undefined, fallback = 'Unbekannt'): string {
  if (!p) return fallback
  return p.display_name?.trim() || p.email?.split('@')[0] || fallback
}
