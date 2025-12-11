import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabaseClient';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializingSession, setInitializingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const router = useRouter();

  // Função para processar a URL do deep link (suporta PKCE e Implicit Flow)
  const processDeepLinkUrl = useCallback(async (url: string | null) => {
    try {
      setDebugInfo(prev => prev + `\nURL: ${url?.substring(0, 100) || 'null'}...`);

      if (!url) {
        console.log('[ResetPassword] Nenhuma URL encontrada - aguardando auth event');
        return false;
      }

      console.log('[ResetPassword] ===== PROCESSANDO DEEP LINK =====');
      console.log('[ResetPassword] URL completa:', url);

      // Verificação de PKCE (code) - Prioritário
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');

      if (code) {
        console.log('[ResetPassword] Código PKCE encontrado:', code);
        setDebugInfo(prev => prev + '\nCódigo PKCE encontrado');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.log('[ResetPassword] Erro ao trocar código por sessão:', error.message);
          setDebugInfo(prev => prev + `\nErro PKCE: ${error.message}`);

          // Se falhar o PKCE, não tenta o Implicit Flow pois o código já foi consumido ou é inválido
          return false;
        }

        console.log('[ResetPassword] Sessão estabelecida via PKCE');
        setDebugInfo(prev => prev + '\nSessão via PKCE ✓');
        setSessionReady(true);
        return true;
      }

      // Fallback: Implicit Flow (access_token/refresh_token)
      // Supabase envia tokens no fragmento (#) ou como query params (?)
      const hasFragment = url.includes('#');
      const hasQuery = url.includes('?');

      setDebugInfo(prev => prev + `\nFragment: ${hasFragment}, Query: ${hasQuery}`);

      let access_token: string | null = null;
      let refresh_token: string | null = null;
      let type: string | null = null;

      if (hasFragment) {
        const [, fragment] = url.split('#');
        const urlParams = new URLSearchParams(fragment);
        access_token = urlParams.get('access_token');
        refresh_token = urlParams.get('refresh_token');
        type = urlParams.get('type');
      } else if (hasQuery) {
        // Tenta pegar dos query params como fallback
        access_token = urlObj.searchParams.get('access_token');
        refresh_token = urlObj.searchParams.get('refresh_token');
        type = urlObj.searchParams.get('type');
      }

      console.log('[ResetPassword] Tokens encontrados (Implicit):', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        type
      });

      if (!access_token || !refresh_token) {
        console.log('[ResetPassword] Nenhum token ou código encontrado na URL');
        setDebugInfo(prev => prev + '\nSem tokens/código na URL');
        return false;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.log('[ResetPassword] Erro ao aplicar sessão (Implicit):', error.message);
        setDebugInfo(prev => prev + `\nErro Implicit: ${error.message}`);
        return false;
      }

      console.log('[ResetPassword] Sessão aplicada com sucesso via Implicit Flow');
      setDebugInfo(prev => prev + '\nSessão via Implicit Flow ✓');
      setSessionReady(true);
      return true;
    } catch (error: any) {
      console.log('[ResetPassword] Erro ao processar URL:', error);
      setDebugInfo(prev => prev + `\nErro geral: ${error?.message}`);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let sessionEstablished = false;

    const markSessionReady = () => {
      if (mounted && !sessionEstablished) {
        sessionEstablished = true;
        setSessionReady(true);
        setInitializingSession(false);
        console.log('[ResetPassword] ✅ Sessão marcada como pronta');
      }
    };

    const setupAuth = async () => {
      console.log('[ResetPassword] ===== INICIANDO SETUP DE AUTH =====');

      // PASSO 1: Configura listener de auth state PRIMEIRO (antes de qualquer coisa)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[ResetPassword] Auth event:', event, '- Session:', !!session);
        setDebugInfo(prev => prev + `\nAuth event: ${event}`);

        // PASSWORD_RECOVERY é disparado quando o link de recuperação é processado
        if (event === 'PASSWORD_RECOVERY' && session) {
          console.log('[ResetPassword] PASSWORD_RECOVERY detectado!');
          setDebugInfo(prev => prev + '\nPASSWORD_RECOVERY detectado ✓');
          markSessionReady();
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          // Também aceita SIGNED_IN e TOKEN_REFRESHED como fallback
          console.log('[ResetPassword] ' + event + ' detectado - verificando sessão');
          setDebugInfo(prev => prev + '\n' + event + ' detectado');
          markSessionReady();
        }
      });

      authSubscription = subscription;

      // PASSO 2: Verifica IMEDIATAMENTE se já existe uma sessão ativa
      // (pode ter sido criada pelo deep link antes do listener ser configurado)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession && mounted) {
        console.log('[ResetPassword] Sessão existente encontrada imediatamente!');
        console.log('[ResetPassword] User:', existingSession.user?.email);
        setDebugInfo(prev => prev + '\nSessão existente encontrada ✓');
        markSessionReady();
      }

      // PASSO 3: Tenta processar a URL inicial (backup)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[ResetPassword] URL inicial:', initialUrl.substring(0, 100));
        const urlSuccess = await processDeepLinkUrl(initialUrl);
        if (urlSuccess) {
          markSessionReady();
        }
      }

      // PASSO 4: Polling de sessão a cada 500ms durante 5 segundos
      // Isso garante que não perdemos a sessão por condição de corrida
      let pollCount = 0;
      const maxPolls = 10; // 10 x 500ms = 5 segundos

      const pollInterval = setInterval(async () => {
        pollCount++;

        if (sessionEstablished) {
          clearInterval(pollInterval);
          return;
        }

        console.log('[ResetPassword] Poll #' + pollCount + ' - verificando sessão...');
        const { data: { session: polledSession } } = await supabase.auth.getSession();

        if (polledSession && mounted) {
          console.log('[ResetPassword] Sessão encontrada via polling!');
          console.log('[ResetPassword] User:', polledSession.user?.email);
          setDebugInfo(prev => prev + '\nSessão via polling ✓');
          markSessionReady();
          clearInterval(pollInterval);
          return;
        }

        if (pollCount >= maxPolls) {
          console.log('[ResetPassword] Polling finalizado - nenhuma sessão');
          setDebugInfo(prev => prev + '\nPolling finalizado - sem sessão');
          clearInterval(pollInterval);
          if (mounted && !sessionEstablished) {
            setInitializingSession(false);
          }
        }
      }, 500);
    };

    setupAuth();

    // Listener para URLs recebidas enquanto o app está aberto
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[ResetPassword] URL recebida via listener:', event.url);
      processDeepLinkUrl(event.url);
    });

    return () => {
      mounted = false;
      subscription.remove();
      authSubscription?.unsubscribe();
    };
  }, [processDeepLinkUrl]);

  const handleUpdatePassword = async () => {
    if (initializingSession) {
      Alert.alert('Aguarde', 'Estamos validando o link de recuperação. Tente novamente em instantes.');
      return;
    }

    // Verifica se a sessão foi estabelecida corretamente
    if (!sessionReady) {
      Alert.alert(
        'Link não validado',
        'O link de recuperação não foi processado corretamente. Por favor, clique novamente no link do email ou solicite um novo link na tela de login.',
      );
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Campos obrigatórios', 'Preencha e confirme a nova senha.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Senhas não conferem', 'A confirmação deve ser igual à nova senha.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Verifica se há uma sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Auth session missing!');
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      // Faz logout para limpar a sessão de recuperação
      await supabase.auth.signOut();

      setPasswordUpdated(true);
    } catch (error: any) {
      console.log('[ResetPassword] Erro ao atualizar senha:', error?.message);

      // Mensagem específica para sessão ausente
      if (error?.message?.includes('session') || error?.message?.includes('Auth')) {
        Alert.alert(
          'Erro ao atualizar senha',
          'O link de recuperação expirou ou é inválido. Por favor, solicite um novo link na tela de login.'
        );
      } else {
        Alert.alert(
          'Erro ao atualizar senha',
          error?.message || 'Não foi possível atualizar a senha. Solicite um novo link de recuperação.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    router.replace('/login');
  };

  if (initializingSession) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={{ marginTop: 16, textAlign: 'center', color: '#6C6C70' }}>
            Validando link de recuperação...
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (passwordUpdated) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.title}>Senha atualizada!</Text>
          <Text style={styles.subtitle}>
            Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleGoToLogin}
          >
            <Text style={styles.buttonText}>Ir para o Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Definir nova senha</Text>
        <Text style={styles.subtitle}>
          Esta tela foi aberta a partir do link de recuperação enviado para o seu e-mail.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Digite a nova senha"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Confirmar nova senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repita a nova senha"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Salvar nova senha</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleGoToLogin}
          >
            <Text style={styles.linkText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  button: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '500',
  },
});
