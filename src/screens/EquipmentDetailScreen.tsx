import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Camera,
  History,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useEquipment } from '../context/EquipmentContext';
import { useFinancial } from '../context/FinancialContext';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import { ExpenseDocument } from '../context/FinancialContext';
import dayjs from 'dayjs';
import { CostCenter } from '../context/CostCenterContext';

const centerLabels: Record<CostCenter, string> = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const mockTabs = {
  despesas: [
    {
      id: 'desp-1',
      title: 'Manutenção preventiva',
      date: '03/11/2024',
      amount: 'R$ 2.500',
      category: 'Serviços',
    },
  ],
  documentos: [
    {
      id: 'doc-1',
      title: 'Nota Fiscal',
      date: '12/05/2023',
      type: 'Documento fiscal',
      fileName: 'NF-5090E.pdf',
    },
  ],
  fotos: [
    {
      id: 'photo-1',
      title: 'Inspeção anual',
      date: '01/09/2024',
      fileName: 'inspecao.jpg',
      fileUri: '',
    },
  ],
  revisoes: [
    {
      id: 'rev-1',
      title: 'Troca de filtros',
      date: '15/08/2024',
      next: '15/02/2025',
      description: 'Substituição completa dos filtros principais.',
    },
  ],
};

const tabs = [
  { key: 'despesas', label: 'Despesas', icon: CreditCard },
  { key: 'documentos', label: 'Documentos', icon: FileText },
  { key: 'fotos', label: 'Fotos', icon: Camera },
  { key: 'revisoes', label: 'Revisões', icon: History },
];

type TabKey = keyof typeof mockTabs;

type EquipmentParams = {
  id?: string;
  name?: string;
  brand?: string;
  year?: string;
  purchaseDate?: string;
  center?: string;
  nextReview?: string;
};

type DocumentItem = {
  id: string;
  title: string;
  date: string;
  fileName?: string;
  fileUri?: string;
  mimeType?: string | null;
  type?: string;
};

type PhotoItem = {
  id: string;
  title: string;
  date: string;
  fileName?: string;
  fileUri?: string;
  mimeType?: string | null;
};

type ReviewItem = {
  id: string;
  title: string;
  date: string;
  description?: string;
  next?: string;
};

type ExpenseItem = {
  id: string;
  title: string;
  date: string;
  amount: string;
  category: string;
  documents?: ExpenseDocument[];
  expenseId?: string;
};

export const EquipmentDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<EquipmentParams>();
  const { selectedCenter } = useCostCenter();
  const { getEquipmentById, updateEquipment } = useEquipment();
  const { addExpense, getAllExpenses } = useFinancial();
  const [documents, setDocuments] = useState<DocumentItem[]>(mockTabs.documentos);
  const [photos, setPhotos] = useState<PhotoItem[]>(mockTabs.fotos);
  const [reviews, setReviews] = useState<ReviewItem[]>(mockTabs.revisoes);
  
  // Define o equipamento primeiro
  const equipment = useMemo(() => {
    const equipmentId = params.id ?? 'eq-1';
    const contextEquipment = getEquipmentById(equipmentId);
    
    if (contextEquipment) {
      return contextEquipment;
    }
    
    // Fallback para dados dos params se não encontrar no contexto
    return {
      id: equipmentId,
      name: params.name ?? 'Trator John Deere 5090E',
      brand: params.brand ?? 'John Deere',
      year: Number(params.year) || 2021,
      purchaseDate: params.purchaseDate ?? '12/05/2023',
      center: (params.center as any) ?? selectedCenter,
      status: 'ativo' as const,
      nextReview: params.nextReview ?? '10/03/2025',
    };
  }, [params, selectedCenter, getEquipmentById]);
  
  // Busca despesas reais de manutenção para este equipamento
  const expenses = useMemo(() => {
    if (!equipment?.id) return [];
    
    const allExpensesList = getAllExpenses();
    const equipmentId = String(equipment.id).trim();
    
    const equipmentExpenses = allExpensesList.filter(
      (exp) => {
        const expEquipmentId = exp.equipmentId ? String(exp.equipmentId).trim() : null;
        return (
          expEquipmentId && 
          expEquipmentId === equipmentId && 
          exp.category === 'manutencao'
        );
      }
    );
    
    // Ordena por data (mais recente primeiro)
    const sortedExpenses = equipmentExpenses.sort((a, b) => {
      const dateA = dayjs(a.date, 'DD/MM/YYYY').valueOf();
      const dateB = dayjs(b.date, 'DD/MM/YYYY').valueOf();
      return dateB - dateA;
    });
    
    // Formata para o formato esperado pelo componente
    return sortedExpenses.map((exp) => ({
      id: exp.id,
      title: exp.name,
      date: exp.date,
      amount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(exp.value),
      category: 'Manutenção',
      documents: exp.documents || [], // Inclui documentos para acesso posterior
      expenseId: exp.id, // Mantém referência ao ID original da despesa
    }));
  }, [equipment?.id, getAllExpenses]);
  
  const [isDocumentModalVisible, setDocumentModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);
  const [expenseDocumentsModalVisible, setExpenseDocumentsModalVisible] = useState(false);
  const [selectedExpenseDocuments, setSelectedExpenseDocuments] = useState<ExpenseDocument[]>([]);

  const handleStatusToggle = () => {
    const newStatus = equipment.status === 'ativo' ? 'inativo' : 'ativo';
    updateEquipment(equipment.id, { status: newStatus });
  };
  const [activeTab, setActiveTab] = useState<TabKey>('despesas');

  const closeDocumentModal = () => {
    setDocumentModalVisible(false);
    setEditingDocument(null);
  };

  const closePhotoModal = () => {
    setPhotoModalVisible(false);
    setEditingPhoto(null);
  };

  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setEditingReview(null);
  };

  const tabData =
    activeTab === 'documentos'
      ? documents
      : activeTab === 'despesas'
        ? expenses
        : activeTab === 'fotos'
          ? photos
          : activeTab === 'revisoes'
            ? reviews
            : [];

  const actionLabel = () => {
    switch (activeTab) {
      case 'documentos':
        return 'Adicionar Documento';
      case 'despesas':
        return 'Adicionar Despesa';
      case 'fotos':
        return 'Adicionar Foto';
      case 'revisoes':
        return 'Adicionar Revisão';
      default:
        return 'Adicionar';
    }
  };

  const handleAction = () => {
    if (activeTab === 'documentos') {
      setEditingDocument(null);
      setDocumentModalVisible(true);
    } else if (activeTab === 'despesas') {
      setExpenseModalVisible(true);
    } else if (activeTab === 'fotos') {
      setEditingPhoto(null);
      setPhotoModalVisible(true);
    } else if (activeTab === 'revisoes') {
      setEditingReview(null);
      setReviewModalVisible(true);
    }
  };

  const handleCardPress = (item: (typeof tabData)[number]) => {
    // Se for uma despesa com documentos, abre o modal de documentos
    if (activeTab === 'despesas' && 'documents' in item && Array.isArray(item.documents) && item.documents.length > 0) {
      setSelectedExpenseDocuments(item.documents as ExpenseDocument[]);
      setExpenseDocumentsModalVisible(true);
      return;
    }
    
    // Para outros tipos (fotos, documentos), abre o preview
    if ('fileUri' in item && item.fileUri) {
      setPreviewFile({
        uri: item.fileUri,
        name: item.fileName ?? item.title,
        mimeType: 'mimeType' in item ? (item.mimeType as string | null | undefined) : undefined,
      });
      setPreviewVisible(true);
    }
  };

  const handleEditCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent
  ) => {
    event.stopPropagation();
    if (activeTab === 'documentos') {
      setEditingDocument(item as DocumentItem);
      setDocumentModalVisible(true);
    } else if (activeTab === 'fotos') {
      setEditingPhoto(item as PhotoItem);
      setPhotoModalVisible(true);
    } else if (activeTab === 'revisoes') {
      setEditingReview(item as ReviewItem);
      setReviewModalVisible(true);
    }
  };

  const handleDeleteCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent
  ) => {
    event.stopPropagation();
    Alert.alert(
      'Excluir registro',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (activeTab === 'documentos') {
              const document = item as DocumentItem;
              setDocuments((prev) => prev.filter((doc) => doc.id !== document.id));
              if (previewFile?.uri === document.fileUri) {
                setPreviewVisible(false);
                setPreviewFile(null);
              }
              if (editingDocument?.id === document.id) {
                setEditingDocument(null);
              }
            } else if (activeTab === 'fotos') {
              const photo = item as PhotoItem;
              setPhotos((prev) => prev.filter((pic) => pic.id !== photo.id));
              if (previewFile?.uri === photo.fileUri) {
                setPreviewVisible(false);
                setPreviewFile(null);
              }
              if (editingPhoto?.id === photo.id) {
                setEditingPhoto(null);
              }
            } else if (activeTab === 'revisoes') {
              const review = item as ReviewItem;
              setReviews((prev) => prev.filter((rev) => rev.id !== review.id));
              if (editingReview?.id === review.id) {
                setEditingReview(null);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <CostCenterSelector />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color="#0A84FF" />
          <Text style={styles.backText}>Equipamentos</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{equipment.name}</Text>
          <Text style={styles.subtitle}>
            Marca {equipment.brand} · Ano {equipment.year}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  equipment.status === 'ativo' ? styles.statusButtonActive : styles.statusButtonInactive,
                ]}
                onPress={handleStatusToggle}
              >
                <Text
                  style={[
                    styles.statusText,
                    equipment.status === 'ativo' ? styles.statusTextActive : styles.statusTextInactive,
                  ]}
                >
                  {equipment.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data da compra</Text>
              <Text style={styles.infoValue}>{equipment.purchaseDate}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Centro</Text>
              <Text style={styles.infoValue}>{centerLabels[equipment.center as CostCenter] || equipment.center}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Próxima revisão</Text>
              <Text style={styles.infoValue}>{equipment.nextReview}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as TabKey)}
              >
                <Icon size={16} color={isActive ? '#0A84FF' : '#6C6C70'} />
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tabs.find((tab) => tab.key === activeTab)?.label}
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{actionLabel()}</Text>
            </TouchableOpacity>
          </View>

          {tabData.map((item) => {
            const allowActions =
              activeTab === 'documentos' ||
              activeTab === 'fotos' ||
              activeTab === 'revisoes';
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {'amount' in item ? (
                      <Text style={styles.cardValue}>{item.amount}</Text>
                    ) : null}
                  </View>
                  {allowActions ? (
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={(event) => handleEditCard(item, event)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Edit3 size={16} color="#1C1C1E" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleCardPress(item)}
                  style={styles.cardContent}
                >
                  <Text style={styles.cardSubtitle}>
                    {'category' in item && item.category
                      ? item.category
                      : item.date ?? ''}
                  </Text>
                  {'fileName' in item ? (
                    <Text style={styles.cardMeta}>Arquivo: {item.fileName}</Text>
                  ) : null}
                  {'description' in item && item.description ? (
                    <Text style={styles.cardMeta}>{item.description}</Text>
                  ) : null}
                  {'next' in item ? (
                    <Text style={styles.cardMeta}>Próxima: {item.next}</Text>
                  ) : null}
                  {activeTab === 'despesas' && 'documents' in item && Array.isArray(item.documents) && item.documents.length > 0 && (
                    <View style={styles.documentsIndicator}>
                      <FileText size={14} color="#0A84FF" />
                      <Text style={styles.documentsIndicatorText}>
                        {item.documents.length} documento(s) anexado(s)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {allowActions ? (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.deleteButton]}
                      onPress={(event) => handleDeleteCard(item, event)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <DocumentUploadModal
          visible={isDocumentModalVisible}
          onClose={closeDocumentModal}
          initialData={
            editingDocument
              ? {
                  name: editingDocument.title,
                  date: editingDocument.date,
                  fileName: editingDocument.fileName ?? editingDocument.title,
                  fileUri: editingDocument.fileUri ?? '',
                  mimeType: editingDocument.mimeType,
                }
              : undefined
          }
          onSubmit={(data) => {
            if (editingDocument) {
              setDocuments((prev) =>
                prev.map((doc) =>
                  doc.id === editingDocument.id
                    ? {
                        ...doc,
                        title: data.name,
                        date: data.date,
                        fileName: data.fileName,
                        fileUri: data.fileUri,
                        mimeType: data.mimeType,
                      }
                    : doc
                )
              );
              setEditingDocument(null);
            } else {
              setDocuments((prev) => [
                {
                  id: `doc-${prev.length + 1}`,
                  title: data.name,
                  date: data.date,
                  type: 'Documento',
                  fileName: data.fileName,
                  fileUri: data.fileUri,
                  mimeType: data.mimeType,
                },
                ...prev,
              ]);
            }
          }}
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
        <ExpenseDocumentsModal
          visible={expenseDocumentsModalVisible}
          onClose={() => {
            setExpenseDocumentsModalVisible(false);
            setSelectedExpenseDocuments([]);
          }}
          documents={selectedExpenseDocuments}
          onDocumentPress={(document) => {
            setExpenseDocumentsModalVisible(false);
            setPreviewFile({
              uri: document.fileUri,
              name: document.fileName,
              mimeType: document.mimeType,
            });
            setPreviewVisible(true);
          }}
        />
        <ExpenseFormModal
          visible={isExpenseModalVisible}
          onClose={() => setExpenseModalVisible(false)}
          onSubmit={(data) => {
            // Adiciona a despesa no contexto FinancialContext
            addExpense({
              name: data.name,
              category: data.category,
              date: data.date,
              value: data.value,
              center: selectedCenter,
              equipmentId: data.equipmentId,
              gestaoSubcategory: data.gestaoSubcategory,
              observations: data.observations,
              documents: data.documents,
            });
            setExpenseModalVisible(false);
          }}
          initialData={{
            category: 'manutencao',
            equipmentId: equipment.id,
            name: '',
            date: dayjs().format('DD/MM/YYYY'),
            value: 0,
            documents: [],
          }}
        />
        <PhotoUploadModal
          visible={isPhotoModalVisible}
          onClose={closePhotoModal}
          initialData={
            editingPhoto
              ? {
                  title: editingPhoto.title,
                  date: editingPhoto.date,
                  uri: editingPhoto.fileUri ?? '',
                  fileName: editingPhoto.fileName ?? editingPhoto.title,
                  mimeType: editingPhoto.mimeType,
                }
              : undefined
          }
          onSubmit={(data) => {
            if (editingPhoto) {
              setPhotos((prev) =>
                prev.map((photo) =>
                  photo.id === editingPhoto.id
                    ? {
                        ...photo,
                        title: data.title,
                        date: data.date,
                        fileName: data.fileName,
                        fileUri: data.uri,
                        mimeType: data.mimeType,
                      }
                    : photo
                )
              );
              setEditingPhoto(null);
            } else {
              setPhotos((prev) => [
                {
                  id: `photo-${prev.length + 1}`,
                  title: data.title,
                  date: data.date,
                  fileName: data.fileName,
                  fileUri: data.uri,
                  mimeType: data.mimeType,
                },
                ...prev,
              ]);
            }
          }}
        />
        <ReviewFormModal
          visible={isReviewModalVisible}
          onClose={closeReviewModal}
          initialData={
            editingReview
              ? {
                  type: editingReview.title,
                  description: editingReview.description ?? '',
                  date: editingReview.date,
                  next: editingReview.next,
                }
              : undefined
          }
          onSubmit={(data) => {
            if (editingReview) {
              setReviews((prev) =>
                prev.map((review) =>
                  review.id === editingReview.id
                    ? {
                        ...review,
                        title: data.type,
                        date: data.date,
                        description: data.description,
                        next: data.next ?? undefined,
                      }
                    : review
                )
              );
              setEditingReview(null);
            } else {
              setReviews((prev) => [
                {
                  id: `rev-${prev.length + 1}`,
                  title: data.type,
                  date: data.date,
                  next: data.next ?? undefined,
                  description: data.description,
                },
                ...prev,
              ]);
            }
          }}
        />
        </ScrollView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '600',
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusButtonActive: {
    backgroundColor: '#E9FAF0',
  },
  statusButtonInactive: {
    backgroundColor: '#FDECEC',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#34C759',
  },
  statusTextInactive: {
    color: '#FF3B30',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  tabLabelActive: {
    color: '#0A84FF',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 10,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  cardHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A84FF',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
  },
  documentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  documentsIndicatorText: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  cardActionButton: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
});

