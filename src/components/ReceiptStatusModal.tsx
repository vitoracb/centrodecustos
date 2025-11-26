import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { ReceiptStatus } from '../context/FinancialContext';

const STATUS_LABELS: Record<ReceiptStatus, string> = {
  a_confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_receber: 'A Receber',
  recebido: 'Recebido',
};

const STATUS_COLORS: Record<ReceiptStatus, { bg: string; text: string }> = {
  a_confirmar: { bg: '#FFF9C4', text: '#F9A825' }, // Amarelo
  confirmado: { bg: '#E3F2FD', text: '#1976D2' }, // Azul
  a_receber: { bg: '#FFEBEE', text: '#D32F2F' }, // Vermelho
  recebido: { bg: '#E8F5E9', text: '#388E3C' }, // Verde
};

interface ReceiptStatusModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (status: ReceiptStatus) => void;
  currentStatus?: ReceiptStatus;
}

export const ReceiptStatusModal = ({
  visible,
  onClose,
  onSelect,
  currentStatus,
}: ReceiptStatusModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<ReceiptStatus>(
    currentStatus || 'a_confirmar'
  );

  useEffect(() => {
    if (visible && currentStatus) {
      setSelectedStatus(currentStatus);
    }
  }, [visible, currentStatus]);

  const handleConfirm = () => {
    onSelect(selectedStatus);
    onClose();
  };

  const statusOptions: ReceiptStatus[] = [
    'a_confirmar',
    'confirmado',
    'a_receber',
    'recebido',
  ];

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
            <Text style={styles.title}>Alterar Status</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Selecione o novo status:</Text>
            <View style={styles.optionsContainer}>
              {statusOptions.map((status) => {
                const isSelected = selectedStatus === status;
                const colors = STATUS_COLORS[status];
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.option,
                      isSelected && {
                        backgroundColor: colors.bg,
                        borderColor: colors.text,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <View
                      style={[
                        styles.radio,
                        isSelected && { backgroundColor: colors.text },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && { color: colors.text, fontWeight: '600' },
                      ]}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
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
    gap: 20,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: '#6C6C70',
    fontWeight: '600',
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

