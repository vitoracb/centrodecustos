import React, { useEffect, useState } from 'react';
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

interface ReviewFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: string;
    description: string;
    date: string;
    next?: string;
  }) => void;
  initialData?: {
    type: string;
    description: string;
    date: string;
    next?: string;
  };
}

export const ReviewFormModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: ReviewFormModalProps) => {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [nextDate, setNextDate] = useState<Date | undefined>(undefined);
  const [datePicker, setDatePicker] = useState<'current' | 'next' | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      if (initialData.next) {
        const parsedNext = dayjs(initialData.next, 'DD/MM/YYYY');
        setNextDate(parsedNext.isValid() ? parsedNext.toDate() : undefined);
      } else {
        setNextDate(undefined);
      }
    } else {
      setType('');
      setDescription('');
      setDate(new Date());
      setNextDate(undefined);
    }
  }, [visible, initialData]);

  const isEditing = !!initialData;

  const handleSave = () => {
    if (!type.trim() || !description.trim()) {
      return;
    }
    onSubmit({
      type,
      description,
      date: dayjs(date).format('DD/MM/YYYY'),
      next: nextDate ? dayjs(nextDate).format('DD/MM/YYYY') : undefined,
    });
    setType('');
    setDescription('');
    setDate(new Date());
    setNextDate(undefined);
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
            {isEditing ? 'Editar Revisão' : 'Adicionar Revisão'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Tipo *</Text>
            <TextInput
              style={styles.input}
              value={type}
              onChangeText={setType}
              placeholder="Ex: Revisão geral"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhes da revisão"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Data</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setDatePicker('current')}
              >
                <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>Próxima (opcional)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setDatePicker('next')}
              >
                <Text style={styles.inputText}>
                  {nextDate ? dayjs(nextDate).format('DD/MM/YYYY') : 'Definir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!type.trim() || !description.trim()) && styles.disabledButton,
              ]}
              disabled={!type.trim() || !description.trim()}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {isEditing ? 'Salvar alterações' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {datePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={datePicker === 'current' ? date : nextDate ?? new Date()}
              onChange={(_, selectedDate) => {
                setDatePicker(null);
                if (selectedDate) {
                  if (datePicker === 'current') setDate(selectedDate);
                  else setNextDate(selectedDate);
                }
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

