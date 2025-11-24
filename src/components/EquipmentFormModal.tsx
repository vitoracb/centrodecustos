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
import { CostCenter, useCostCenter } from '../context/CostCenterContext';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

interface EquipmentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    name: string;
    brand: string;
    year: string;
    purchaseDate: string;
    nextReview: string;
    costCenter: CostCenter;
  }) => void;
  initialData?: {
    name: string;
    brand: string;
    year: string;
    purchaseDate: string;
    nextReview: string;
  };
}

export const EquipmentFormModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: EquipmentFormModalProps) => {
  const { selectedCenter } = useCostCenter();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [nextReviewDatePickerVisible, setNextReviewDatePickerVisible] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState(new Date());

  // Atualiza os campos quando initialData muda ou quando o modal abre
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setBrand(initialData.brand);
        setYear(initialData.year);
        const parsedPurchaseDate = dayjs(initialData.purchaseDate, 'DD/MM/YYYY');
        setPurchaseDate(parsedPurchaseDate.isValid() ? parsedPurchaseDate.toDate() : new Date());
        const parsedNextReview = dayjs(initialData.nextReview, 'DD/MM/YYYY');
        setNextReviewDate(parsedNextReview.isValid() ? parsedNextReview.toDate() : new Date());
      } else {
        setName('');
        setBrand('');
        setYear('');
        setPurchaseDate(new Date());
        setNextReviewDate(new Date());
      }
    }
  }, [visible, initialData]);

  const handleSave = () => {
    onSubmit?.({
      name,
      brand,
      year,
      purchaseDate: dayjs(purchaseDate).format('DD/MM/YYYY'),
      nextReview: dayjs(nextReviewDate).format('DD/MM/YYYY'),
      costCenter: selectedCenter,
    });
    onClose();
    setName('');
    setBrand('');
    setYear('');
    setPurchaseDate(new Date());
    setNextReviewDate(new Date());
  };

  return (
    <Modal animationType="slide" visible={visible} transparent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => {
            setDatePickerVisible(false);
            setNextReviewDatePickerVisible(false);
            onClose();
          }} 
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerAction}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {initialData ? 'Editar Equipamento' : 'Novo Equipamento'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.headerAction, styles.saveAction]}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Digite o nome"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                value={brand}
                onChangeText={setBrand}
                placeholder="Ex: John Deere"
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.rowItem]}>
                <Text style={styles.label}>Ano</Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder="2024"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, styles.rowItem]}>
                <Text style={styles.label}>Data da compra</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text style={{ color: '#1C1C1E' }}>
                    {dayjs(purchaseDate).format('DD/MM/YYYY')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Data da próxima revisão</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setNextReviewDatePickerVisible(true)}
              >
                <Text style={{ color: '#1C1C1E' }}>
                  {dayjs(nextReviewDate).format('DD/MM/YYYY')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Centro selecionado</Text>
              <Text style={styles.summaryValue}>{centerLabels[selectedCenter]}</Text>
            </View>

          </ScrollView>
        </View>
        
        {datePickerVisible && (
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={purchaseDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setPurchaseDate(date);
                    setDatePickerVisible(false);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.datePickerButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {nextReviewDatePickerVisible && (
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={nextReviewDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setNextReviewDate(date);
                    setNextReviewDatePickerVisible(false);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setNextReviewDatePickerVisible(false)}
              >
                <Text style={styles.datePickerButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingBottom: 24,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    marginTop: 8,
    marginBottom: 12,
  },
  fullScreen: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C6C70',
  },
  saveAction: {
    color: '#0A84FF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  summary: {
    backgroundColor: '#F5F5F7',
    padding: 12,
    borderRadius: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  datePickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
  },
  datePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

