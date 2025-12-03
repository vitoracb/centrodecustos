import React, { useMemo, useState, useEffect } from 'react';
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
import { useCostCenter, CostCenter } from '../context/CostCenterContext';
import { useEquipment } from '../context/EquipmentContext';
import { useFinancial } from '../context/FinancialContext';
import { UpdateHoursModal } from '../components/UpdateHoursModal';

import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import { ExpenseDocument } from '../context/FinancialContext';

import dayjs from 'dayjs';
import { supabase } from '@/src/lib/supabaseClient';
import { uploadFileToStorage } from '../lib/storageUtils';

const centerLabels: Record<CostCenter, string> = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const tabs = [
  { key: 'despesas', label: 'Despesas', icon: CreditCard },
  { key: 'documentos', label: 'Documentos', icon: FileText },
  { key: 'fotos', label: 'Fotos', icon: Camera },
  { key: 'revisoes', label: 'Revisões', icon: History },
];

type TabKey = 'despesas' | 'documentos' | 'fotos' | 'revisoes';

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
  date: string; // DD/MM/YYYY
  fileName?: string;
  fileUri?: string;
  mimeType?: string | null;
  type?: string;
};

type PhotoItem = {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY
  fileName?: string;
  fileUri?: string;
  mimeType?: string | null;
};

type ReviewItem = {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY
  description?: string;
  next?: string; // DD/MM/YYYY
};

type ExpenseItem = {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY
  amount: string;
  category: string;
  documents?: ExpenseDocument[];
  expenseId?: string;
  isFixed?: boolean;
};

/**
 * Converte 'DD/MM/AAAA' -> 'AAAA-MM-DD'
 */
const brToIso = (br?: string | null): string | null => {
  if (!br) return null;
  const parts = br.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Converte Date/ISO -> 'DD/MM/AAAA'
 */
const isoToBr = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const EquipmentDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<EquipmentParams>();
  const { selectedCenter } = useCostCenter();
  const { getEquipmentById, updateEquipment, updateEquipmentHours } = useEquipment();
  const { addExpense, updateExpense, deleteExpense, deleteExpenseDocument, getAllExpenses } = useFinancial();

  const [activeTab, setActiveTab] = useState<TabKey>('despesas');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const [isDocumentModalVisible, setDocumentModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(
    null,
  );
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

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

  const [expenseDocumentsModalVisible, setExpenseDocumentsModalVisible] =
    useState(false);
  const [selectedExpenseDocuments, setSelectedExpenseDocuments] = useState<
    ExpenseDocument[]
  >([]);
  const [selectedExpenseForDocument, setSelectedExpenseForDocument] = useState<ExpenseItem | null>(null);
  const [isUpdateHoursModalVisible, setUpdateHoursModalVisible] = useState(false);

  // Carrega o equipamento (do contexto ou dos params)
  const equipment = useMemo(() => {
    const equipmentId = params.id ?? 'eq-1';
    const fromContext = getEquipmentById(equipmentId);

    if (fromContext) {
      return fromContext;
    }

    // fallback se não achou no contexto
    return {
      id: equipmentId,
      name: params.name ?? 'Equipamento',
      brand: params.brand ?? '',
      year: Number(params.year) || new Date().getFullYear(),
      purchaseDate: params.purchaseDate ?? '',
      center: (params.center as CostCenter | undefined) ?? selectedCenter,
      status: 'ativo' as const,
      nextReview: params.nextReview ?? '',
      // ✅ Campos de horas com valores padrão
      currentHours: 0,
      hoursUntilRevision: 250,
    };
  }, [params, selectedCenter, getEquipmentById]);

  // Despesas reais ligadas a este equipamento
  const expenses: ExpenseItem[] = useMemo(() => {
    if (!equipment?.id) return [];

    const all = getAllExpenses();
    const equipmentId = String(equipment.id).trim();

    const filtered = all.filter(exp => {
      const expEquipmentId = exp.equipmentId
        ? String(exp.equipmentId).trim()
        : null;

      if (!expEquipmentId || expEquipmentId !== equipmentId) {
        return false;
      }

      return exp.category === 'manutencao' || exp.category === 'equipamentos';
    });

    const sorted = filtered.sort((a, b) => {
      const dateA = dayjs(a.date, 'DD/MM/YYYY').valueOf();
      const dateB = dayjs(b.date, 'DD/MM/YYYY').valueOf();
      return dateB - dateA;
    });

    return sorted.map(exp => ({
      id: exp.id,
      title: exp.name,
      date: exp.date,
      amount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(exp.value),
      category: 'Manutenção',
      documents: exp.documents || [],
      expenseId: exp.id,
      isFixed: exp.isFixed,
    }));
  }, [equipment?.id, getAllExpenses]);

  // Carregar DOCUMENTOS, FOTOS e REVISÕES do Supabase ao entrar na tela
  useEffect(() => {
    const loadDetails = async () => {
      if (!equipment?.id) return;

      try {
        const equipmentId = equipment.id;

        // 1) Documentos
        const { data: docsData, error: docsError } = await supabase
          .from('equipment_documents')
          .select('*')
          .eq('equipment_id', equipmentId)
          .order('date', { ascending: false });

        if (docsError) {
          console.log('❌ Erro ao carregar equipment_documents:', docsError);
        } else if (docsData) {
          const mappedDocs: DocumentItem[] = docsData.map((doc: any) => ({
            id: doc.id,
            title: doc.name,
            date: isoToBr(doc.date),
            type: 'Documento',
            fileName: doc.file_name ?? doc.name,
            fileUri: doc.file_url,
            mimeType: doc.mime_type,
          }));
          setDocuments(mappedDocs);
        }

        // 2) Fotos
        const { data: photosData, error: photosError } = await supabase
          .from('equipment_photos')
          .select('*')
          .eq('equipment_id', equipmentId)
          .order('uploaded_at', { ascending: false });

        if (photosError) {
          console.log('❌ Erro ao carregar equipment_photos:', photosError);
        } else if (photosData) {
          const mappedPhotos: PhotoItem[] = photosData.map(
            (photo: any, index: number) => ({
              id: photo.id,
              title: photo.description || `Foto ${index + 1}`,
              date: isoToBr(photo.uploaded_at),
              fileName:
                photo.file_name ||
                photo.description ||
                `foto-${index + 1}.jpg`,
              fileUri: photo.file_url,
              mimeType: photo.mime_type,
            }),
          );
          setPhotos(mappedPhotos);
        }

        // 3) Revisões
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('equipment_reviews')
          .select('*')
          .eq('equipment_id', equipmentId)
          .order('date', { ascending: false });

        if (reviewsError) {
          console.log('❌ Erro ao carregar equipment_reviews:', reviewsError);
        } else if (reviewsData) {
          const mappedReviews: ReviewItem[] = reviewsData.map((rev: any) => ({
            id: rev.id,
            title: rev.type || 'Revisão',
            date: isoToBr(rev.date),
            next: isoToBr(rev.next_date),
            description: rev.description ?? '',
          }));
          setReviews(mappedReviews);
        }
      } catch (err) {
        console.log('❌ Erro geral ao carregar detalhes do equipamento:', err);
      }
    };

    loadDetails();
  }, [equipment?.id]);

  const handleStatusToggle = () => {
    const newStatus = equipment.status === 'ativo' ? 'inativo' : 'ativo';
    updateEquipment(equipment.id, { status: newStatus }).catch(err => {
      console.log('❌ Erro ao alternar status:', err);
      Alert.alert(
        'Erro',
        'Não foi possível alterar o status do equipamento.',
      );
    });
  };

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
    if (
      activeTab === 'despesas' &&
      'documents' in item &&
      Array.isArray(item.documents) &&
      item.documents.length > 0
    ) {
      setSelectedExpenseForDocument(item as ExpenseItem);
      setSelectedExpenseDocuments(item.documents as ExpenseDocument[]);
      setExpenseDocumentsModalVisible(true);
      return;
    }

    if ('fileUri' in item && item.fileUri) {
      // Determina qual lista usar baseado na aba ativa
      let allFiles: Array<{ fileUri: string; fileName: string; mimeType: string | null }> = [];
      let currentIndex = 0;

      if (activeTab === 'documentos') {
        allFiles = documents.map((doc) => ({
          fileUri: doc.fileUri || '',
          fileName: doc.fileName || doc.title,
          mimeType: doc.mimeType || null,
        }));
        currentIndex = documents.findIndex((doc) => doc.fileUri === item.fileUri);
      } else if (activeTab === 'fotos') {
        allFiles = photos.map((photo) => ({
          fileUri: photo.fileUri || '',
          fileName: photo.fileName || photo.title,
          mimeType: photo.mimeType || null,
        }));
        currentIndex = photos.findIndex((photo) => photo.fileUri === item.fileUri);
      }

      // Se encontrou o arquivo na lista, usa a lista completa para navegação
      if (currentIndex >= 0 && allFiles.length > 0) {
        setPreviewFile({
          uri: item.fileUri!,
          name: item.fileName ?? item.title,
          mimeType:
            'mimeType' in item ? (item.mimeType as string | null | undefined) : undefined,
          files: allFiles,
          initialIndex: currentIndex,
        });
      } else {
        // Fallback: apenas um arquivo (compatibilidade)
        setPreviewFile({
          uri: item.fileUri!,
          name: item.fileName ?? item.title,
          mimeType:
            'mimeType' in item ? (item.mimeType as string | null | undefined) : undefined,
        });
      }
      setPreviewVisible(true);
    }
  };

  const handleEditCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent,
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
    } else if (activeTab === 'despesas') {
      setEditingExpense(item as ExpenseItem);
      setExpenseModalVisible(true);
    }
  };

  const handleDeleteCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent,
  ) => {
    event.stopPropagation();

    const confirmMessage = activeTab === 'despesas'
      ? 'Tem certeza que deseja excluir esta despesa?'
      : 'Tem certeza que deseja remover este item?';

    Alert.alert('Excluir registro', confirmMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            if (activeTab === 'documentos') {
              const doc = item as DocumentItem;
              const { error } = await supabase
                .from('equipment_documents')
                .delete()
                .eq('id', doc.id);
              if (error) throw error;
              setDocuments(prev => prev.filter(d => d.id !== doc.id));
            } else if (activeTab === 'fotos') {
              const photo = item as PhotoItem;
              const { error } = await supabase
                .from('equipment_photos')
                .delete()
                .eq('id', photo.id);
              if (error) throw error;
              setPhotos(prev => prev.filter(p => p.id !== photo.id));
            } else if (activeTab === 'revisoes') {
              const rev = item as ReviewItem;
              const { error } = await supabase
                .from('equipment_reviews')
                .delete()
                .eq('id', rev.id);
              if (error) throw error;
              setReviews(prev => prev.filter(r => r.id !== rev.id));
            } else if (activeTab === 'despesas') {
              const expense = item as ExpenseItem;
              if (expense.expenseId) {
                await deleteExpense(expense.expenseId);
              }
            }
          } catch (err) {
            console.log('❌ Erro ao excluir item:', err);
            Alert.alert('Erro', 'Não foi possível excluir o item.');
          }
        },
      },
    ]);
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
                    equipment.status === 'ativo'
                      ? styles.statusButtonActive
                      : styles.statusButtonInactive,
                  ]}
                  onPress={handleStatusToggle}
                >
                  <Text
                    style={[
                      styles.statusText,
                      equipment.status === 'ativo'
                        ? styles.statusTextActive
                        : styles.statusTextInactive,
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
                <Text style={styles.infoValue}>
                  {centerLabels[equipment.center as CostCenter] ||
                    equipment.center}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Horas Atuais</Text>
                <Text style={styles.infoValue}>
                  {equipment.currentHours.toLocaleString('pt-BR')}h
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Próxima Revisão</Text>
                <Text style={styles.infoValue}>
                  {(equipment.currentHours + equipment.hoursUntilRevision).toLocaleString('pt-BR')}h
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Faltam</Text>
                <Text style={[
                  styles.infoValue,
                  (() => {
                    const isNearRevision = equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0;
                    const isPastRevision = equipment.hoursUntilRevision <= 0;
                    if (isPastRevision) return styles.infoValueError;
                    if (isNearRevision) return styles.infoValueWarning;
                    return null;
                  })(),
                ]}>
                  {equipment.hoursUntilRevision <= 0
                    ? 'REVISÃO URGENTE!'
                    : `${equipment.hoursUntilRevision.toFixed(0)}h`
                  }
                </Text>
              </View>
            </View>

            {/* Alerta de Revisão */}
            {(() => {
              const isNearRevision = equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0;
              const isPastRevision = equipment.hoursUntilRevision <= 0;
              
              if (isNearRevision || isPastRevision) {
                return (
                  <View style={[
                    styles.revisionAlert,
                    isPastRevision && styles.revisionAlertError,
                  ]}>
                    <Text style={[
                      styles.revisionAlertText,
                      isPastRevision && styles.revisionAlertTextError,
                    ]}>
                      {isPastRevision 
                        ? `⚠️ REVISÃO ATRASADA! Agende urgente!` 
                        : `🔔 Revisão próxima! Faltam ${equipment.hoursUntilRevision.toFixed(0)}h`
                      }
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>

          <View style={styles.tabContainer}>
            {tabs.map(tab => {
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
                    style={[
                      styles.tabLabel,
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Botão de Atualizar Horas - apenas na aba Revisões, abaixo das subabas e acima dos cards */}
          {activeTab === 'revisoes' && (
            <TouchableOpacity
              style={styles.updateHoursButton}
              onPress={() => setUpdateHoursModalVisible(true)}
            >
              <Text style={styles.updateHoursButtonText}>Atualizar Horas</Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {tabs.find(tab => tab.key === activeTab)?.label}
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAction}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{actionLabel()}</Text>
              </TouchableOpacity>
            </View>

            {tabData.map(item => {
              const allowActions =
                activeTab === 'documentos' ||
                activeTab === 'fotos' ||
                activeTab === 'revisoes' ||
                activeTab === 'despesas';

              return (
                <View key={item.id} style={styles.card}>
                  {allowActions ? (
                    <TouchableOpacity
                      style={styles.editButtonTopRight}
                      onPress={event => handleEditCard(item, event)}
                      hitSlop={{
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                      }}
                    >
                      <Edit3 size={16} color="#0A84FF" />
                    </TouchableOpacity>
                  ) : null}
                  
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCardPress(item)}
                    style={styles.cardContent}
                    disabled={activeTab === 'despesas' && (!('documents' in item) || !Array.isArray(item.documents) || item.documents.length === 0)}
                  >
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      {'amount' in item ? (
                        <Text style={styles.cardValue}>{item.amount}</Text>
                      ) : null}
                    </View>
                    
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardSubtitle}>
                        {'category' in item && item.category
                          ? item.category
                          : item.date ?? ''}
                      </Text>
                      {/* Mostra a data da despesa */}
                      {activeTab === 'despesas' && 'date' in item && item.date ? (
                        <Text style={styles.cardMeta}>
                          {item.date}
                        </Text>
                      ) : null}
                    </View>
                    {/* Mostra "Despesa fixa" se for despesa fixa */}
                    {activeTab === 'despesas' && 'isFixed' in item && item.isFixed ? (
                      <View style={styles.fixedBadge}>
                        <Text style={styles.fixedText}>Despesa fixa</Text>
                      </View>
                    ) : null}

                    {'fileName' in item && item.fileName ? (
                      <Text style={styles.cardMeta}>
                        Arquivo: {item.fileName}
                      </Text>
                    ) : null}

                    {'description' in item && item.description ? (
                      <Text style={styles.cardMeta} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    {'next' in item && item.next ? (
                      <Text style={styles.cardMeta}>
                        Próxima revisão: {item.next}
                      </Text>
                    ) : null}

                    {activeTab === 'despesas' &&
                      'documents' in item &&
                      Array.isArray(item.documents) &&
                      item.documents.length > 0 && (
                        <View style={styles.documentsIndicator}>
                          <FileText size={14} color="#0A84FF" />
                          <Text style={styles.documentsIndicatorText}>
                            {item.documents.length} documento(s) anexado(s)
                          </Text>
                        </View>
                      )}
                  </TouchableOpacity>
                  
                  {allowActions ? (
                    <TouchableOpacity
                      style={styles.deleteButtonBottomRight}
                      onPress={event => handleDeleteCard(item, event)}
                      hitSlop={{
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                      }}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Modais */}
          <DocumentUploadModal
            visible={isDocumentModalVisible}
            onClose={closeDocumentModal}
            initialData={
              editingDocument
                ? {
                    name: editingDocument.title,
                    date: editingDocument.date,
                    fileName:
                      editingDocument.fileName ?? editingDocument.title,
                    fileUri: editingDocument.fileUri ?? '',
                    mimeType: editingDocument.mimeType,
                  }
                : undefined
            }
            onSubmit={async data => {
              try {
                const isoDate = brToIso(data.date);
                if (!isoDate) {
                  Alert.alert(
                    'Data inválida',
                    'Use o formato DD/MM/AAAA para a data.',
                  );
                  return;
                }

                if (editingDocument) {
                  // Se o arquivo mudou, faz upload do novo arquivo
                  let fileUrl = editingDocument.fileUri;
                  if (data.fileUri !== editingDocument.fileUri) {
                    const uploadedUrl = await uploadFileToStorage(
                      data.fileUri,
                      data.fileName,
                      data.mimeType,
                      'documentos',
                      'equipment'
                    );
                    if (uploadedUrl) {
                      fileUrl = uploadedUrl;
                    } else {
                      Alert.alert(
                        'Erro',
                        'Não foi possível fazer upload do arquivo. Tente novamente.'
                      );
                      return;
                    }
                  }

                  const { error } = await supabase
                    .from('equipment_documents')
                    .update({
                      name: data.name,
                      date: isoDate,
                      file_name: data.fileName,
                      file_url: fileUrl,
                      mime_type: data.mimeType,
                    })
                    .eq('id', editingDocument.id);

                  if (error) throw error;

                  setDocuments(prev =>
                    prev.map(doc =>
                      doc.id === editingDocument.id
                        ? {
                            ...doc,
                            title: data.name,
                            date: data.date,
                            fileName: data.fileName,
                            fileUri: fileUrl,
                            mimeType: data.mimeType,
                          }
                        : doc,
                    ),
                  );
                  setEditingDocument(null);
                } else {
                  // Faz upload do arquivo para o Supabase Storage
                  const fileUrl = await uploadFileToStorage(
                    data.fileUri,
                    data.fileName,
                    data.mimeType,
                    'documentos',
                    'equipment'
                  );

                  if (!fileUrl) {
                    Alert.alert(
                      'Erro',
                      'Não foi possível fazer upload do arquivo. Tente novamente.'
                    );
                    return;
                  }

                  const insertPayload = {
                    equipment_id: equipment.id,
                    name: data.name,
                    date: isoDate,
                    file_name: data.fileName,
                    file_url: fileUrl,
                    mime_type: data.mimeType,
                  };

                  const { data: inserted, error } = await supabase
                    .from('equipment_documents')
                    .insert(insertPayload)
                    .select('*')
                    .maybeSingle();

                  if (error) {
                    console.error('❌ Erro ao inserir documento no banco:', error);
                    throw error;
                  }

                  if (!inserted) {
                    throw new Error('Documento não foi inserido no banco de dados.');
                  }

                  const newDoc: DocumentItem = {
                    id: inserted.id,
                    title: inserted.name,
                    date: isoToBr(inserted.date),
                    fileName: inserted.file_name ?? inserted.name,
                    fileUri: inserted.file_url,
                    mimeType: inserted.mime_type,
                    type: 'Documento',
                  };

                  setDocuments(prev => [newDoc, ...prev]);
                }

                setDocumentModalVisible(false);
              } catch (err: any) {
                console.error('❌ Erro ao salvar documento:', err);
                const errorMessage = err?.message || 'Não foi possível salvar o documento do equipamento.';
                Alert.alert(
                  'Erro',
                  errorMessage,
                );
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
            files={previewFile?.files}
            initialIndex={previewFile?.initialIndex}
          />

          <ExpenseDocumentsModal
            visible={expenseDocumentsModalVisible}
            onClose={() => {
              setExpenseDocumentsModalVisible(false);
              setSelectedExpenseDocuments([]);
              setSelectedExpenseForDocument(null);
            }}
            documents={selectedExpenseDocuments}
            onDocumentPress={document => {
              setExpenseDocumentsModalVisible(false);
              // Encontra o índice do documento clicado
              const documentIndex = selectedExpenseDocuments?.findIndex(
                (doc) => doc.fileUri === document.fileUri
              ) || 0;
              setPreviewFile({
                uri: document.fileUri,
                name: document.fileName,
                mimeType: document.mimeType,
                files: selectedExpenseDocuments?.map((doc) => ({
                  fileUri: doc.fileUri,
                  fileName: doc.fileName,
                  mimeType: doc.mimeType || null,
                })) || [],
                initialIndex: documentIndex >= 0 ? documentIndex : 0,
              });
              setPreviewVisible(true);
            }}
            onDeleteDocument={async (document) => {
              if (!selectedExpenseForDocument || !selectedExpenseForDocument.expenseId) return;
              try {
                await deleteExpenseDocument(selectedExpenseForDocument.expenseId, document.fileUri);
                // Atualiza os documentos locais
                setSelectedExpenseDocuments((prev) => 
                  prev?.filter((doc) => doc.fileUri !== document.fileUri) || []
                );
                // Atualiza a despesa na lista local
                const expenseToUpdate = getAllExpenses().find(
                  exp => exp.id === selectedExpenseForDocument.expenseId
                );
                if (expenseToUpdate) {
                  setSelectedExpenseForDocument({
                    ...selectedExpenseForDocument,
                    documents: expenseToUpdate.documents?.filter((doc) => doc.fileUri !== document.fileUri) || [],
                  });
                }
              } catch (error: any) {
                Alert.alert('Erro', 'Não foi possível excluir o documento.');
              }
            }}
          />

          <ExpenseFormModal
            visible={isExpenseModalVisible}
            onClose={() => {
              setExpenseModalVisible(false);
              setEditingExpense(null);
            }}
            onSubmit={data => {
              if (editingExpense && editingExpense.expenseId) {
                // Editar despesa existente
                const expenseToUpdate = getAllExpenses().find(
                  exp => exp.id === editingExpense.expenseId
                );
                if (expenseToUpdate) {
                  updateExpense({
                    ...expenseToUpdate,
                    name: data.name,
                    category: data.category,
                    date: data.date,
                    value: data.value,
                    gestaoSubcategory: data.gestaoSubcategory,
                    observations: data.observations,
                    documents: data.documents,
                    isFixed: data.isFixed,
                    sector: data.sector,
                  });
                }
              } else {
                // Adicionar nova despesa
                addExpense({
                  name: data.name,
                  category: data.category,
                  date: data.date,
                  value: data.value,
                  center: selectedCenter,
                  equipmentId: equipment.id,
                  gestaoSubcategory: data.gestaoSubcategory,
                  observations: data.observations,
                  documents: data.documents,
                  isFixed: data.isFixed,
                  sector: data.sector,
                });
              }
              setExpenseModalVisible(false);
              setEditingExpense(null);
            }}
            initialData={
              editingExpense && editingExpense.expenseId
                ? (() => {
                    const expenseToEdit = getAllExpenses().find(
                      exp => exp.id === editingExpense.expenseId
                    );
                    return expenseToEdit
                      ? {
                          id: expenseToEdit.id,
                          category: expenseToEdit.category,
                          equipmentId: expenseToEdit.equipmentId,
                          name: expenseToEdit.name,
                          date: expenseToEdit.date,
                          value: expenseToEdit.value,
                          documents: expenseToEdit.documents || [],
                          gestaoSubcategory: expenseToEdit.gestaoSubcategory,
                          observations: expenseToEdit.observations,
                          isFixed: expenseToEdit.isFixed,
                          sector: expenseToEdit.sector,
                        }
                      : {
                          category: 'manutencao',
                          equipmentId: equipment.id,
                          name: '',
                          date: dayjs().format('DD/MM/YYYY'),
                          value: 0,
                          documents: [],
                        };
                  })()
                : {
                    category: 'manutencao',
                    equipmentId: equipment.id,
                    name: '',
                    date: dayjs().format('DD/MM/YYYY'),
                    value: 0,
                    documents: [],
                  }
            }
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
            onSubmit={async data => {
              try {
                const isoDate = brToIso(data.date);
                
                if (editingPhoto) {
                  // Se o arquivo mudou, faz upload do novo arquivo
                  let fileUrl = editingPhoto.fileUri;
                  if (data.uri !== editingPhoto.fileUri) {
                    const uploadedUrl = await uploadFileToStorage(
                      data.uri,
                      data.fileName,
                      data.mimeType,
                      'documentos',
                      'equipment'
                    );
                    if (uploadedUrl) {
                      fileUrl = uploadedUrl;
                    } else {
                      Alert.alert(
                        'Erro',
                        'Não foi possível fazer upload da foto. Tente novamente.'
                      );
                      return;
                    }
                  }

                  const updatePayload = {
                    equipment_id: equipment.id,
                    file_url: fileUrl,
                    file_name: data.fileName,
                    description: data.title,
                    mime_type: data.mimeType,
                    uploaded_at: isoDate ?? new Date().toISOString(),
                  };

                  const { error } = await supabase
                    .from('equipment_photos')
                    .update(updatePayload)
                    .eq('id', editingPhoto.id);

                  if (error) throw error;

                  setPhotos(prev =>
                    prev.map(photo =>
                      photo.id === editingPhoto.id
                        ? {
                            ...photo,
                            title: data.title,
                            date: data.date,
                            fileName: data.fileName,
                            fileUri: fileUrl,
                            mimeType: data.mimeType,
                          }
                        : photo,
                    ),
                  );
                  setEditingPhoto(null);
                } else {
                  // Faz upload da foto para o Supabase Storage
                  const fileUrl = await uploadFileToStorage(
                    data.uri,
                    data.fileName,
                    data.mimeType,
                    'documentos',
                    'equipment'
                  );

                  if (!fileUrl) {
                    Alert.alert(
                      'Erro',
                      'Não foi possível fazer upload da foto. Tente novamente.'
                    );
                    return;
                  }

                  // Tenta inserir com file_name primeiro
                  let insertPayload: any = {
                    equipment_id: equipment.id,
                    file_url: fileUrl,
                    file_name: data.fileName,
                    description: data.title,
                    mime_type: data.mimeType,
                    uploaded_at: isoDate ?? new Date().toISOString(),
                  };

                  let { data: inserted, error } = await supabase
                    .from('equipment_photos')
                    .insert(insertPayload)
                    .select('*')
                    .maybeSingle();

                  // Se der erro relacionado a file_name, tenta sem essa coluna
                  if (error && error.message?.includes('file_name')) {
                    console.warn('⚠️ Coluna file_name não encontrada, tentando sem ela...');
                    insertPayload = {
                      equipment_id: equipment.id,
                      file_url: fileUrl,
                      description: data.title,
                      mime_type: data.mimeType,
                      uploaded_at: isoDate ?? new Date().toISOString(),
                    };

                    const result = await supabase
                      .from('equipment_photos')
                      .insert(insertPayload)
                      .select('*')
                      .maybeSingle();

                    inserted = result.data;
                    error = result.error;

                    // Se inseriu sem file_name, tenta atualizar com file_name
                    if (inserted && !error) {
                      const updateResult = await supabase
                        .from('equipment_photos')
                        .update({ file_name: data.fileName })
                        .eq('id', inserted.id)
                        .select('*')
                        .maybeSingle();
                      
                      if (updateResult.data) {
                        inserted = updateResult.data;
                      }
                    }
                  }

                  if (error) {
                    console.error('❌ Erro ao inserir foto no banco:', error);
                    throw error;
                  }

                  if (!inserted) {
                    throw new Error('Foto não foi inserida no banco de dados.');
                  }

                  const newPhoto: PhotoItem = {
                    id: inserted.id,
                    title: inserted.description || data.title,
                    date: isoToBr(inserted.uploaded_at),
                    fileName:
                      inserted.file_name ||
                      inserted.description ||
                      data.fileName,
                    fileUri: inserted.file_url,
                    mimeType: inserted.mime_type,
                  };

                  setPhotos(prev => [newPhoto, ...prev]);
                }

                setPhotoModalVisible(false);
              } catch (err: any) {
                console.error('❌ Erro ao salvar foto:', err);
                const errorMessage = err?.message || 'Não foi possível salvar a foto do equipamento.';
                Alert.alert(
                  'Erro',
                  errorMessage,
                );
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
            onSubmit={async data => {
              try {
                const isoDate = brToIso(data.date);
                const isoNext = brToIso(data.next ?? undefined);

                if (!isoDate) {
                  Alert.alert(
                    'Data inválida',
                    'Use o formato DD/MM/AAAA para a data da revisão.',
                  );
                  return;
                }

                const payload: any = {
                  equipment_id: equipment.id,
                  type: data.type,
                  description: data.description,
                  date: isoDate,
                  next_date: isoNext,
                };

                if (editingReview) {
                  const { error } = await supabase
                    .from('equipment_reviews')
                    .update(payload)
                    .eq('id', editingReview.id);

                  if (error) throw error;

                  setReviews(prev =>
                    prev.map(review =>
                      review.id === editingReview.id
                        ? {
                            ...review,
                            title: data.type,
                            date: data.date,
                            description: data.description,
                            next: data.next ?? undefined,
                          }
                        : review,
                    ),
                  );
                  setEditingReview(null);
                } else {
                  const { data: inserted, error } = await supabase
                    .from('equipment_reviews')
                    .insert(payload)
                    .select('*')
                    .maybeSingle();

                  if (error) throw error;

                  const newReview: ReviewItem = {
                    id: inserted.id,
                    title: inserted.type || data.type,
                    date: isoToBr(inserted.date),
                    next: isoToBr(inserted.next_date),
                    description: inserted.description ?? data.description,
                  };

                  setReviews(prev => [newReview, ...prev]);
                }

                setReviewModalVisible(false);
              } catch (err) {
                console.log('❌ Erro ao salvar revisão:', err);
                Alert.alert(
                  'Erro',
                  'Não foi possível salvar a revisão do equipamento.',
                );
              }
            }}
          />

          <UpdateHoursModal
            visible={isUpdateHoursModalVisible}
            equipment={equipment}
            onClose={() => setUpdateHoursModalVisible(false)}
            onUpdate={async (equipmentId, newHours) => {
              await updateEquipmentHours(equipmentId, newHours);
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
  infoValueWarning: {
    color: '#FF9500',
  },
  infoValueError: {
    color: '#FF3B30',
  },
  updateHoursButton: {
    marginBottom: 20,
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  updateHoursButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  revisionAlert: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF4E5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  revisionAlertError: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF3B30',
  },
  revisionAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
  },
  revisionAlertTextError: {
    color: '#FF3B30',
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
    padding: 12,
    gap: 0,
    position: 'relative',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
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
    gap: 8,
    marginBottom: 4,
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
    gap: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
  fixedBadge: {
    backgroundColor: '#E6FEEA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  fixedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1B8A2F',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  cardActionButton: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
  },
  editButtonTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
    zIndex: 10,
  },
  deleteButtonBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,48,0.12)',
    zIndex: 10,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
});