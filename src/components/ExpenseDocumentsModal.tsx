import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseDocument } from '../context/FinancialContext';
import { FileText, X } from 'lucide-react-native';

interface ExpenseDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  documents: ExpenseDocument[];
  onDocumentPress: (document: ExpenseDocument) => void;
}

export const ExpenseDocumentsModal = ({
  visible,
  onClose,
  documents,
  onDocumentPress,
}: ExpenseDocumentsModalProps) => {
  const getDocumentTypeLabel = (type: 'nota_fiscal' | 'recibo') => {
    return type === 'nota_fiscal' ? 'Nota Fiscal' : 'Recibo';
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
              <TouchableOpacity
                key={index}
                style={styles.documentCard}
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
            ))
          )}
        </ScrollView>
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
});

