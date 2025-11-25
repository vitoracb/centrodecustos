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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ContractCategory } from '../context/ContractContext';

const CATEGORY_LABELS: Record<ContractCategory, string> = {
  principal: 'Principal',
  terceirizados: 'Terceirizado',
};

interface ContractFormData {
  name: string;
  category: ContractCategory;
  date: string;
  docs: number;
  value?: number;
  documents: { fileName: string; fileUri: string; mimeType?: string | null }[];
}

interface ContractFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => void;
}

export const ContractFormModal = ({
  visible,
  onClose,
  onSubmit,
}: ContractFormModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ContractCategory>('principal');
  const [date, setDate] = useState(new Date());
  const [value, setValue] = useState('');
  const [documents, setDocuments] = useState<
    { fileName: string; fileUri: string; mimeType?: string | null }[]
  >([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const formatCurrency = (text: string): string => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const amount = Number(numbers) / 100;
    
    // Formata como moeda brasileira
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
      setCategory('principal');
      setDate(new Date());
      setValue('');
      setDocuments([]);
      setPickerVisible(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      date: dayjs(date).format('DD/MM/YYYY'),
      docs: documents.length,
      value: value ? parseCurrency(value) : undefined,
      documents,
    });
    onClose();
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setDocuments((prev) => [
        ...prev,
        {
          fileName: asset.name ?? 'Documento',
          fileUri: asset.uri,
          mimeType: asset.mimeType,
        },
      ]);
    }
  };

  const handlePickFromAlbum = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length) {
      const asset = result.assets[0];
      setDocuments((prev) => [
        ...prev,
        {
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      ]);
    }
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
          <Text style={styles.title}>Novo Contrato</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome do contrato *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Serviços de TI"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryRow}>
              {(Object.keys(CATEGORY_LABELS) as ContractCategory[]).map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
            <Text style={styles.label}>Valor do contrato</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={handleValueChange}
              placeholder="R$ 0,00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Documentos do contrato</Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument}>
                <Text style={styles.uploadText}>Adicionar arquivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickFromAlbum}
              >
                <Text style={styles.uploadText}>Adicionar foto</Text>
              </TouchableOpacity>
            </View>
            {documents.length > 0 ? (
              <View style={styles.documentList}>
                {documents.map((doc, index) => (
                  <View key={`${doc.fileUri}-${index}`} style={styles.documentItem}>
                    <Text style={styles.documentName}>{doc.fileName}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.documentHint}>
                Nenhum documento selecionado ainda.
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, !name.trim() && styles.disabledButton]}
              disabled={!name.trim()}
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
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryUploadButton: {
    borderColor: '#E5E5EA',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  secondaryUploadText: {
    color: '#1C1C1E',
  },
  documentList: {
    marginTop: 10,
    gap: 8,
  },
  documentItem: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  documentName: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  documentHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#6C6C70',
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

