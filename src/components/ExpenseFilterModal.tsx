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
import { X, Filter, ChevronDown } from 'lucide-react-native';
import { ExpenseCategory, ExpenseSector } from '../context/FinancialContext';
import { Equipment } from '../context/EquipmentContext';

dayjs.locale('pt-br');

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
  equipamentos: 'Equipamentos',
};

const SECTOR_LABELS: Record<ExpenseSector, string> = {
  now: 'Now',
  felipe_viatransportes: 'Felipe Viatransportes',
  terceirizados: 'Terceirizados',
  gestao: 'Gestão',
  ronaldo: 'Ronaldo',
};

// Formata número para moeda brasileira
const formatCurrency = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers === '') return '';
  const numericValue = parseInt(numbers, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numericValue);
};

// Extrai número de string formatada como moeda
const parseCurrency = (value: string): number | null => {
  const cleanValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
};

export interface ExpenseFilters {
  category?: ExpenseCategory | null;
  equipmentId?: string | null;
  value?: number | null;
  month?: number | null;
  year?: number | null;
  name?: string | null;
  sector?: ExpenseSector | null;
}

interface ExpenseFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ExpenseFilters) => void;
  initialFilters?: ExpenseFilters;
  equipments?: Equipment[];
}

export const ExpenseFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  equipments = [],
}: ExpenseFilterModalProps) => {
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);
  const [equipmentDropdownVisible, setEquipmentDropdownVisible] = useState(false);
  const [name, setName] = useState<string>('');
  const [sector, setSector] = useState<ExpenseSector | null>(null);
  const [sectorDropdownVisible, setSectorDropdownVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  useEffect(() => {
    if (visible && initialFilters) {
      setCategory(initialFilters.category || null);
      setSelectedEquipmentId(initialFilters.equipmentId || '');
      if (initialFilters.value) {
        const cents = Math.round(initialFilters.value * 100);
        setValue(formatCurrency(String(cents)));
      } else {
        setValue('');
      }
      if (initialFilters.month !== null && initialFilters.month !== undefined && initialFilters.year) {
        setSelectedDate(dayjs().month(initialFilters.month).year(initialFilters.year));
        setUsePeriodFilter(true);
      } else {
        setUsePeriodFilter(false);
        setSelectedDate(dayjs());
      }
      setName(initialFilters.name || '');
      setSector(initialFilters.sector || null);
    } else if (!visible) {
      setCategory(null);
      setSelectedEquipmentId('');
      setValue('');
      setUsePeriodFilter(false);
      setSelectedDate(dayjs());
      setEquipmentDropdownVisible(false);
      setName('');
      setSector(null);
      setSectorDropdownVisible(false);
      setCategoryDropdownVisible(false);
    }
  }, [visible, initialFilters]);

  // Reset equipamento selecionado se não estiver mais na lista (quando centro de custo muda)
  useEffect(() => {
    if (selectedEquipmentId && !equipments.find(eq => eq.id === selectedEquipmentId)) {
      setSelectedEquipmentId('');
    }
  }, [equipments, selectedEquipmentId]);

  const handleApply = () => {
    const numericValue = value.trim() ? parseCurrency(value) : null;
    
    onApply({
      category: category || null,
      equipmentId: selectedEquipmentId || null,
      value: numericValue,
      month: usePeriodFilter ? selectedDate.month() : null,
      year: usePeriodFilter ? selectedDate.year() : null,
      name: name.trim() || null,
      sector: sector || null,
    });
    onClose();
  };

  const handleClear = () => {
    setCategory(null);
    setSelectedEquipmentId('');
    setValue('');
    setUsePeriodFilter(false);
    setSelectedDate(dayjs());
    setName('');
    setSector(null);
    onApply({
      category: null,
      equipmentId: null,
      value: null,
      month: null,
      year: null,
      name: null,
      sector: null,
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

  const equipmentLabel = equipments.find(eq => eq.id === selectedEquipmentId)?.name || 'Selecione um equipamento';

  const hasFilters = category || selectedEquipmentId || value.trim() || usePeriodFilter;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => {
            setCategoryDropdownVisible(false);
            setEquipmentDropdownVisible(false);
            setSectorDropdownVisible(false);
            onClose();
          }} 
        />
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
              <Text style={styles.label}>Categoria</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setCategoryDropdownVisible(!categoryDropdownVisible);
                  setEquipmentDropdownVisible(false);
                  setSectorDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
                  {category ? CATEGORY_LABELS[category] : 'Todas as categorias'}
                </Text>
                <ChevronDown size={20} color="#6C6C70" />
              </TouchableOpacity>
              {categoryDropdownVisible && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(null);
                        setCategoryDropdownVisible(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !category && styles.dropdownItemTextSelected]}>
                        Todas as categorias
                      </Text>
                    </TouchableOpacity>
                    {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setCategory(cat);
                            setCategoryDropdownVisible(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Digite o nome da despesa"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Setor</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setSectorDropdownVisible(!sectorDropdownVisible);
                  setEquipmentDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownText, !sector && styles.dropdownPlaceholder]}>
                  {sector ? SECTOR_LABELS[sector] : 'Todos os setores'}
                </Text>
                <ChevronDown size={20} color="#6C6C70" />
              </TouchableOpacity>
              {sectorDropdownVisible && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSector(null);
                        setSectorDropdownVisible(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !sector && styles.dropdownItemTextSelected]}>
                        Todos os setores
                      </Text>
                    </TouchableOpacity>
                    {(Object.keys(SECTOR_LABELS) as ExpenseSector[]).map((sec) => {
                      const isSelected = sector === sec;
                      return (
                        <TouchableOpacity
                          key={sec}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSector(sec);
                            setSectorDropdownVisible(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {SECTOR_LABELS[sec]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Equipamento</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setEquipmentDropdownVisible(!equipmentDropdownVisible);
                  setSectorDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownText, !selectedEquipmentId && styles.dropdownPlaceholder]}>
                  {equipmentLabel}
                </Text>
                <ChevronDown size={20} color="#6C6C70" />
              </TouchableOpacity>
              {equipmentDropdownVisible && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedEquipmentId('');
                        setEquipmentDropdownVisible(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !selectedEquipmentId && styles.dropdownItemTextSelected]}>
                        Todos os equipamentos
                      </Text>
                    </TouchableOpacity>
                    {equipments.map((equipment) => {
                      const isSelected = selectedEquipmentId === equipment.id;
                      return (
                        <TouchableOpacity
                          key={equipment.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedEquipmentId(equipment.id);
                            setEquipmentDropdownVisible(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {equipment.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={(text) => {
                  const numbers = text.replace(/\D/g, '');
                  if (numbers === '') {
                    setValue('');
                  } else {
                    const formatted = formatCurrency(numbers);
                    setValue(formatted);
                  }
                }}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
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
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#8E8E93',
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  dropdownItemTextSelected: {
    color: '#0A84FF',
    fontWeight: '600',
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

