import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useContracts } from '../context/ContractContext';
import { FilePlus, FileText, ChevronRight, Filter, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { ContractFormModal } from '../components/ContractFormModal';
import { ContractFilterModal, ContractFilters } from '../components/ContractFilterModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ContractDocument } from '../context/ContractContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const categoryLabels = {
  principal: 'Principal',
  terceirizados: 'Terceirizado',
};

const formatCurrency = (value?: number): string => {
  if (!value) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const ContratosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { getContractsByCenter, addContract, deleteContract, addDocumentToContract, deleteDocumentFromContract, loading, refresh } = useContracts();
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Erro ao atualizar contratos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);
  const contracts = useMemo(
    () => getContractsByCenter(selectedCenter),
    [getContractsByCenter, selectedCenter]
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>({});
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedContractDocuments, setSelectedContractDocuments] = useState<ContractDocument[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
    files?: Array<{
      fileUri: string;
      fileName: string;
      mimeType: string | null;
    }>;
    initialIndex?: number;
  } | null>(null);

  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    // Filtrar por nome
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      filtered = filtered.filter((contract) =>
        contract.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por categoria
    if (filters.category) {
      filtered = filtered.filter((contract) => contract.category === filters.category);
    }

    // Filtrar por período
    if (filters.month !== null && filters.month !== undefined && filters.year) {
      filtered = filtered.filter((contract) => {
        const contractDate = dayjs(contract.date, 'DD/MM/YYYY');
        return (
          contractDate.month() === filters.month &&
          contractDate.year() === filters.year
        );
      });
    }

    // Ordenar do mais novo para o mais antigo
    return filtered.sort(
      (a, b) =>
        dayjs(b.date, 'DD/MM/YYYY').valueOf() - dayjs(a.date, 'DD/MM/YYYY').valueOf()
    );
  }, [contracts, filters]);

  const openAttachmentOptions = (contractId: string) => {
    setActiveContractId(contractId);
    setAttachmentModalVisible(true);
  };

  const closeAttachmentOptions = () => {
    setAttachmentModalVisible(false);
    setActiveContractId(null);
  };

  const openDocumentsList = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      setSelectedContractDocuments(contract.documents ?? []);
      setActiveContractId(contractId);
      setDocumentsModalVisible(true);
    }
  };

  const closeDocumentsList = () => {
    setDocumentsModalVisible(false);
    setSelectedContractDocuments([]);
    setActiveContractId(null);
  };

  const openDocumentPreview = (document: ContractDocument) => {
    // Prepara todos os documentos do contrato para navegação
    const allFiles = selectedContractDocuments.map((d) => ({
      fileUri: d.fileUri,
      fileName: d.fileName,
      mimeType: d.mimeType || null,
    }));
    const currentIndex = selectedContractDocuments.findIndex((d) => d.fileUri === document.fileUri);
    
    // Só passa files se houver mais de 1 documento para navegação
    if (allFiles.length > 1) {
      setPreviewFile({
        uri: document.fileUri,
        name: document.fileName,
        mimeType: document.mimeType,
        files: allFiles,
        initialIndex: currentIndex >= 0 ? currentIndex : 0,
      });
    } else {
      // Se houver apenas 1 documento, não passa files (sem navegação)
      setPreviewFile({
        uri: document.fileUri,
        name: document.fileName,
        mimeType: document.mimeType,
      });
    }
    setPreviewVisible(true);
    closeDocumentsList();
  };

  const handleContractDocumentUpload = async () => {
    if (!activeContractId) return;
    try {
      setIsPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        await addDocumentToContract(activeContractId, {
          fileName: asset.name ?? 'Documento',
          fileUri: asset.uri,
          mimeType: asset.mimeType,
        });
        closeAttachmentOptions();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o documento.');
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleContractPhotoFromCamera = async () => {
    if (!activeContractId) {
      // Se não há contrato ativo, reabre o modal
      setAttachmentModalVisible(true);
      return;
    }
    
    // Solicita permissão da câmera
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à câmera para tirar fotos.');
      // Reabre o modal se a permissão foi negada
      setAttachmentModalVisible(true);
      return;
    }

    try {
      setIsPickingFile(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });

      // Se o usuário cancelou, reabre o modal
      if (result.canceled) {
        setIsPickingFile(false);
        setAttachmentModalVisible(true);
        return;
      }

      // Se tirou a foto, processa
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await addDocumentToContract(activeContractId, {
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
        });
        closeAttachmentOptions();
      } else {
        // Se não conseguiu tirar a foto, reabre o modal
        setAttachmentModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
      // Reabre o modal em caso de erro
      setAttachmentModalVisible(true);
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleContractPhotoFromLibrary = async () => {
    if (!activeContractId) {
      // Se não há contrato ativo, reabre o modal
      setAttachmentModalVisible(true);
      return;
    }
    
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar fotos.');
      // Reabre o modal se a permissão foi negada
      setAttachmentModalVisible(true);
      return;
    }
    try {
      setIsPickingFile(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length) {
        const asset = result.assets[0];
        await addDocumentToContract(activeContractId, {
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
        });
        closeAttachmentOptions();
      } else {
        // Se cancelou, reabre o modal
        setAttachmentModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
      // Reabre o modal em caso de erro
      setAttachmentModalVisible(true);
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleContractPhotoUpload = () => {
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
            handleContractPhotoFromCamera();
          } else if (buttonIndex === 2) {
            // Escolher do álbum - segunda opção
            handleContractPhotoFromLibrary();
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
          { text: 'Tirar foto', onPress: handleContractPhotoFromCamera },
          { text: 'Escolher do álbum', onPress: handleContractPhotoFromLibrary },
        ],
        { cancelable: true }
      );
    }
  };

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
            <Text style={styles.title}>Contratos</Text>
            <Text style={styles.subtitle}>
              Controle de contratos do centro {centerLabels[selectedCenter]}
            </Text>
          </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contratos</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.filterButton, Object.keys(filters).length > 0 && styles.filterButtonActive]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Filter size={16} color={Object.keys(filters).length > 0 ? "#FFFFFF" : "#0A84FF"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setModalVisible(true)}
              >
                <FilePlus size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Novo Contrato</Text>
              </TouchableOpacity>
            </View>
          </View>

          {Object.keys(filters).length > 0 && (
            <Text style={styles.filterInfo}>
              {filteredContracts.length} contrato(s) encontrado(s)
            </Text>
          )}

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Carregando contratos...</Text>
            </View>
          ) : filteredContracts.length > 0 ? (
            filteredContracts.map((contract) => (
            <View key={contract.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{contract.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    Categoria: {categoryLabels[contract.category as keyof typeof categoryLabels] ?? 'Outros'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#C7C7CC" />
              </View>
              <View style={styles.cardMeta}>
                <View>
                  <Text style={styles.metaLabel}>Data</Text>
                  <Text style={styles.metaValue}>{contract.date}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Valor</Text>
                  <Text style={styles.metaValue}>{formatCurrency(contract.value)}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Documentos</Text>
                  <Text style={styles.metaValue}>{contract.docs}</Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionPill}
                  onPress={() => openDocumentsList(contract.id)}
                >
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Ver documentos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => openAttachmentOptions(contract.id)}
                >
                  <FilePlus size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Adicionar documento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(
                      'Excluir contrato',
                      `Tem certeza que deseja excluir o contrato "${contract.name}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Excluir',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteContract(contract.id);
                            } catch (error) {
                              // Erro já foi tratado no contexto
                              console.error('Erro ao excluir contrato:', error);
                            }
                          },
                        },
                      ]
                    )
                  }
                >
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={styles.deleteText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhum contrato encontrado para os filtros aplicados.
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      <ContractFormModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (data) => {
          try {
            await addContract({
              name: data.name,
              category: data.category,
              date: data.date,
              value: data.value,
              center: selectedCenter,
              documents: data.documents,
            });
            setModalVisible(false);
          } catch (error) {
            console.error('Erro ao adicionar contrato:', error);
          }
        }}
      />
      <ContractFilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
      />
      <Modal transparent animationType="fade" visible={attachmentModalVisible}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeAttachmentOptions}
          />
          <View style={styles.optionSheet}>
            <View style={styles.optionHandle} />
            <Text style={styles.optionTitle}>Adicionar documento</Text>
            <TouchableOpacity
              style={[styles.optionButton, isPickingFile && styles.optionButtonDisabled]}
              onPress={handleContractDocumentUpload}
              disabled={isPickingFile}
            >
              <FileText size={18} color="#0A84FF" />
              <Text style={styles.optionButtonText}>Selecionar documento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, isPickingFile && styles.optionButtonDisabled]}
              onPress={handleContractPhotoUpload}
              disabled={isPickingFile}
            >
              <ImageIcon size={18} color="#0A84FF" />
              <Text style={styles.optionButtonText}>Selecionar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionCancel} onPress={closeAttachmentOptions}>
              <Text style={styles.optionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="slide" visible={documentsModalVisible}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeDocumentsList}
          />
          <View style={styles.documentsSheet}>
            <View style={styles.optionHandle} />
            <Text style={styles.optionTitle}>Documentos do Contrato</Text>
            <ScrollView style={styles.documentsList}>
              {selectedContractDocuments.length > 0 ? (
                selectedContractDocuments.map((doc, index) => (
                  <View
                    key={`${doc.fileUri}-${index}`}
                    style={styles.documentItem}
                  >
                    <TouchableOpacity
                      style={styles.documentItemContent}
                      onPress={() => openDocumentPreview(doc)}
                    >
                      <FileText size={20} color="#0A84FF" />
                      <View style={styles.documentItemText}>
                        <Text style={styles.documentItemName} numberOfLines={1}>
                          {doc.fileName}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#C7C7CC" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteDocumentButton}
                      onPress={() => {
                        Alert.alert(
                          'Excluir documento',
                          `Tem certeza que deseja excluir "${doc.fileName}"?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: async () => {
                                if (!activeContractId || !doc.id) return;
                                try {
                                  await deleteDocumentFromContract(activeContractId, doc.id);
                                  // Atualiza a lista local de documentos
                                  setSelectedContractDocuments((prev) =>
                                    prev.filter((d) => d.id !== doc.id)
                                  );
                                } catch (error) {
                                  Alert.alert('Erro', 'Não foi possível excluir o documento.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyDocuments}>
                  <Text style={styles.emptyDocumentsText}>
                    Nenhum documento adicionado ainda.
                  </Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.optionCancel} onPress={closeDocumentsList}>
              <Text style={styles.optionCancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <FilePreviewModal
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
        }}
        fileUri={previewFile?.uri}
        fileName={previewFile?.name}
        mimeType={previewFile?.mimeType}
        files={previewFile?.files}
        initialIndex={previewFile?.initialIndex}
      />
      </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  filterInfo: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: -8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 13,
    color: '#6C6C70',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FDECEC',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalOverlay: {
    flex: 1,
  },
  optionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14,
  },
  optionHandle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1C1C1E',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 14,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  optionCancel: {
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginTop: 4,
  },
  optionCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  documentsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  documentsList: {
    maxHeight: 400,
    marginVertical: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    marginBottom: 10,
  },
  documentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  documentItemText: {
    flex: 1,
  },
  documentItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptyDocuments: {
    padding: 32,
    alignItems: 'center',
  },
  emptyDocumentsText: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
  },
  deleteDocumentButton: {
    padding: 8,
    marginLeft: 8,
  },
});
