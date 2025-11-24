import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useOrders, Order } from '../context/OrderContext';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderBudgetModal } from '../components/OrderBudgetModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { Plus, ChevronRight, UploadCloud, FileText } from 'lucide-react-native';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const statusLabels: Record<string, string> = {
  orçamento_pendente: 'Orçamento pendente',
  orçamento_enviado: 'Orçamento enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  orçamento_pendente: {
    backgroundColor: '#FFF3D6',
    color: '#FF9500',
  },
  orçamento_enviado: {
    backgroundColor: '#E9FAF0',
    color: '#34C759',
  },
  aprovado: {
    backgroundColor: '#E9FAF0',
    color: '#34C759',
  },
  rejeitado: {
    backgroundColor: '#FDECEC',
    color: '#FF3B30',
  },
};

export const PedidosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { getOrdersByCenter, addOrder, updateOrder, orders, markOrderAsRead } = useOrders();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedOrderForBudget, setSelectedOrderForBudget] = useState<Order | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Filtra pedidos pelo centro de custo selecionado
  const ordersList = useMemo(
    () => getOrdersByCenter(selectedCenter),
    [selectedCenter, orders]
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <CostCenterSelector />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Pedidos</Text>
            <Text style={styles.subtitle}>
              Controle os pedidos do centro {centerLabels[selectedCenter]}
            </Text>
          </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => setIsFormVisible(true)}
        >
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.primaryButtonText}>Novo Pedido</Text>
        </TouchableOpacity>

          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de Pedidos</Text>
            <TouchableOpacity>
              <Text style={styles.link}>Filtrar período</Text>
            </TouchableOpacity>
          </View>

          {ordersList.length > 0 ? (
            ordersList.map((order) => (
            <View key={order.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => {
                  setSelectedOrder(order);
                  // Se tiver orçamento enviado, abre o preview diretamente
                  if (order.status === 'orçamento_enviado' && order.budget) {
                    setPreviewFile({
                      uri: order.budget.fileUri,
                      name: order.budget.fileName,
                      mimeType: order.budget.mimeType,
                    });
                    setPreviewVisible(true);
                    // Marca como lido quando abre o preview
                    markOrderAsRead(order.id);
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{order.name}</Text>
                  <Text style={styles.cardSubtitle}>{order.description}</Text>
                </View>
                <ChevronRight size={18} color="#C7C7CC" />
              </TouchableOpacity>
              <View style={styles.cardMeta}>
                <Text style={styles.metaLabel}>Data do pedido</Text>
                <Text style={styles.metaValue}>{order.date}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      statusStyles[order.status as keyof typeof statusStyles]
                        .backgroundColor,
                  },
                  order.status === 'orçamento_enviado' && order.budget && styles.statusPillClickable,
                ]}
                onPress={() => {
                  if (order.status === 'orçamento_enviado' && order.budget) {
                    setPreviewFile({
                      uri: order.budget.fileUri,
                      name: order.budget.fileName,
                      mimeType: order.budget.mimeType,
                    });
                    setPreviewVisible(true);
                    // Marca como lido quando abre o preview
                    markOrderAsRead(order.id);
                  }
                }}
                disabled={order.status !== 'orçamento_enviado' || !order.budget}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        statusStyles[
                          order.status as keyof typeof statusStyles
                        ].color,
                    },
                  ]}
                >
                  {statusLabels[order.status as keyof typeof statusLabels]}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => {
                    setSelectedOrder(order);
                    // Se tiver orçamento enviado, abre o preview
                    if (order.status === 'orçamento_enviado' && order.budget) {
                      setPreviewFile({
                        uri: order.budget.fileUri,
                        name: order.budget.fileName,
                        mimeType: order.budget.mimeType,
                      });
                      setPreviewVisible(true);
                      // Marca como lido quando abre o preview
                      markOrderAsRead(order.id);
                    }
                  }}
                >
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Detalhes</Text>
                </TouchableOpacity>
                {order.status === 'orçamento_pendente' && (
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => {
                      setSelectedOrderForBudget(order);
                      setBudgetModalVisible(true);
                    }}
                  >
                    <UploadCloud size={16} color="#0A84FF" />
                    <Text style={styles.actionText}>Enviar orçamento</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhum pedido encontrado para este centro de custo.
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      </View>
      <OrderFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={(data) => {
          addOrder({
            name: data.name,
            description: data.observations || '',
            date: data.date,
            status: 'orçamento_pendente',
            center: selectedCenter,
            equipmentId: data.equipmentId,
          });
          setIsFormVisible(false);
        }}
      />
      <OrderBudgetModal
        visible={isBudgetModalVisible}
        onClose={() => {
          setBudgetModalVisible(false);
          setSelectedOrderForBudget(null);
        }}
        onSubmit={(budget) => {
          if (selectedOrderForBudget) {
            const updatedOrder = {
              ...selectedOrderForBudget,
              status: 'orçamento_enviado' as const,
              budget,
            };
            updateOrder(updatedOrder);
            setSelectedOrderForBudget(null);
          }
        }}
      />
      <FilePreviewModal
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
        }}
        onSave={() => {
          // Quando salva o arquivo, também marca como lido
          if (selectedOrder) {
            markOrderAsRead(selectedOrder.id);
          }
        }}
        fileUri={previewFile?.uri}
        fileName={previewFile?.name}
        mimeType={previewFile?.mimeType}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    paddingTop: 8,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 15,
    color: '#6C6C70',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  link: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillClickable: {
    opacity: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F9F9FB',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6C6C70',
    fontSize: 14,
    textAlign: 'center',
  },
});
