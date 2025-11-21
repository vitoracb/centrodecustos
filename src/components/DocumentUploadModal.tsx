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
import * as DocumentPicker from 'expo-document-picker';

interface DocumentData {
  name: string;
  date: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentData) => void;
  initialData?: DocumentData;
}

export const DocumentUploadModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: DocumentUploadModalProps) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [file, setFile] = useState<{
    fileName: string;
    fileUri: string;
    mimeType?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setName(initialData.name);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      setFile({
        fileName: initialData.fileName,
        fileUri: initialData.fileUri,
        mimeType: initialData.mimeType,
      });
    } else {
      setName('');
      setDate(new Date());
      setFile(null);
    }
  }, [visible, initialData]);

  const isEditing = !!initialData;

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setFile({
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType,
      });
    }
  };

  const currentFile = file;
  const canSubmit = !!currentFile && !!name.trim();

  const handleSave = () => {
    if (!currentFile || !name.trim()) {
      return;
    }
    onSubmit({
      name,
      date: dayjs(date).format('DD/MM/YYYY'),
      fileName: currentFile.fileName,
      fileUri: currentFile.fileUri,
      mimeType: currentFile.mimeType,
    });
    setName('');
    setDate(new Date());
    setFile(null);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Editar Documento' : 'Novo Documento'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nome do documento</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nota fiscal"
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
            <Text style={styles.label}>Arquivo</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile}>
              <Text style={styles.uploadText}>
                {file ? file.fileName : 'Selecionar arquivo (PDF/Imagem)'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
              disabled={!canSubmit}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {isEditing ? 'Salvar alterações' : 'Enviar'}
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
  header: {
    alignItems: 'center',
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
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  uploadButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
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

