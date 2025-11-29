import { User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  status?: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
}

export type SupabaseUser = User;
