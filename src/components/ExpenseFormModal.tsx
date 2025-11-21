import React, { useState } from 'react';
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

interface ExpenseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: string;
    category: string;
    method: string;
    status: string;
    date: string;
  }) => void;
}

const STATUS_OPTIONS = ['Previsto', 'Pago'];

export const ExpenseFormModal = ({
  visible,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState(STATUS_OPTIONS[0]);
  const [date, setDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSave = () => {
    if (!description.trim() || !amount.trim()) {
      return;
    }
    onSubmit({
      description,
      amount,
      category,
      method,
      status,
      date: dayjs(date).format('DD/MM/YYYY'),
    });
    setDescription('');
    setAmount('');
    setCategory('');
    setMethod('');
    setStatus(STATUS_OPTIONS[0]);
    setDate(new Date());
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Nova Despesa</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Manutenção preventiva"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Valor *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Data</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Categoria</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Ex: Serviços"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Forma de pagamento</Text>
            <TextInput
              style={styles.input}
              value={method}
              onChangeText={setMethod}
              placeholder="Transferência, cartão..."
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const selected = status === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.statusChip, selected && styles.statusChipSelected]}
                    onPress={() => setStatus(option)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        selected && styles.statusChipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!description.trim() || !amount.trim()) && styles.disabledButton,
              ]}
              disabled={!description.trim() || !amount.trim()}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>Salvar</Text>
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
  },
  inputText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusChip: {
    paddingHorizontal: 16,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
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

