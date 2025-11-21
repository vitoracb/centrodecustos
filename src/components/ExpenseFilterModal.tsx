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
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { X } from 'lucide-react-native';

dayjs.locale('pt-br');

export interface ExpenseFilters {
  month?: number | null;
  year?: number | null;
}

interface ExpenseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ExpenseFilters) => void;
  initialFilters?: ExpenseFilters;
}

export const ExpenseFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}: ExpenseFilterModalProps) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);

  useEffect(() => {
    if (visible && initialFilters) {
      if (initialFilters.month !== null && initialFilters.month !== undefined && initialFilters.year) {
        setSelectedDate(dayjs().month(initialFilters.month).year(initialFilters.year));
        setUsePeriodFilter(true);
      } else {
        setUsePeriodFilter(false);
        setSelectedDate(dayjs());
      }
    } else if (!visible) {
      setUsePeriodFilter(false);
      setSelectedDate(dayjs());
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({
      month: usePeriodFilter ? selectedDate.month() : null,
      year: usePeriodFilter ? selectedDate.year() : null,
    });
    onClose();
  };

  const handleClear = () => {
    setUsePeriodFilter(false);
    setSelectedDate(dayjs());
    onApply({
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

  const hasFilters = usePeriodFilter;

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
            <Text style={styles.title}>Filtrar Despesas</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll}>
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
              <Text style={styles.secondaryText}>Limpar Filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryText}>Aplicar Filtros</Text>
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
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

