import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';

interface CostCenterFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, code: string) => Promise<void>;
}

export const CostCenterFormModal = ({
  visible,
  onClose,
  onSubmit,
}: CostCenterFormModalProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setCode('');
      setLoading(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o nome do centro de custo.');
      return;
    }

    if (!code.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o código do centro de custo.');
      return;
    }

    // Validação do código (apenas letras, números e underscore)
    const codeRegex = /^[a-zA-Z0-9_]+$/;
    if (!codeRegex.test(code.trim())) {
      Alert.alert(
        'Código inválido',
        'O código pode conter apenas letras, números e underscore (_).'
      );
      return;
    }

    try {
      setLoading(true);
      await onSubmit(name.trim(), code.trim());
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível adicionar o centro de custo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Novo Centro de Custo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome do Centro de Custo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Valença, CNA, Cabrália"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A0A0A5"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Código *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: valenca, cna, cabralia"
                value={code}
                onChangeText={(text) => {
                  // Converte para minúsculas e remove caracteres inválidos
                  const normalized = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setCode(normalized);
                }}
                placeholderTextColor="#A0A0A5"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                Apenas letras, números e underscore (_). Será convertido para minúsculas.
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adicionando...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlay: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F5F5F7',
  },
  hint: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  submitButton: {
    backgroundColor: '#0A84FF',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

