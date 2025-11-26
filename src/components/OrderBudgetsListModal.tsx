import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { X, FileText, Image as ImageIcon } from 'lucide-react-native';
import { OrderDocument } from '../context/OrderContext';

interface OrderBudgetsListModalProps {
  visible: boolean;
  onClose: () => void;
  budgets: OrderDocument[];
  orderName: string;
  onBudgetPress: (budget: OrderDocument) => void;
}

export const OrderBudgetsListModal: React.FC<OrderBudgetsListModalProps> = ({
  visible,
  onClose,
  budgets,
  orderName,
  onBudgetPress,
}) => {
  const isImage = (mimeType: string | null) => mimeType?.startsWith('image/') ?? false;
  const isPdf = (mimeType: string | null) => 
    mimeType === 'application/pdf' || 
    (mimeType === null && false);

  const getFileTypeIcon = (mimeType: string | null) => {
    if (isImage(mimeType)) {
      return <ImageIcon size={20} color="#0A84FF" />;
    }
    return <FileText size={20} color="#0A84FF" />;
  };

  const getFileTypeLabel = (mimeType: string | null) => {
    if (isImage(mimeType)) return 'Imagem';
    if (isPdf(mimeType)) return 'PDF';
    return 'Documento';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Orçamentos Enviados</Text>
              <Text style={styles.subtitle}>{orderName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {budgets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum orçamento enviado ainda.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {budgets.map((budget, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.budgetItem}
                    onPress={() => onBudgetPress(budget)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.budgetItemTop}>
                      <View style={styles.budgetItemNameContainer}>
                        <Text style={styles.budgetItemName} numberOfLines={3}>
                          {budget.fileName || `Orçamento ${index + 1}`}
                        </Text>
                      </View>
                      <View style={styles.budgetItemNumber}>
                        <Text style={styles.budgetItemNumberText}>
                          #{index + 1}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.budgetItemBottom}>
                      <View style={styles.iconContainer}>
                        {getFileTypeIcon(budget.mimeType)}
                      </View>
                      <Text style={styles.budgetItemType}>
                        {getFileTypeLabel(budget.mimeType)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C6C70',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  budgetItem: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetItemNameContainer: {
    flex: 1,
    marginRight: 12,
    paddingRight: 8,
  },
  budgetItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  budgetItemNumber: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  budgetItemNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A84FF',
  },
  budgetItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  budgetItemType: {
    fontSize: 14,
    color: '#6C6C70',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6C6C70',
    textAlign: 'center',
  },
});

