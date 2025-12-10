import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabaseClient';
import { Alert } from 'react-native';
import { cacheManager } from '@/src/lib/cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Limpa tokens de autenticação corrompidos do AsyncStorage
 */
const clearCorruptedTokens = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key =>
      key.includes('supabase') ||
      key.includes('sb-') ||
      key.includes('auth-token')
    );
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('[Auth] Tokens corrompidos limpos:', supabaseKeys.length);
    }
  } catch (error) {
    console.warn('[Auth] Erro ao limpar tokens:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca sessão atual com tratamento de erro para token inválido
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // Se o token é inválido, limpa a sessão corrompida
          console.warn('[Auth] Erro ao recuperar sessão:', error.message);
          if (error.message.includes('Refresh Token') ||
            error.message.includes('Invalid') ||
            error.message.includes('Token Not Found')) {
            console.log('[Auth] Token inválido detectado, limpando...');
            await clearCorruptedTokens();
            await supabase.auth.signOut();
          }
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err: any) {
        // Captura erros não tratados (ex: refresh token expirado)
        console.warn('[Auth] Exceção ao recuperar sessão:', err?.message);
        // Tenta limpar tokens corrompidos
        if (err?.message?.includes('Refresh Token') ||
          err?.message?.includes('Invalid') ||
          err?.message?.includes('Token Not Found')) {
          await clearCorruptedTokens();
        }
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Escuta mudanças de autenticação com tratamento de erro
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Se o evento for de erro de token, limpa silenciosamente
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('[Auth] Falha no refresh do token, limpando...');
        await clearCorruptedTokens();
        setSession(null);
        setUser(null);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);


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
