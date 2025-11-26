import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { X, ChevronDown } from 'lucide-react-native';

export interface OrderFilters {
  name?: string;
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface OrderFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
  initialFilters?: OrderFilters;
  equipments: { id: string; name: string }[];
}

type PickerType = 'start' | 'end' | null;

export const OrderFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  equipments,
}: OrderFilterModalProps) => {
  const [name, setName] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [equipmentDropdownVisible, setEquipmentDropdownVisible] = useState(false);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialFilters?.name ?? '');
      setSelectedEquipmentId(initialFilters?.equipmentId ?? '');
      setStartDate(
        initialFilters?.startDate ? dayjs(initialFilters.startDate).toDate() : null,
      );
      setEndDate(
        initialFilters?.endDate ? dayjs(initialFilters.endDate).toDate() : null,
      );
      setSelectedStatus(initialFilters?.status ?? '');
      setEquipmentDropdownVisible(false);
      setStatusDropdownVisible(false);
      setActivePicker(null);
    }
  }, [visible, initialFilters]);

  const equipmentLabel = useMemo(() => {
    if (!selectedEquipmentId) return 'Selecione um equipamento';
    return (
      equipments.find(eq => eq.id === selectedEquipmentId)?.name ??
      'Selecione um equipamento'
    );
  }, [equipments, selectedEquipmentId]);

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'orcamento_pendente', label: 'Orçamento pendente' },
    { value: 'orcamento_enviado', label: 'Orçamento enviado' },
    { value: 'orcamento_aprovado', label: 'Orçamento aprovado' },
    { value: 'orcamento_reprovado', label: 'Orçamento reprovado' },
  ];

  const statusLabel = useMemo(() => {
    if (!selectedStatus) return 'Todos os status';
    return statusOptions.find(opt => opt.value === selectedStatus)?.label ?? 'Todos os status';
  }, [selectedStatus]);

  const handleApply = () => {
    onApply({
      name: name.trim() || undefined,
      equipmentId: selectedEquipmentId || undefined,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
      status: selectedStatus || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setName('');
    setSelectedEquipmentId('');
    setStartDate(null);
    setEndDate(null);
    setSelectedStatus('');
    onApply({});
    onClose();
  };

  const handleDateChange = (_: any, date?: Date | undefined) => {
    if (activePicker === 'start') {
      setStartDate(date ?? startDate);
    } else if (activePicker === 'end') {
      setEndDate(date ?? endDate);
    }
    setActivePicker(null);
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
            <Text style={styles.title}>Filtrar Pedidos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome do pedido</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A0A0A5"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Equipamento</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setEquipmentDropdownVisible(prev => !prev)}
              >
                <Text style={styles.inputText}>{equipmentLabel}</Text>
                <ChevronDown size={18} color="#6C6C70" />
              </TouchableOpacity>
              {equipmentDropdownVisible && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedEquipmentId('');
                      setEquipmentDropdownVisible(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Todos os equipamentos</Text>
                  </TouchableOpacity>
                  {equipments.length > 0 ? (
                    equipments.map((equipment, index) => (
                      <TouchableOpacity
                        key={equipment.id}
                        style={[
                          styles.dropdownItem,
                          selectedEquipmentId === equipment.id && styles.dropdownItemSelected,
                          index === equipments.length - 1 && styles.dropdownItemLast,
                        ]}
                        onPress={() => {
                          setSelectedEquipmentId(equipment.id);
                          setEquipmentDropdownVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedEquipmentId === equipment.id &&
                              styles.dropdownItemTextSelected,
                          ]}
                        >
                          {equipment.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>
                        Nenhum equipamento disponível
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Data inicial</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setActivePicker('start')}
              >
                <Text style={styles.inputText}>
                  {startDate ? dayjs(startDate).format('DD/MM/YYYY') : 'Selecione a data'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Data final</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setActivePicker('end')}
              >
                <Text style={styles.inputText}>
                  {endDate ? dayjs(endDate).format('DD/MM/YYYY') : 'Selecione a data'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status do orçamento</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setStatusDropdownVisible(prev => !prev)}
              >
                <Text style={styles.inputText}>{statusLabel}</Text>
                <ChevronDown size={18} color="#6C6C70" />
              </TouchableOpacity>
              {statusDropdownVisible && (
                <View style={styles.dropdownList}>
                  {statusOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        selectedStatus === option.value && styles.dropdownItemSelected,
                        index === statusOptions.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => {
                        setSelectedStatus(option.value);
                        setStatusDropdownVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedStatus === option.value &&
                            styles.dropdownItemTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.ghostButton} onPress={onClose}>
              <Text style={styles.ghostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleClear}>
              <Text style={styles.secondaryText}>Limpar filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {activePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={
                activePicker === 'start'
                  ? startDate ?? new Date()
                  : endDate ?? new Date()
              }
              onChange={handleDateChange}
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
    maxHeight: '92%',
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 6,
  },
  formScroll: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  dropdownItemTextSelected: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ghostButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
  },
  primaryText: {
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

