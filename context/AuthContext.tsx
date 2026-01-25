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
type UserRole = Database['public']['Enums']['user_role'];

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
    // Single query join to minimize network roundtrips
    const [profileRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_stats').select('*').eq('user_id', userId).single(),
    ]);

    return {
      profile: profileRes.data,
      stats: statsRes.data,
    };
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!session?.user.id) return;
    const { profile, stats } = await fetchFullUserData(session.user.id);
    setUser((prev) => (prev ? { ...prev, profile, stats } : null));
  }, [session, fetchFullUserData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFullUserData(session.user.id).then(({ profile, stats }) => {
          setUser({ ...session.user, profile, stats });
        });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, _session) => {
      setSession(_session);
      if (_session) {
        const { profile, stats } = await fetchFullUserData(_session.user.id);
        setUser({ ..._session.user, profile, stats });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchFullUserData]);

  const value = {
    user,
    session,
    loading,
    signIn: (e: string, p: string) =>
      supabase.auth
        .signInWithPassword({ email: e, password: p })
        .then(() => {}),
    signOut: () => supabase.auth.signOut().then(() => {}),
    refreshUserData,
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
