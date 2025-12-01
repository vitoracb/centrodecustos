import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  FileText,
  Trash2,
  UploadCloud,
  ChevronDown,
  Edit3,
  Check,
  X,
  Filter,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useOrders, Order, OrderStatus } from '../context/OrderContext';
import { useEquipment } from '../context/EquipmentContext';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderBudgetModal } from '../components/OrderBudgetModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { OrderFilterModal, OrderFilters } from '../components/OrderFilterModal';
import { OrderListSkeleton } from '../components/skeletons/OrderListSkeleton';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const PAGE_SIZE = 10;

const statusLabels: Record<OrderStatus, string> = {
  orcamento_solicitado: 'Orçamento solicitado',
  orcamento_pendente: 'Orçamento pendente',
  orcamento_enviado: 'Orçamento enviado',
  orcamento_aprovado: 'Orçamento aprovado',
  orcamento_reprovado: 'Orçamento reprovado',
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
  orcamento_reprovado: {
    backgroundColor: '#FDECEC',
    color: '#FF3B30',
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

export default function PedidosScreen() {
  const { selectedCenter, costCenters } = useCostCenter();
  const {
    orders,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    approveOrder,
    rejectOrder,
    getOrdersByCenter,
    refresh,
  } = useOrders();
  const { getEquipmentsByCenter } = useEquipment();
  
  // Obtém o nome do centro de custo selecionado
  const selectedCenterName = costCenters.find(cc => cc.code === selectedCenter)?.name || selectedCenter;
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedOrderForBudget, setSelectedOrderForBudget] = useState<Order | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
    files?: Array<{ fileUri: string; fileName: string; mimeType: string | null }>;
    initialIndex?: number;
  } | null>(null);
  const [openDropdownOrderId, setOpenDropdownOrderId] = useState<string | null>(null);
  const [currentOrderForPreview, setCurrentOrderForPreview] = useState<Order | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({});
  const [orderPage, setOrderPage] = useState(1);

  const hasActiveFilters = useMemo(
    () => Object.values(orderFilters).some(value => value && value !== ''),
    [orderFilters],
  );

  const equipmentOptions = useMemo(
    () =>
      getEquipmentsByCenter(selectedCenter).map(equipment => ({
        id: equipment.id,
        name: equipment.name,
      })),
    [getEquipmentsByCenter, selectedCenter],
  );

  const filteredOrders = useMemo(() => {
    const ordersByCenter = getOrdersByCenter(selectedCenter);

    return ordersByCenter.filter(order => {
      if (orderFilters.name) {
        const nameMatch = order.name
          ?.toLowerCase()
          .includes(orderFilters.name.toLowerCase());
        if (!nameMatch) return false;
      }

      if (orderFilters.equipmentId && order.equipmentId !== orderFilters.equipmentId) {
        return false;
      }

      if (orderFilters.status && order.status !== orderFilters.status) {
        return false;
      }

      const orderDate = dayjs(order.date, 'DD/MM/YYYY', true);

      if (orderFilters.startDate) {
        const start = dayjs(orderFilters.startDate, 'YYYY-MM-DD', true);
        if (orderDate.isValid() && start.isValid() && orderDate.isBefore(start, 'day')) {
          return false;
        }
      }

      if (orderFilters.endDate) {
        const end = dayjs(orderFilters.endDate, 'YYYY-MM-DD', true);
        if (orderDate.isValid() && end.isValid() && orderDate.isAfter(end, 'day')) {
          return false;
        }
      }

      return true;
    });
  }, [getOrdersByCenter, selectedCenter, orderFilters]);
  
  // Encontra o pedido com dropdown aberto
  const orderWithOpenDropdown = filteredOrders.find(order => order.id === openDropdownOrderId);
  const orcamentosForModal = orderWithOpenDropdown?.documents?.filter(doc => {
    if (orderWithOpenDropdown.status === 'orcamento_aprovado') {
      return doc.type === "orcamento" && doc.approved === true && doc.fileUri && doc.fileUri.trim() !== '';
    }
    return doc.type === "orcamento" && doc.fileUri && doc.fileUri.trim() !== '';
  }) || [];

  useEffect(() => {
    setOrderPage(1);
  }, [
    selectedCenter,
    orderFilters.name,
    orderFilters.equipmentId,
    orderFilters.startDate,
    orderFilters.endDate,
    orderFilters.status,
  ]);

  const paginatedOrders = useMemo(
    () => filteredOrders.slice(0, orderPage * PAGE_SIZE),
    [filteredOrders, orderPage],
  );

  const hasMoreOrders = paginatedOrders.length < filteredOrders.length;

  const toggleBudgetDropdown = (orderId: string) => {
    if (openDropdownOrderId === orderId) {
      setOpenDropdownOrderId(null);
    } else {
      setOpenDropdownOrderId(orderId);
    }
  };

  const handleBudgetSelect = (order: Order, documentIndex?: number) => {
    setOpenDropdownOrderId(null);
    
    // Se o pedido foi aprovado, mostra apenas o orçamento aprovado
    // Se não foi aprovado, mostra todos os orçamentos enviados
    let orcamentos = order.documents?.filter(doc => doc.type === "orcamento") || [];
    
    if (order.status === 'orcamento_aprovado') {
      // Filtra apenas documentos aprovados
      orcamentos = orcamentos.filter(doc => doc.approved === true);
    }
    
    // Filtra apenas documentos com fileUri válido
    orcamentos = orcamentos.filter(doc => doc.fileUri && doc.fileUri.trim() !== '');
    
    if (orcamentos.length === 0) {
      Alert.alert(
        'Nenhum orçamento disponível',
        order.status === 'orcamento_aprovado' 
          ? 'Nenhum orçamento aprovado encontrado ou o arquivo não está disponível.'
          : 'Ainda não há um orçamento enviado para este pedido ou os arquivos não estão disponíveis.',
      );
      return;
    }

    // Se documentIndex não foi fornecido, usa o primeiro (ou último se houver múltiplos)
    const index = documentIndex !== undefined ? documentIndex : (orcamentos.length > 1 ? orcamentos.length - 1 : 0);
    const selectedDoc = orcamentos[index];
    
    if (!selectedDoc || !selectedDoc.fileUri) {
      Alert.alert(
        'Erro',
        'O documento selecionado não possui um arquivo válido.'
      );
      return;
    }

    // Mapeia todos os documentos válidos para o formato esperado
    const files = orcamentos.map(doc => ({
      fileUri: doc.fileUri!,
      fileName: doc.fileName || 'Orçamento',
      mimeType: doc.mimeType || null,
    }));
    
    setPreviewFile({
      uri: selectedDoc.fileUri,
      name: selectedDoc.fileName || 'Orçamento',
      mimeType: selectedDoc.mimeType || null,
      files: files.length > 0 ? files : undefined,
      initialIndex: index,
    });
    
    // Guarda o pedido atual para poder aprovar depois
    setCurrentOrderForPreview(order);
    setPreviewVisible(true);
  };

  const handleApproveBudget = async (currentFileUri?: string, currentIndex?: number) => {
    if (!currentOrderForPreview || !previewFile) return;

    // Verifica se já foi aprovado
    if (currentOrderForPreview.status === 'orcamento_aprovado') {
      Alert.alert('Aviso', 'Este orçamento já foi aprovado.');
      return;
    }

    // Encontra o documento atual sendo visualizado
    const orcamentos = currentOrderForPreview.documents?.filter(doc => 
      doc.type === "orcamento" && 
      doc.fileUri && 
      doc.fileUri.trim() !== ''
    ) || [];
    
    // Usa o fileUri atual passado pelo modal (após navegação) ou o fileUri do previewFile
    const targetFileUri = currentFileUri || previewFile.uri;
    
    // Tenta encontrar o documento pelo fileUri atual (mais confiável que índice)
    let currentDoc = orcamentos.find(doc => doc.fileUri === targetFileUri);
    
    // Se não encontrou pelo fileUri, tenta pelo índice (fallback)
    if (!currentDoc && currentIndex !== undefined && currentIndex >= 0 && currentIndex < orcamentos.length) {
      currentDoc = orcamentos[currentIndex];
    }
    
    // Se ainda não encontrou, usa o índice inicial como último recurso
    if (!currentDoc) {
      const fallbackIndex = previewFile.initialIndex !== undefined ? previewFile.initialIndex : 0;
      currentDoc = orcamentos[fallbackIndex];
    }

    if (!currentDoc) {
      Alert.alert('Erro', 'Não foi possível identificar o documento para aprovar.');
      return;
    }

    // Obtém o ID do documento
    let documentId = currentDoc.id;
    
    if (!documentId) {
      Alert.alert('Erro', 'Não foi possível identificar o documento para aprovar. O documento pode não ter sido salvo ainda.');
      return;
    }

    Alert.alert(
      'Aprovar Orçamento',
      `Deseja aprovar este orçamento: ${currentDoc.fileName || 'Orçamento'}? Apenas um orçamento pode ser aprovado por pedido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          style: 'default',
          onPress: async () => {
            try {
              await approveOrder(currentOrderForPreview.id, documentId);
              setPreviewVisible(false);
              setCurrentOrderForPreview(null);
              setPreviewFile(null);
              Alert.alert('Sucesso', 'Orçamento aprovado com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível aprovar o orçamento.');
            }
          },
        },
      ]
    );
  };

  const handleRejectOrder = async (order: Order) => {
    Alert.alert(
      'Rejeitar Orçamentos',
      'Deseja rejeitar todos os orçamentos deste pedido? O status será alterado para "Orçamento reprovado".',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectOrder(order.id);
              Alert.alert('Sucesso', 'Orçamentos rejeitados com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível rejeitar os orçamentos.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteOrder = (order: Order) => {
    const hasBudget = order.documents?.some(doc => doc.type === "orcamento") || false;
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

  const handleLoadMoreOrders = () => {
    if (hasMoreOrders) {
      setOrderPage(prev => prev + 1);
    }
  };

  const shouldShowSkeleton = loading && !refreshing;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <CostCenterSelector />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Pedidos</Text>
            <Text style={styles.subtitle}>
              Controle os pedidos do centro {selectedCenterName}
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
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  hasActiveFilters && styles.filterButtonActive,
                ]}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.8}
              >
                <Filter
                  size={18}
                  color={hasActiveFilters ? '#FFFFFF' : '#0A84FF'}
                />
              </TouchableOpacity>
            </View>

            {shouldShowSkeleton ? (
              <OrderListSkeleton />
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => {
                // Se o pedido foi aprovado, mostra apenas o orçamento aprovado
                // Se não foi aprovado, mostra todos os orçamentos enviados
                let orcamentos = order.documents?.filter(doc => 
                  doc.type === "orcamento" && 
                  doc.fileUri && 
                  doc.fileUri.trim() !== ''
                ) || [];
                
                if (order.status === 'orcamento_aprovado') {
                  orcamentos = orcamentos.filter(doc => doc.approved === true);
                }
                
                const hasBudget = orcamentos.length > 0;
                
                // Encontra o último orçamento enviado (mais recente)
                // Considera todos os orçamentos enviados (não apenas aprovados)
                const todosOrcamentosEnviados = order.documents?.filter(doc => 
                  doc.type === "orcamento" && 
                  doc.fileUri && 
                  doc.fileUri.trim() !== '' &&
                  doc.createdAt // Garante que tem data
                ) || [];
                
                const ultimoOrcamento = todosOrcamentosEnviados.length > 0
                  ? todosOrcamentosEnviados.reduce((latest, current) => {
                      const latestDate = latest.createdAt || 0;
                      const currentDate = current.createdAt || 0;
                      return currentDate > latestDate ? current : latest;
                    })
                  : null;
                
                // Formata a data do último orçamento
                const dataUltimoOrcamento = ultimoOrcamento?.createdAt
                  ? dayjs(ultimoOrcamento.createdAt).format('DD/MM/YYYY')
                  : null;

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.card}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardTitle}>{order.name}</Text>
                        <Text style={styles.cardSubtitle}>{order.description}</Text>
                      </View>
                    </View>

                    <View style={styles.cardMeta}>
                      <Text style={styles.metaLabel}>Data do pedido</Text>
                      <Text style={styles.metaValue}>{order.date}</Text>
                    </View>

                    {order.equipmentName && (
                      <View style={styles.cardMeta}>
                        <Text style={styles.metaLabel}>Equipamento</Text>
                        <Text style={styles.metaValue}>{order.equipmentName}</Text>
                      </View>
                    )}

                    {/* Informações de orçamento antes dos botões */}
                    {hasBudget && (
                      <View style={styles.cardMeta}>
                        <Text style={styles.metaLabel}>
                          {order.status === 'orcamento_aprovado' ? 'Orçamento aprovado' : 'Orçamentos enviados'}
                        </Text>
                        <Text style={styles.metaValue}>
                          {orcamentos.length} {orcamentos.length === 1 ? 'orçamento' : 'orçamentos'}
                        </Text>
                      </View>
                    )}
                    {dataUltimoOrcamento && (
                      <View style={styles.cardMeta}>
                        <Text style={styles.metaLabel}>Data do último orçamento</Text>
                        <Text style={styles.metaValue}>{dataUltimoOrcamento}</Text>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      <View style={styles.detailsContainer}>
                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!hasBudget) {
                              Alert.alert(
                                'Nenhum orçamento disponível',
                                'Ainda não há um orçamento enviado para este pedido.',
                              );
                              return;
                            }
                            
                            // Se há apenas 1 orçamento, abre diretamente
                            // Se há múltiplos, mostra o dropdown
                            if (orcamentos.length === 1) {
                              handleBudgetSelect(order);
                            } else {
                              toggleBudgetDropdown(order.id);
                            }
                          }}
                        >
                          <FileText size={16} color="#0A84FF" />
                          <Text style={styles.actionText}>Detalhes</Text>
                          {hasBudget && orcamentos.length > 1 && (
                            <ChevronDown
                              size={14}
                              color="#0A84FF"
                              style={[
                                styles.dropdownChevron,
                                openDropdownOrderId === order.id && styles.dropdownChevronOpen
                              ]}
                            />
                          )}
                        </TouchableOpacity>

                      </View>

                      {/* Botão de Rejeitar - aparece quando há orçamentos enviados */}
                      {order.status === 'orcamento_enviado' && hasBudget && (
                        <TouchableOpacity
                          style={[styles.actionPill, styles.destructivePill]}
                          onPress={() => handleRejectOrder(order)}
                        >
                          <X size={16} color="#FF3B30" />
                          <Text style={[styles.actionText, styles.destructiveText]}>
                            Rejeitar
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionPill, styles.destructivePill]}
                        onPress={() => handleDeleteOrder(order)}
                      >
                        <Trash2 size={16} color="#FF3B30" />
                        <Text style={[styles.actionText, styles.destructiveText]}>
                          Excluir
                        </Text>
                      </TouchableOpacity>

                      {(order.status === 'orcamento_pendente' || order.status === 'orcamento_enviado') && (
                        <View style={styles.actionWithStatusContainer}>
                          <TouchableOpacity
                            style={styles.actionPill}
                            onPress={() => {
                              setSelectedOrderForBudget(order);
                              setBudgetModalVisible(true);
                            }}
                          >
                            <UploadCloud size={16} color="#0A84FF" />
                            <Text style={styles.actionText}>
                              {order.status === 'orcamento_enviado' ? 'Enviar novo orçamento' : 'Enviar orçamento'}
                            </Text>
                          </TouchableOpacity>
                          <View
                            style={[
                              styles.statusPill,
                              styles.statusPillInline,
                              (() => {
                                const currentStyle =
                                  statusStyles[order.status] ?? defaultStatusStyle;
                                return { backgroundColor: currentStyle.backgroundColor };
                              })(),
                            ]}
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
                          </View>
                        </View>
                      )}
                      
                      {/* Status para outros casos (quando não tem botão de enviar) */}
                      {order.status !== 'orcamento_pendente' && order.status !== 'orcamento_enviado' && (
                        <View
                          style={[
                            styles.statusPill,
                            (() => {
                              const currentStyle =
                                statusStyles[order.status] ?? defaultStatusStyle;
                              return { backgroundColor: currentStyle.backgroundColor };
                            })(),
                          ]}
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
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum pedido encontrado para este centro de custo.
                </Text>
              </View>
            )}
            {!shouldShowSkeleton && hasMoreOrders && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMoreOrders}
                activeOpacity={0.85}
              >
                <Text style={styles.loadMoreText}>Carregar mais</Text>
              </TouchableOpacity>
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
        onSubmit={async (budget) => {
          if (selectedOrderForBudget) {
            try {
              // Adiciona o novo documento ao array de documentos
              const newDocument = {
                fileUri: budget.fileUri,
                fileName: budget.fileName,
                mimeType: budget.mimeType,
                type: "orcamento" as const,
              };

              await updateOrder({
                ...selectedOrderForBudget,
                status: "orcamento_enviado",
                documents: [...(selectedOrderForBudget.documents || []), newDocument],
              });
              setBudgetModalVisible(false);
              setSelectedOrderForBudget(null);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível enviar o orçamento.');
            }
          }
        }}
      />

      {previewFile && previewFile.uri && (
        <FilePreviewModal
          visible={previewVisible}
          onClose={() => {
            setPreviewVisible(false);
            setPreviewFile(null);
            setCurrentOrderForPreview(null);
          }}
          fileUri={previewFile.uri}
          fileName={previewFile.name}
          mimeType={previewFile.mimeType}
          files={previewFile.files}
          initialIndex={previewFile.initialIndex ?? 0}
          showApproveButton={
            currentOrderForPreview?.status === 'orcamento_enviado' &&
            (previewFile.mimeType?.startsWith('image/') || previewFile.mimeType === 'application/pdf')
          }
          canApprove={currentOrderForPreview?.status === 'orcamento_enviado'}
          onApprove={handleApproveBudget}
        />
      )}

      {/* Modal para dropdown de orçamentos */}
      <Modal
        visible={openDropdownOrderId !== null && orcamentosForModal.length > 1}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOpenDropdownOrderId(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpenDropdownOrderId(null)}
        >
          <View
            style={[
              styles.modalDropdown,
              orderWithOpenDropdown?.status === 'orcamento_enviado' && styles.modalDropdownExpanded
            ]}
            onStartShouldSetResponder={() => true}
          >
            {orcamentosForModal.map((doc, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modalDropdownItem,
                  orderWithOpenDropdown?.status === 'orcamento_enviado' && styles.modalDropdownItemExpanded,
                  index === orcamentosForModal.length - 1 && styles.modalDropdownItemLast
                ]}
                onPress={() => {
                  if (orderWithOpenDropdown) {
                    handleBudgetSelect(orderWithOpenDropdown, index);
                    setOpenDropdownOrderId(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalDropdownItemText,
                    orderWithOpenDropdown?.status === 'orcamento_enviado' && styles.modalDropdownItemTextExpanded
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {doc.fileName || `Orçamento ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <OrderFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={filters => setOrderFilters(filters)}
        initialFilters={orderFilters}
        equipments={equipmentOptions}
      />
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    overflow: 'visible',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flex: 1,
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
  statusPillInline: {
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionWithStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    overflow: 'visible',
  },
  detailsContainer: {
    position: 'relative',
    zIndex: 10,
    overflow: 'visible',
    alignSelf: 'flex-start',
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
  dropdownChevron: {
    marginLeft: 4,
    transform: [{ rotate: '0deg' }],
  },
  dropdownChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  budgetInfoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  budgetInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetInfoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  budgetInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  budgetDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2000,
    maxHeight: 300,
    minWidth: 200,
    overflow: 'hidden',
  },
  budgetDropdownExpanded: {
    width: SCREEN_WIDTH * 0.85,
    minWidth: SCREEN_WIDTH * 0.85,
    backgroundColor: '#FFFFFF',
    opacity: 1,
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 30,
    zIndex: 2000,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  budgetDropdownItem: {
    padding: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 56,
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
  budgetDropdownItemExpanded: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
  budgetDropdownItemLast: {
    borderBottomWidth: 0,
  },
  budgetDropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 22,
    width: '100%',
  },
  budgetDropdownItemTextExpanded: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 0,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
    minWidth: 200,
    maxWidth: SCREEN_WIDTH * 0.9,
    maxHeight: 400,
    overflow: 'hidden',
  },
  modalDropdownExpanded: {
    width: SCREEN_WIDTH * 0.85,
    minWidth: SCREEN_WIDTH * 0.85,
  },
  modalDropdownItem: {
    padding: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalDropdownItemExpanded: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  modalDropdownItemLast: {
    borderBottomWidth: 0,
  },
  modalDropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 22,
    width: '100%',
  },
  modalDropdownItemTextExpanded: {
    fontSize: 16,
    lineHeight: 22,
    width: '100%',
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
  loadMoreButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: '#0A84FF',
    fontWeight: '600',
    fontSize: 14,
  },
});
