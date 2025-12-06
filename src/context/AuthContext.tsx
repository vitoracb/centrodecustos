import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabaseClient';
import { Alert } from 'react-native';
import { cacheManager } from '@/src/lib/cacheManager';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInDev?: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInDev = () => {
    if (!__DEV__) return;

    const fakeUser: User = {
      id: 'dev-user',
      app_metadata: { provider: 'dev' },
      user_metadata: { name: 'Dev User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'dev@example.com',
      phone: '',
      role: 'authenticated',
      last_sign_in_at: new Date().toISOString(),
      factors: [],
      identities: [],
    } as any;

    const fakeSession: Session = {
      access_token: 'dev-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'dev-refresh-token',
      user: fakeUser,
    } as any;

    setUser(fakeUser);
    setSession(fakeSession);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      console.log('[Auth] Erro de login bruto:', error);
      Alert.alert('Erro ao fazer login', error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      Alert.alert(
        'Cadastro realizado!',
        'Verifique seu email para confirmar o cadastro.'
      );
    } catch (error: any) {
      Alert.alert('Erro ao cadastrar', error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const currentUserId = user?.id;

      // Limpa caches por usuário antes de sair
      if (currentUserId) {
        try {
          await Promise.all([
            cacheManager.clearByPrefix(`financial_transactions:${currentUserId}:`),
            cacheManager.clearByPrefix(`equipments:${currentUserId}`),
            cacheManager.clearByPrefix(`orders:${currentUserId}`),
            cacheManager.clearByPrefix(`contracts:${currentUserId}`),
          ]);
          console.log('[Auth] 🧹 Cache limpo no logout para usuário', currentUserId);
        } catch (cacheError) {
          console.warn('[Auth] Erro ao limpar cache no logout:', cacheError);
        }
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Erro ao sair', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        signInDev: __DEV__ ? signInDev : undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
