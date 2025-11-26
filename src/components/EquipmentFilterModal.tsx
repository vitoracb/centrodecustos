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
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Filter, X } from 'lucide-react-native';

dayjs.locale('pt-br');

export interface EquipmentFilters {
  name?: string;
  brand?: string;
  year?: number | null;
  purchaseMonth?: number | null;
  purchaseYear?: number | null;
}

interface EquipmentFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: EquipmentFilters) => void;
  initialFilters?: EquipmentFilters;
}

export const EquipmentFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
}: EquipmentFilterModalProps) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [usePurchaseDateFilter, setUsePurchaseDateFilter] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible && initialFilters) {
      setName(initialFilters.name || '');
      setBrand(initialFilters.brand || '');
      setYear(initialFilters.year ? String(initialFilters.year) : '');
      if (initialFilters.purchaseMonth !== null && initialFilters.purchaseMonth !== undefined && initialFilters.purchaseYear) {
        setSelectedDate(dayjs().month(initialFilters.purchaseMonth).year(initialFilters.purchaseYear));
        setUsePurchaseDateFilter(true);
      } else {
        setUsePurchaseDateFilter(false);
      }
    } else if (!visible) {
      setName('');
      setBrand('');
      setYear('');
      setSelectedDate(dayjs());
      setUsePurchaseDateFilter(false);
      setPickerVisible(false);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({
      name: name.trim() || undefined,
      brand: brand.trim() || undefined,
      year: year.trim() ? Number(year.trim()) : null,
      purchaseMonth: usePurchaseDateFilter ? selectedDate.month() : null,
      purchaseYear: usePurchaseDateFilter ? selectedDate.year() : null,
    });
    onClose();
  };

  const handleClear = () => {
    setName('');
    setBrand('');
    setYear('');
    setSelectedDate(dayjs());
    setUsePurchaseDateFilter(false);
    onApply({
      name: undefined,
      brand: undefined,
      year: null,
      purchaseMonth: null,
      purchaseYear: null,
    });
    onClose();
  };

  const hasFilters = name.trim() || brand.trim() || year.trim() || usePurchaseDateFilter;

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
            <Text style={styles.title}>Filtrar Equipamentos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome do equipamento</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Buscar por nome..."
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="Buscar por marca..."
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ano</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={(text) => {
                  // Permite apenas números
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setYear(numericValue);
                }}
                placeholder="Ex: 2025"
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setUsePurchaseDateFilter(!usePurchaseDateFilter)}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      usePurchaseDateFilter && styles.checkboxChecked,
                    ]}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Filtrar por data da compra</Text>
              </View>
              {usePurchaseDateFilter && (
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
          </ScrollView>

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
  scrollView: {
    maxHeight: 400,
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

