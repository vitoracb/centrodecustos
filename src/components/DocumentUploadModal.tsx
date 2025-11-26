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
import * as ImagePicker from 'expo-image-picker';
import { FileText, Image as ImageIcon } from 'lucide-react-native';
import { validateDate, validateFile, checkFileSizeAndAlert } from '../lib/validations';
import { Alert } from 'react-native';

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
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      
      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo
      const allowedTypes = ['application/pdf', 'image/*'];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType,
        asset.name,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Tipo de arquivo não permitido');
        return;
      }

      setFile({
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType,
      });
    }
  };

  const handlePickPhoto = async () => {
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
      
      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo (imagens)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/*'];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.fileName,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Apenas imagens são permitidas');
        return;
      }

      setFile({
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const currentFile = file;
  const canSubmit = !!currentFile && !!name.trim();

  const handleSave = () => {
    if (!currentFile || !name.trim()) {
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
      name,
      date: formattedDate,
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
            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonHalf]} onPress={handlePickFile}>
                <FileText size={18} color="#0A84FF" />
                <Text style={styles.uploadText}>Selecionar arquivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadButton, styles.uploadButtonHalf]} onPress={handlePickPhoto}>
                <ImageIcon size={18} color="#0A84FF" />
                <Text style={styles.uploadText}>Selecionar foto</Text>
              </TouchableOpacity>
            </View>
            {file && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileInfoText} numberOfLines={1}>
                  {file.fileName}
                </Text>
              </View>
            )}
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
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonHalf: {
    flex: 1,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  fileInfo: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
  },
  fileInfoText: {
    fontSize: 13,
    color: '#6C6C70',
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

