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
  ActionSheetIOS,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import { validateDate, validateFile, checkFileSizeAndAlert } from '../lib/validations';
import { Alert } from 'react-native';
import { Image } from 'expo-image';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    date: string;
    uri: string;
    fileName: string;
    mimeType?: string | null;
  }) => void;
  initialData?: {
    title: string;
    date: string;
    uri: string;
    fileName: string;
    mimeType?: string | null;
  };
}

export const PhotoUploadModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: PhotoUploadModalProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [photo, setPhoto] = useState<{
    uri: string;
    fileName: string;
    mimeType?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setTitle(initialData.title);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      setPhoto({
        uri: initialData.uri,
        fileName: initialData.fileName,
        mimeType: initialData.mimeType,
      });
    } else {
      setTitle('');
      setDate(new Date());
      setPhoto(null);
    }
  }, [visible, initialData]);

  const isEditing = !!initialData;

  const handlePickPhotoFromCamera = async () => {
    // Solicita permissão da câmera
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    // Se o usuário cancelou, não faz nada
    if (result.canceled) {
      return;
    }

    // Se tirou a foto, processa
    if (result.assets && result.assets.length > 0) {
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

      setPhoto({
        uri: asset.uri,
        fileName: asset.fileName ?? 'Foto',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const handlePickPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
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

      setPhoto({
        uri: asset.uri,
        fileName: asset.fileName ?? 'Foto',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const handlePickPhoto = () => {
    // Mostra um menu com as opções antes de abrir a câmera
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tirar foto', 'Escolher do álbum'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Tirar foto (câmera) - primeira opção
            handlePickPhotoFromCamera();
          } else if (buttonIndex === 2) {
            // Escolher do álbum - segunda opção
            handlePickPhotoFromLibrary();
          }
        }
      );
    } else {
      // Android: mostra um Alert com as opções
      Alert.alert(
        'Selecionar foto',
        'Escolha uma opção',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tirar foto', onPress: handlePickPhotoFromCamera },
          { text: 'Escolher do álbum', onPress: handlePickPhotoFromLibrary },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSave = () => {
    if (!photo || !title.trim()) return;
    
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
      title,
      date: formattedDate,
      uri: photo.uri,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
    });
    setTitle('');
    setDate(new Date());
    setPhoto(null);
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
          <Text style={styles.title}>{isEditing ? 'Editar Foto' : 'Nova Foto'}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Inspeção anual"
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

          {photo ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.preview}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <Text style={styles.previewName}>{photo.fileName}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickPhoto}>
            <Text style={styles.uploadText}>
              {photo ? 'Trocar foto' : 'Selecionar foto'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!photo || !title.trim()) && styles.disabledButton,
              ]}
              disabled={!photo || !title.trim()}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {isEditing ? 'Salvar alterações' : 'Salvar'}
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
  previewContainer: {
    alignItems: 'center',
    gap: 6,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  previewName: {
    fontSize: 13,
    color: '#6C6C70',
  },
  uploadButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '600',
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
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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

