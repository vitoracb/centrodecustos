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
  const router = useRouter();

  const processDeepLinkUrl = useCallback(async (url: string | null) => {
    try {
      if (!url) {
        console.log('[ResetPassword] Nenhuma URL encontrada');
        setInitializingSession(false);
        return;
      }

      console.log('[ResetPassword] ===== PROCESSANDO DEEP LINK =====');
      console.log('[ResetPassword] URL completa:', url);
      console.log('[ResetPassword] URL length:', url.length);

      // Supabase envia o access_token e refresh_token no fragmento da URL (#)
      // Exemplo: com.centrodecustos://reset-password#access_token=...&refresh_token=...&type=recovery
      // ou: nowtrading-centrodecustos://reset-password#access_token=...
      const [baseUrl, fragment] = url.split('#');
      console.log('[ResetPassword] Base URL:', baseUrl);
      console.log('[ResetPassword] Fragmento presente:', !!fragment);

      if (!fragment) {
        console.log('[ResetPassword] URL sem fragmento de auth - link pode ter expirado ou ser inválido');
        console.log('[ResetPassword] URL completa recebida:', url);
        setInitializingSession(false);
        return;
      }

      const urlParams = new URLSearchParams(fragment);
      const access_token = urlParams.get('access_token');
      const refresh_token = urlParams.get('refresh_token');
      const type = urlParams.get('type');

      if (type !== 'recovery' || !access_token || !refresh_token) {
        console.log('[ResetPassword] Fragmento inválido:', fragment);
        Alert.alert(
          'Link inválido',
          'O link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.',
        );
        setInitializingSession(false);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.log('[ResetPassword] Erro ao aplicar sessão de recuperação:', error);
        Alert.alert(
          'Erro no link',
          'Não foi possível validar o link de recuperação. Solicite um novo link na tela de login.',
        );
      } else {
        console.log('[ResetPassword] Sessão de recuperação aplicada com sucesso');
        setSessionReady(true);
      }
    } catch (error) {
      console.log('[ResetPassword] Erro inesperado ao processar deep link:', error);
      Alert.alert(
        'Erro no link',
        'Ocorreu um erro ao processar o link de recuperação. Solicite um novo link.',
      );
    } finally {
      setInitializingSession(false);
    }
  }, []);

  useEffect(() => {
    const initFromDeepLink = async () => {
      // Tenta obter a URL inicial (quando o app é aberto pelo link)
      const initialUrl = await Linking.getInitialURL();
      await processDeepLinkUrl(initialUrl);
    };

    initFromDeepLink();

    // Listener para quando o app já está aberto e recebe um link
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[ResetPassword] URL recebida via listener:', event.url);
      processDeepLinkUrl(event.url);
    });

    return () => {
      subscription.remove();
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
