import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CsrProfile, UserRole } from '../types/database.types';

interface AuthContextType {
  user: User | null;
  profile: CsrProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isMember: boolean;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; requiresVerification?: boolean; email?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CsrProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(currentUser: User | null): Promise<CsrProfile | null> {
    if (!currentUser || !isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('csr_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch user profile:', error.message);
        return null;
      }

      if (data) {
        return data as CsrProfile;
      }

      // If user exists in auth.users but no profile in csr_profiles, create one
      const newProfile: Partial<CsrProfile> = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Member',
        role: (currentUser.user_metadata?.role as UserRole) || 'member',
      };

      const { data: inserted, error: insertError } = await supabase
        .from('csr_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (insertError) {
        console.warn('Could not auto-create profile:', insertError.message);
        return null;
      }

      return inserted as CsrProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }

  async function refreshProfile() {
    if (!user) {
      setProfile(null);
      return;
    }
    const prof = await fetchProfile(user);
    setProfile(prof);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser).then(p => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const p = await fetchProfile(currentUser);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { error: 'Email not verified yet. Please check your inbox or click "Resend Verification Email".' };
      }
      return { error: error.message };
    }
    return {};
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured yet. Add credentials to your .env file.' };
    }

    const cleanEmail = email.trim();
    const redirectTo = `${window.location.origin}/login`;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        return {
          error: 'Email rate limit reached for testing. Please wait a few minutes before trying again, or check your spam/junk folder for an earlier email.',
        };
      }
      return { error: error.message };
    }

    // Supabase security feature: empty identities array means user already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        error: 'An account with this email address already exists. Please switch to Sign In or reset your password.',
      };
    }

    // If session is null, email confirmation is active and required
    const requiresVerification = !data.session;

    return {
      requiresVerification,
      email: data.user?.email || cleanEmail,
    };
  };

  const resendVerification = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured.' };
    }

    const cleanEmail = email.trim();
    const redirectTo = `${window.location.origin}/login`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        return { error: 'Too many requests. Please wait a minute before requesting another verification email.' };
      }
      return { error: error.message };
    }

    return {};
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return {};
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    setUser(null);
    setProfile(null);
    return {};
  };

  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';
  const isMember = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isMember,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        resendVerification,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
