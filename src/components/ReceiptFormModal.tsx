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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { validateDate } from '../lib/validations';

interface ReceiptFormData {
  name: string;
  date: string;
  value: number;
  isFixed?: boolean;
  fixedDurationMonths?: number;
}

interface ReceiptFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => void;
  initialData?: ReceiptFormData & { id?: string };
}

export const ReceiptFormModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: ReceiptFormModalProps) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [value, setValue] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [fixedDurationMonths, setFixedDurationMonths] = useState<string>('');

  const formatCurrency = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (!numbers) return '';
    
    const amount = Number(numbers) / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleValueChange = (text: string) => {
    const formatted = formatCurrency(text);
    setValue(formatted);
  };

  const parseCurrency = (formattedValue: string): number => {
    const numbers = formattedValue.replace(/\D/g, '');
    return Number(numbers) / 100;
  };

  useEffect(() => {
    if (!visible) {
      setName('');
      setDate(new Date());
      setValue('');
      setPickerVisible(false);
      setIsFixed(false);
      setFixedDurationMonths('');
    } else if (initialData) {
      setName(initialData.name);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(initialData.value);
      setValue(formattedValue);
      setIsFixed(initialData.isFixed ?? false);
      setFixedDurationMonths(initialData.fixedDurationMonths ? String(initialData.fixedDurationMonths) : '');
    } else {
      // Valores padrão quando não há initialData
      setName('');
      setDate(new Date());
      setValue('');
      setIsFixed(false);
      setFixedDurationMonths('');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o nome do recebimento.');
      return;
    }
    if (!value || parseCurrency(value) <= 0) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o valor do recebimento.');
      return;
    }
    
    // Validação de data
    const formattedDate = dayjs(date).format('DD/MM/YYYY');
    const dateValidation = validateDate(formattedDate, {
      allowFuture: true,
      allowPast: true,
    });
    
    if (!dateValidation.isValid) {
      Alert.alert('Data inválida', dateValidation.errorMessage || 'Por favor, verifique a data informada.');
      return;
    }
    
    onSubmit({
      name: name.trim(),
      date: formattedDate,
      value: parseCurrency(value),
      isFixed,
      fixedDurationMonths: isFixed && fixedDurationMonths ? parseInt(fixedDurationMonths, 10) : undefined,
    });
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
          <Text style={styles.title}>
            {initialData ? 'Editar Recebimento' : 'Novo Recebimento'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Serviços prestados"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Valor *</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={handleValueChange}
              placeholder="R$ 0,00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsFixed(!isFixed)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isFixed && styles.checkboxChecked]}>
                {isFixed && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Recebimento fixo</Text>
                <Text style={styles.checkboxHint}>
                  Este recebimento será gerado automaticamente todo mês
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {isFixed && (
            <View style={styles.field}>
              <Text style={styles.label}>Duração (meses)</Text>
              <Text style={styles.hint}>
                Número de meses que o recebimento será gerado. Deixe em branco para duração indefinida.
              </Text>
              <TextInput
                style={styles.input}
                value={fixedDurationMonths}
                onChangeText={(text) => {
                  const numbers = text.replace(/\D/g, '');
                  setFixedDurationMonths(numbers);
                }}
                placeholder="Ex: 3 (para 3 meses)"
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, (!name.trim() || !value || parseCurrency(value) <= 0) && styles.disabledButton]}
              disabled={!name.trim() || !value || parseCurrency(value) <= 0}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {initialData ? 'Salvar alterações' : 'Salvar'}
              </Text>
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabelContainer: {
    flex: 1,
    gap: 4,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  checkboxHint: {
    fontSize: 12,
    color: '#6C6C70',
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: 4,
    marginBottom: 8,
  },
});

