import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { X, Filter } from 'lucide-react-native';
import { ReceiptStatus } from '../context/FinancialContext';

dayjs.locale('pt-br');

const STATUS_LABELS: Record<ReceiptStatus, string> = {
  a_confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_receber: 'A Receber',
  recebido: 'Recebido',
};

// Formata número para moeda brasileira
const formatCurrency = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return '';
  
  // Converte para número e divide por 100 para ter centavos
  const numericValue = parseInt(numbers, 10) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numericValue);
};

// Extrai número de string formatada como moeda
const parseCurrency = (value: string): number | null => {
  // Remove formatação e converte para número
  const cleanValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
};

export interface ReceiptFilters {
  name?: string;
  value?: number | null;
  status?: ReceiptStatus | null;
  month?: number | null;
  year?: number | null;
}

interface ReceiptFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ReceiptFilters) => void;
  initialFilters?: ReceiptFilters;
}

export const ReceiptFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}: ReceiptFilterModalProps) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ReceiptStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);

  useEffect(() => {
    if (visible && initialFilters) {
      setName(initialFilters.name || '');
      // Formata o valor para exibição como moeda
      if (initialFilters.value) {
        // Multiplica por 100 para converter para centavos e formatar
        const cents = Math.round(initialFilters.value * 100);
        setValue(formatCurrency(String(cents)));
      } else {
        setValue('');
      }
      setSelectedStatus(initialFilters.status || null);
      if (initialFilters.month !== null && initialFilters.month !== undefined && initialFilters.year) {
        setSelectedDate(dayjs().month(initialFilters.month).year(initialFilters.year));
        setUsePeriodFilter(true);
      } else {
        setUsePeriodFilter(false);
        setSelectedDate(dayjs());
      }
    } else if (!visible) {
      setName('');
      setValue('');
      setSelectedStatus(null);
      setUsePeriodFilter(false);
      setSelectedDate(dayjs());
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    // Converte o valor formatado para número
    const numericValue = value.trim() ? parseCurrency(value) : null;

    onApply({
      name: name.trim() || undefined,
      value: numericValue,
      status: selectedStatus || null,
      month: usePeriodFilter ? selectedDate.month() : null,
      year: usePeriodFilter ? selectedDate.year() : null,
    });
    onClose();
  };

  const handleClear = () => {
    setName('');
    setValue('');
    setSelectedStatus(null);
    setUsePeriodFilter(false);
    setSelectedDate(dayjs());
    onApply({
      name: undefined,
      value: null,
      status: null,
      month: null,
      year: null,
    });
    onClose();
  };

  const handlePreviousMonth = () => {
    setSelectedDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => prev.add(1, 'month'));
  };

  const handlePreviousYear = () => {
    setSelectedDate((prev) => prev.subtract(1, 'year'));
  };

  const handleNextYear = () => {
    setSelectedDate((prev) => prev.add(1, 'year'));
  };

  const hasFilters = name.trim() || value.trim() || selectedStatus || usePeriodFilter;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filtrar Recebimentos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome do recebimento</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Buscar por nome..."
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={(text) => {
                  // Remove tudo exceto números
                  const numbers = text.replace(/\D/g, '');
                  if (numbers === '') {
                    setValue('');
                  } else {
                    // Formata como moeda enquanto digita
                    const formatted = formatCurrency(numbers);
                    setValue(formatted);
                  }
                }}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusChip, !selectedStatus && styles.statusChipSelected]}
                  onPress={() => setSelectedStatus(null)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      !selectedStatus && styles.statusChipTextSelected,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {(Object.keys(STATUS_LABELS) as ReceiptStatus[]).map((status) => {
                  const isSelected = selectedStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          isSelected && styles.statusChipTextSelected,
                        ]}
                      >
                        {STATUS_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.periodHeader}>
                <Text style={styles.label}>Filtrar por período</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, usePeriodFilter && styles.toggleButtonActive]}
                  onPress={() => setUsePeriodFilter((prev) => !prev)}
                >
                  <Text style={[styles.toggleButtonText, usePeriodFilter && styles.toggleButtonTextActive]}>
                    {usePeriodFilter ? 'Ativado' : 'Desativado'}
                  </Text>
                </TouchableOpacity>
              </View>

              {usePeriodFilter && (
                <View style={styles.periodNavigators}>
                  <View style={styles.navigatorContainer}>
                    <Text style={styles.navigatorLabel}>Mês</Text>
                    <View style={styles.navigator}>
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={handlePreviousMonth}
                      >
                        <Text style={styles.navButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.navValue}>
                        {selectedDate.format('MMMM')}
                      </Text>
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleNextMonth}
                      >
                        <Text style={styles.navButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.navigatorContainer}>
                    <Text style={styles.navigatorLabel}>Ano</Text>
                    <View style={styles.navigator}>
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={handlePreviousYear}
                      >
                        <Text style={styles.navButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.navValue}>{selectedDate.format('YYYY')}</Text>
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={handleNextYear}
                      >
                        <Text style={styles.navButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleClear}>
              <Text style={styles.secondaryText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleApply}>
              <Filter size={16} color="#FFFFFF" />
              <Text style={styles.primaryText}>Aplicar</Text>
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
    gap: 16,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 5,
  },
  formScroll: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusChipSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  periodNavigators: {
    flexDirection: 'row',
    gap: 16,
  },
  navigatorContainer: {
    flex: 1,
    gap: 8,
  },
  navigatorLabel: {
    fontSize: 12,
    color: '#6C6C70',
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  navValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

