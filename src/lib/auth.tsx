import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type UserProfile, type UserRole } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    fullName: string,
    extra?: Record<string, unknown>
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) {
        console.error('Profile fetch error:', error.message);
      }
      setProfile(data as UserProfile | null);
      setLoading(false);
    })();
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    fullName: string,
    extra?: Record<string, unknown>
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (!userId) return { error: 'Sign-up failed — no user returned.' };

    const { error: profileErr } = await supabase.from('user_profiles').insert({
      user_id: userId,
      role,
      email,
      full_name: fullName,
    });
    if (profileErr) return { error: profileErr.message };

    if (role === 'student') {
      const { error: sErr } = await supabase.from('students').insert({
        id: userId,
        roll_no: extra?.roll_no as string,
        name: fullName,
        email,
        phone: extra?.phone as string,
        department_id: extra?.department_id as string,
        year_of_study: 4,
        tenth_percentage: extra?.tenth_percentage as number,
        twelfth_percentage: extra?.twelfth_percentage as number,
        cgpa: extra?.cgpa as number,
        skills: extra?.skills as string,
      });
      if (sErr) return { error: sErr.message };
    } else if (role === 'company') {
      const { error: cErr } = await supabase.from('companies').insert({
        id: userId,
        name: fullName,
        email,
        contact_person: extra?.contact_person as string,
        contact_phone: extra?.contact_phone as string,
        website: extra?.website as string,
        address: extra?.address as string,
        description: extra?.description as string,
      });
      if (cErr) return { error: cErr.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role: profile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
