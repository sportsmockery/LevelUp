'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface Profile {
  id: string;
  role: 'parent' | 'coach' | 'athlete' | 'org_admin' | 'trainer';
  full_name: string | null;
  club_id: string | null;
  level: number;
  xp: number;
  streak: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    role: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /* --- fetch profile from profiles table --- */
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
    }
  }, []);

  /* --- listen for auth state changes --- */
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: any } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, s: any) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  /* --- sign up --- */
  const signUp = async (
    email: string,
    password: string,
    role: string,
    fullName: string,
  ) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: fullName },
      },
    });

    if (error) return { error: error.message };

    // Update profile with role and name (trigger creates the row)
    if (data.user) {
      // Small delay to let the trigger fire
      await new Promise((r) => setTimeout(r, 500));

      await supabase
        .from('profiles')
        .update({ role, full_name: fullName })
        .eq('id', data.user.id);

      await fetchProfile(data.user.id);
    }

    return { error: null };
  };

  /* --- sign in --- */
  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };
    return { error: null };
  };

  /* --- sign out --- */
  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  /* --- refresh profile --- */
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
