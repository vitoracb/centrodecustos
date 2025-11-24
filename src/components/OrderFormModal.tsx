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
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useEquipment } from '../context/EquipmentContext';
import { useCostCenter } from '../context/CostCenterContext';
import { ChevronDown } from 'lucide-react-native';

interface OrderFormData {
  name: string;
  date: string;
  observations: string;
  equipmentId: string;
}

interface OrderFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: OrderFormData) => void;
  initialData?: OrderFormData & { id?: string };
}

export const OrderFormModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: OrderFormModalProps) => {
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  const equipments = getEquipmentsByCenter(selectedCenter);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [observations, setObservations] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [equipmentDropdownVisible, setEquipmentDropdownVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setDate(new Date());
      setObservations('');
      setSelectedEquipmentId('');
      setPickerVisible(false);
      setEquipmentDropdownVisible(false);
    } else if (initialData) {
      setName(initialData.name);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      setObservations(initialData.observations || '');
      setSelectedEquipmentId(initialData.equipmentId || '');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o nome do pedido.');
      return;
    }
    if (!selectedEquipmentId) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione um equipamento.');
      return;
    }
    onSubmit({
      name: name.trim(),
      date: dayjs(date).format('DD/MM/YYYY'),
      observations: observations.trim(),
      equipmentId: selectedEquipmentId,
    });
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            setEquipmentDropdownVisible(false);
          }}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{isEditing ? 'Editar Pedido' : 'Novo Pedido'}</Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome do pedido *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Compra de equipamentos de irrigação"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Equipamento *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setEquipmentDropdownVisible(!equipmentDropdownVisible)}
              >
                <Text style={styles.inputText}>
                  {selectedEquipmentId
                    ? equipments.find((eq) => eq.id === selectedEquipmentId)?.name || 'Selecione um equipamento'
                    : 'Selecione um equipamento'}
                </Text>
                <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
              </TouchableOpacity>
              {equipmentDropdownVisible && (
                <View style={styles.dropdownList}>
                  {equipments.length > 0 ? (
                    equipments.map((equipment, index, array) => (
                      <TouchableOpacity
                        key={equipment.id}
                        style={[
                          styles.dropdownItem,
                          selectedEquipmentId === equipment.id && styles.dropdownItemSelected,
                          index === array.length - 1 && styles.dropdownItemLast,
                        ]}
                        onPress={() => {
                          setSelectedEquipmentId(equipment.id);
                          setEquipmentDropdownVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedEquipmentId === equipment.id && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {equipment.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>
                        Nenhum equipamento cadastrado
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Data *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Observações</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observations}
                onChangeText={setObservations}
                placeholder="Descreva o pedido..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!name.trim() || !selectedEquipmentId) && styles.disabledButton,
              ]}
              disabled={!name.trim() || !selectedEquipmentId}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>{isEditing ? 'Salvar alterações' : 'Salvar'}</Text>
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
              value={date}
              onChange={(_, selectedDate) => {
                setPickerVisible(false);
                if (selectedDate) setDate(selectedDate);
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  formScroll: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
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
  dropdownIcon: {
    marginLeft: 8,
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
  disabledButton: {
    backgroundColor: '#A5C9FF',
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

