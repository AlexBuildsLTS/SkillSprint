import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../supabase/database.types';

type UserProfile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface AuthUser extends SupabaseUser {
  profile: UserProfile | null;
  stats: UserStats | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFullUserData = useCallback(async (userId: string) => {
    try {
      // Parallel fetch for performance
      const [profileRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(), // Use maybeSingle to prevent throw on null
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      return { profile: profileRes.data, stats: statsRes.data };
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      return { profile: null, stats: null };
    }
  }, []);

  const initializeAuth = useCallback(
    async (currentSession: Session | null) => {
      setSession(currentSession);

      if (currentSession?.user) {
        const { profile, stats } = await fetchFullUserData(
          currentSession.user.id,
        );
        setUser({ ...currentSession.user, profile, stats });
      } else {
        setUser(null);
      }

      setLoading(false);
    },
    [fetchFullUserData],
  );

  useEffect(() => {
    // 1. Initial Load
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      initializeAuth(initSession);
    });

    // 2. Real-time Subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
      } else if (newSession?.user.id !== session?.user.id) {
        setLoading(true);
        initializeAuth(newSession);
      }
    });

    return () => subscription.unsubscribe();
  }, [initializeAuth, session?.user.id]);

  const value = {
    user,
    session,
    loading,
    signIn: async (e: string, p: string) => {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });
      if (error) {
        setLoading(false);
        throw error;
      }
    },
    signOut: async () => {
      setLoading(true);
      await supabase.auth.signOut();
      // State updates handled by onAuthStateChange
    },
    refreshUserData: async () => {
      if (session?.user.id) {
        const { profile, stats } = await fetchFullUserData(session.user.id);
        setUser((prev) => (prev ? { ...prev, profile, stats } : null));
      }
    },
    isAuthenticated: !!session,
    isAdmin: user?.profile?.role === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
