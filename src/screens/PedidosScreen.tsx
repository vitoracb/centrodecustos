import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useOrders, Order } from '../context/OrderContext';
import { useEquipment } from '../context/EquipmentContext';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderBudgetModal } from '../components/OrderBudgetModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { OrderFilterModal, OrderFilters } from '../components/OrderFilterModal';
import {
  Plus,
  ChevronRight,
  UploadCloud,
  FileText,
  Trash2,
  Filter,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const statusLabels: Record<string, string> = {
  orcamento_solicitado: 'Orçamento solicitado',
  orcamento_pendente: 'Orçamento pendente',
  orcamento_enviado: 'Orçamento enviado',
  orcamento_aprovado: 'Orçamento aprovado',
  em_execucao: 'Em execução',
  finalizado: 'Finalizado',
};

const statusStyles: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  orcamento_solicitado: {
    backgroundColor: '#E3F2FD',
    color: '#0A84FF',
  },
  orcamento_pendente: {
    backgroundColor: '#FFF3D6',
    color: '#FF9500',
  },
  orcamento_enviado: {
    backgroundColor: '#E9FAF0',
    color: '#34C759',
  },
  orcamento_aprovado: {
    backgroundColor: '#E6FEEA',
    color: '#1B8A2F',
  },
  em_execucao: {
    backgroundColor: '#E5F2FF',
    color: '#0A84FF',
  },
  finalizado: {
    backgroundColor: '#ECECEC',
    color: '#636366',
  },
};

const defaultStatusStyle = {
  backgroundColor: '#EFEFEF',
  color: '#1C1C1E',
};

const parseOrderDate = (order: Order) => {
  const source = order.orderDate || order.date;
  const parsed = dayjs(source, 'DD/MM/YYYY', true);
  return parsed.isValid() ? parsed : null;
};

const getOrderTimestamp = (order: Order) => {
  const parsed = parseOrderDate(order);
  if (parsed) return parsed.valueOf();
  return order.createdAt ?? 0;
};

export const PedidosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const {
    getOrdersByCenter,
    addOrder,
    updateOrder,
    deleteOrder,
    orders,
    markOrderAsRead,
  } = useOrders();
  const { getEquipmentsByCenter } = useEquipment();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrderForBudget, setSelectedOrderForBudget] = useState<Order | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openBudgetPreview = (order: Order) => {
    if (order.status === 'orcamento_enviado' && order.budget) {
      setPreviewFile({
        uri: order.budget.fileUri,
        name: order.budget.fileName,
        mimeType: order.budget.mimeType,
      });
      setPreviewVisible(true);
      markOrderAsRead(order.id);
    } else {
      Alert.alert(
        'Nenhum orçamento disponível',
        'Ainda não há um orçamento enviado para este pedido.',
      );
    }
  };

  const handleDeleteOrder = (order: Order) => {
    const hasBudget = order.status === 'orcamento_enviado';
    const title = hasBudget ? 'Excluir pedido com orçamento' : 'Excluir pedido';
    const message = hasBudget
      ? 'Este pedido já possui um orçamento enviado. Se você prosseguir, o orçamento será removido junto com o pedido. Deseja continuar?'
      : 'Deseja realmente excluir este pedido?';

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteOrder(order.id).catch(err =>
            console.error('Erro ao excluir pedido:', err),
          );
        },
      },
    ]);
  };

  const equipments = getEquipmentsByCenter(selectedCenter);
  const equipmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    equipments.forEach(eq => {
      map[eq.id] = eq.name;
    });
    return map;
  }, [equipments]);

  const filteredOrders = useMemo(() => {
    const base = getOrdersByCenter(selectedCenter);
    let list = [...base];

    if (filters.name) {
      const term = filters.name.toLowerCase();
      list = list.filter(order => order.name.toLowerCase().includes(term));
    }

    if (filters.equipmentId) {
      list = list.filter(order => order.equipmentId === filters.equipmentId);
    }

    const startValue = filters.startDate
      ? dayjs(filters.startDate, 'YYYY-MM-DD', true).startOf('day').valueOf()
      : null;
    const endValue = filters.endDate
      ? dayjs(filters.endDate, 'YYYY-MM-DD', true).endOf('day').valueOf()
      : null;

    if (startValue !== null || endValue !== null) {
      list = list.filter(order => {
        const parsed = parseOrderDate(order);
        if (!parsed) {
          // sem data válida, não entra no intervalo
          return false;
        }
        const value = parsed.valueOf();
        if (startValue !== null && value < startValue) {
          return false;
        }
        if (endValue !== null && value > endValue) {
          return false;
        }
        return true;
      });
    }

    return list.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }, [filters, getOrdersByCenter, selectedCenter, orders]);

  const hasActiveFilters = Boolean(
    filters.name || filters.equipmentId || filters.startDate || filters.endDate,
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
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  hasActiveFilters && styles.filterButtonActive,
                ]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Filter
                  size={16}
                  color={hasActiveFilters ? '#FFFFFF' : '#0A84FF'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
            <View key={order.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => {
                  setSelectedOrder(order);
                  openBudgetPreview(order);
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
              {!!(order.equipmentId || order.equipmentName) && (
                <View style={styles.cardMeta}>
                  <Text style={styles.metaLabel}>Equipamento</Text>
                  <Text style={styles.metaValue}>
                    {order.equipmentName ??
                      (order.equipmentId ? equipmentMap[order.equipmentId] : '') ??
                      '—'}
                  </Text>
                </View>
              )}
              {/** status pill */}
              <TouchableOpacity
                style={[
                  styles.statusPill,
                  (() => {
                    const currentStyle =
                      statusStyles[order.status] ?? defaultStatusStyle;
                    return { backgroundColor: currentStyle.backgroundColor };
                  })(),
                  order.status === 'orcamento_enviado' &&
                    order.budget &&
                    styles.statusPillClickable,
                ]}
                onPress={() => {
                  openBudgetPreview(order);
                }}
                disabled={order.status !== 'orcamento_enviado' || !order.budget}
              >
                <Text
                  style={[
                    styles.statusText,
                    (() => {
                      const currentStyle =
                        statusStyles[order.status] ?? defaultStatusStyle;
                      return { color: currentStyle.color };
                    })(),
                  ]}
                >
                  {statusLabels[order.status] ?? order.status}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => {
                    setSelectedOrder(order);
                    openBudgetPreview(order);
                  }}
                >
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Detalhes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionPill, styles.destructivePill]}
                  onPress={() => handleDeleteOrder(order)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={[styles.actionText, styles.destructiveText]}>
                    Excluir
                  </Text>
                </TouchableOpacity>
                {order.status === 'orcamento_pendente' && (
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
        onSubmit={async (data) => {
          try {
            await addOrder({
              name: data.name,
              description: data.observations || '',
              orderDate: data.date,
              status: 'orcamento_pendente',
              costCenter: selectedCenter,
              equipmentId: data.equipmentId,
            });
            setIsFormVisible(false);
          } catch (error) {
            console.error('Erro ao adicionar pedido:', error);
          }
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
            const updatedOrder: Order = {
              ...selectedOrderForBudget,
              status: 'orcamento_enviado',
              budget,
            };
            updateOrder(updatedOrder);
            setSelectedOrderForBudget(null);
          }
        }}
      />
      <OrderFilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
        equipments={equipments}
      />
      <FilePreviewModal
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#0A84FF',
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
  destructivePill: {
    backgroundColor: '#FDECEC',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  destructiveText: {
    color: '#FF3B30',
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
