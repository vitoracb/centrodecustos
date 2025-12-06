import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseDocument } from '../context/FinancialContext';
import { FileText, X, Plus, Image as ImageIcon, Trash2 } from 'lucide-react-native';

interface ExpenseDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  documents: ExpenseDocument[];
  onDocumentPress: (document: ExpenseDocument) => void;
  onDeleteDocument?: (document: ExpenseDocument) => void;
  onAddDocument?: () => void;
  onAddPhoto?: () => void;
  onAddPaymentReceiptDocument?: () => void;
  onAddPaymentReceiptPhoto?: () => void;
  isUploading?: boolean;
}

export const ExpenseDocumentsModal = ({
  visible,
  onClose,
  documents,
  onDocumentPress,
  onDeleteDocument,
  onAddDocument,
  onAddPhoto,
  onAddPaymentReceiptDocument,
  onAddPaymentReceiptPhoto,
  isUploading = false,
}: ExpenseDocumentsModalProps) => {
  const getDocumentTypeLabel = (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' | 'boleto') => {
    switch (type) {
      case 'nota_fiscal':
        return 'Nota Fiscal';
      case 'recibo':
        return 'Recibo';
      case 'comprovante_pagamento':
        return 'Comprovante de Pagamento';
      case 'boleto':
        return 'Boleto';
      default:
        return 'Documento';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Documentos da Despesa</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhum documento anexado a esta despesa.
              </Text>
            </View>
          ) : (
            documents.map((doc, index) => (
              <View key={index} style={styles.documentCard}>
                <TouchableOpacity
                  style={styles.documentCardContent}
                  onPress={() => onDocumentPress(doc)}
                >
                  <View style={styles.documentIcon}>
                    <FileText size={20} color="#0A84FF" />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentType}>
                      {getDocumentTypeLabel(doc.type)}
                    </Text>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                  </View>
                </TouchableOpacity>
                {onDeleteDocument && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Excluir documento',
                        `Tem certeza que deseja excluir "${doc.fileName}"?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: () => onDeleteDocument(doc),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          {onAddDocument && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddDocument}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#0A84FF" />
                  <Text style={styles.addButtonText}>Enviando...</Text>
                </>
              ) : (
                <>
                  <Plus size={18} color="#0A84FF" />
                  <Text style={styles.addButtonText}>Adicionar documento</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {onAddPhoto && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddPhoto}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <ImageIcon size={18} color="#0A84FF" />
              <Text style={styles.addButtonText}>Adicionar foto</Text>
            </TouchableOpacity>
          )}

          {(onAddPaymentReceiptDocument || onAddPaymentReceiptPhoto) && (
            <TouchableOpacity
              style={[styles.addButton, styles.paymentReceiptButton]}
              onPress={onAddPaymentReceiptDocument || onAddPaymentReceiptPhoto}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#34C759" />
                  <Text style={[styles.addButtonText, styles.paymentReceiptButtonText]}>
                    Enviando comprovante...
                  </Text>
                </>
              ) : (
                <>
                  <Plus size={18} color="#34C759" />
                  <Text style={[styles.addButtonText, styles.paymentReceiptButtonText]}>
                    Adicionar comprovante de pagamento
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  documentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
    marginBottom: 4,
  },
  documentName: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  paymentReceiptButton: {
    borderColor: '#34C759',
    backgroundColor: '#F0FDF4',
  },
  paymentReceiptButtonText: {
    color: '#34C759',
  },
});

