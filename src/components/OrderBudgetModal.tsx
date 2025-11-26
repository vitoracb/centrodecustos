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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { OrderDocument } from '../context/OrderContext';

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
      onSubmit({
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? null,
      });
      onClose();
    }
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Por favor, conceda acesso à galeria de fotos para selecionar uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length) {
      const asset = result.assets[0];
      onSubmit({
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      onClose();
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
              <Text style={styles.optionTitle}>Foto do Álbum</Text>
              <Text style={styles.optionDescription}>
                Selecione uma foto da galeria do dispositivo
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

