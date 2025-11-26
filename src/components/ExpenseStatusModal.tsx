import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Expense, ExpenseStatus } from '../context/FinancialContext';

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_pagar: 'A Pagar',
  pago: 'Pago',
};

const STATUS_STYLES: Record<ExpenseStatus, { backgroundColor: string; color: string }> = {
  confirmar: { backgroundColor: '#FFF3D6', color: '#FF9500' },
  confirmado: { backgroundColor: '#E9FAF0', color: '#34C759' },
  a_pagar: { backgroundColor: '#FDECEC', color: '#FF3B30' },
  pago: { backgroundColor: '#E6FEEA', color: '#1B8A2F' },
};

interface ExpenseStatusModalProps {
  visible: boolean;
  onClose: () => void;
  expense: Expense | null;
  onStatusChange: (expense: Expense, newStatus: ExpenseStatus) => void;
}

export const ExpenseStatusModal = ({
  visible,
  onClose,
  expense,
  onStatusChange,
}: ExpenseStatusModalProps) => {
  if (!expense) return null;

  const getAvailableStatuses = (): ExpenseStatus[] => {
    const allStatuses: ExpenseStatus[] = ['confirmar', 'confirmado', 'a_pagar'];
    // Só adiciona "pago" se houver documentos
    if (expense.documents && expense.documents.length > 0) {
      allStatuses.push('pago');
    }
    return allStatuses;
  };

  const availableStatuses = getAvailableStatuses();

  const handleStatusSelect = (status: ExpenseStatus) => {
    // Validação: "pago" só pode ser selecionado se houver documentos
    if (status === 'pago' && (!expense.documents || expense.documents.length === 0)) {
      return;
    }
    onStatusChange(expense, status);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Alterar Status da Despesa</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.expenseInfo}>
            <Text style={styles.expenseName}>{expense.name}</Text>
            <Text style={styles.expenseValue}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
              }).format(expense.value)}
            </Text>
          </View>

          <ScrollView style={styles.statusList} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Selecione o novo status:</Text>
            {availableStatuses.map((status, index) => {
              const isSelected = expense.status === status;
              const style = STATUS_STYLES[status];
              
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    { backgroundColor: style.backgroundColor },
                    isSelected && styles.statusOptionSelected,
                    index === availableStatuses.length - 1 && styles.statusOptionLast,
                  ]}
                  onPress={() => handleStatusSelect(status)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusOptionContent}>
                    <Text style={[styles.statusOptionLabel, { color: style.color }]}>
                      {STATUS_LABELS[status]}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: style.color }]}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {expense.documents && expense.documents.length === 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 O status "Pago" só está disponível quando há comprovante anexado à despesa.
              </Text>
            </View>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F7',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  expenseValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
  },
  statusList: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
    marginBottom: 12,
  },
  statusOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    borderColor: '#0A84FF',
    borderWidth: 2,
  },
  statusOptionLast: {
    marginBottom: 0,
  },
  statusOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FFF3D6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoText: {
    fontSize: 13,
    color: '#6C6C70',
    lineHeight: 18,
  },
});

