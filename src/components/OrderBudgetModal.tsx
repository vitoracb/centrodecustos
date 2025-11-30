import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { OrderDocument } from '../context/OrderContext';
import { validateFile, checkFileSizeAndAlert } from '../lib/validations';

interface OrderBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (budget: OrderDocument) => void;
}

export const OrderBudgetModal = ({
  visible,
  onClose,
  onSubmit,
}: OrderBudgetModalProps) => {
  const handlePickDocument = async () => {
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

      onSubmit({
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? null,
      });
      onClose();
    }
  };

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
      allowsEditing: false,
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

      onSubmit({
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      onClose();
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

      onSubmit({
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      onClose();
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

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Enviar Orçamento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Escolha como deseja enviar o orçamento
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePickDocument}
            >
              <View style={styles.optionIcon}>
                <FileText size={24} color="#0A84FF" />
              </View>
              <Text style={styles.optionTitle}>Documento</Text>
              <Text style={styles.optionDescription}>
                Selecione um arquivo PDF ou imagem dos documentos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handlePickPhoto}
            >
              <View style={styles.optionIcon}>
                <ImageIcon size={24} color="#0A84FF" />
              </View>
              <Text style={styles.optionTitle}>Foto</Text>
              <Text style={styles.optionDescription}>
                Tire uma foto ou escolha do álbum
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    gap: 20,
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
    padding: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6C6C70',
    textAlign: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

