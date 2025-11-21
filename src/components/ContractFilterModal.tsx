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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { ContractCategory } from '../context/ContractContext';
import { Filter, X } from 'lucide-react-native';

const CATEGORY_LABELS: Record<ContractCategory, string> = {
  principal: 'Principal',
  terceirizados: 'Terceirizado',
};

export interface ContractFilters {
  name?: string;
  category?: ContractCategory | null;
  month?: number | null;
  year?: number | null;
}

interface ContractFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ContractFilters) => void;
  initialFilters?: ContractFilters;
}

export const ContractFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}: ContractFilterModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ContractCategory | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible && initialFilters) {
      setName(initialFilters.name || '');
      setCategory(initialFilters.category || null);
      if (initialFilters.month !== null && initialFilters.month !== undefined && initialFilters.year) {
        setSelectedDate(dayjs().month(initialFilters.month).year(initialFilters.year));
        setUsePeriodFilter(true);
      } else {
        setUsePeriodFilter(false);
      }
    } else if (!visible) {
      setName('');
      setCategory(null);
      setSelectedDate(dayjs());
      setUsePeriodFilter(false);
      setPickerVisible(false);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({
      name: name.trim() || undefined,
      category: category || null,
      month: usePeriodFilter ? selectedDate.month() : null,
      year: usePeriodFilter ? selectedDate.year() : null,
    });
    onClose();
  };

  const handleClear = () => {
    setName('');
    setCategory(null);
    setSelectedDate(dayjs());
    setUsePeriodFilter(false);
    onApply({
      name: undefined,
      category: null,
      month: null,
      year: null,
    });
    onClose();
  };

  const hasFilters = name.trim() || category || usePeriodFilter;

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
            <Text style={styles.title}>Filtrar Contratos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nome do contrato</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Buscar por nome..."
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[styles.categoryChip, !category && styles.categoryChipSelected]}
                onPress={() => setCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !category && styles.categoryChipTextSelected,
                  ]}
                >
                  Todas
                </Text>
              </TouchableOpacity>
              {(Object.keys(CATEGORY_LABELS) as ContractCategory[]).map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setUsePeriodFilter(!usePeriodFilter)}
              >
                <View
                  style={[
                    styles.checkboxInner,
                    usePeriodFilter && styles.checkboxChecked,
                  ]}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Filtrar por período</Text>
            </View>
            {usePeriodFilter && (
              <View style={styles.periodContainer}>
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>Mês:</Text>
                  <TouchableOpacity
                    style={styles.periodButton}
                    onPress={() => setPickerVisible(true)}
                  >
                    <Text style={styles.periodButtonText}>
                      {selectedDate.format('MMMM')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.periodRow}>
                  <Text style={styles.periodLabel}>Ano:</Text>
                  <Text style={styles.periodValue}>{selectedDate.format('YYYY')}</Text>
                  <View style={styles.yearButtons}>
                    <TouchableOpacity
                      style={styles.yearButton}
                      onPress={() => setSelectedDate((prev) => prev.subtract(1, 'year'))}
                    >
                      <Text style={styles.yearButtonText}>←</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.yearButton}
                      onPress={() => setSelectedDate((prev) => prev.add(1, 'year'))}
                    >
                      <Text style={styles.yearButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Filter size={16} color="#FFFFFF" />
              <Text style={styles.applyText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {pickerVisible && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={selectedDate.toDate()}
              onChange={(_, selectedDate) => {
                setPickerVisible(false);
                if (selectedDate) setSelectedDate(dayjs(selectedDate));
              }}
            />
          </View>
        </View>
      )}
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
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryChipSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxChecked: {
    backgroundColor: '#0A84FF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  periodContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    gap: 12,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodLabel: {
    fontSize: 14,
    color: '#6C6C70',
    fontWeight: '600',
    width: 50,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  periodValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
  },
  yearButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  yearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  applyButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

