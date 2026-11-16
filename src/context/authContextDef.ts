import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { CsrProfile, UserRole } from '../types/database.types';

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
