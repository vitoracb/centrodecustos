import { useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const isAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    if (!user && inTabsGroup) {
      // Redireciona para login se não estiver autenticado e tentar acessar as tabs
      router.replace('/login' as any);
    } else if (user && isAuthScreen) {
      // Redireciona para home se já estiver autenticado e tentar acessar telas de auth
      router.replace('/(tabs)' as any);
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
});
