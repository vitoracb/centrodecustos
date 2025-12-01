import React from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CheckCircle, AlertCircle } from 'lucide-react-native';

interface OCRProgressModalProps {
  visible: boolean;
  progress?: number;
  status: string;
  success?: boolean;
  error?: boolean;
}

export const OCRProgressModal = ({ 
  visible, 
  progress, 
  status, 
  success, 
  error 
}: OCRProgressModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!success && !error && (
            <>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={styles.status}>{status}</Text>
              {progress !== undefined && progress > 0 && (
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              )}
            </>
          )}
          
          {success && (
            <>
              <CheckCircle size={48} color="#34C759" />
              <Text style={[styles.status, styles.successText]}>
                Dados extraídos com sucesso!
              </Text>
            </>
          )}
          
          {error && (
            <>
              <AlertCircle size={48} color="#FF3B30" />
              <Text style={[styles.status, styles.errorText]}>
                Erro ao processar imagem
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  status: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6C6C70',
    fontWeight: '600',
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
