import { supabase } from '@/src/lib/supabaseClient';
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
import { useFinancial, ExpenseDocument } from '../context/FinancialContext';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import dayjs from 'dayjs';

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

// 🔧 Helper para garantir formato ISO (YYYY-MM-DD) a partir de string
function toIsoDateOrNull(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // DD/MM/AAAA
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m1 = ddmmyyyy.exec(trimmed);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return `${yyyy}-${mm}-${dd}`;
  }

  // AAAA-MM-DD (já ISO)
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const m2 = yyyymmdd.exec(trimmed);
  if (m2) return trimmed;

  return null;
}

export const EquipmentDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<EquipmentParams>();
  const { selectedCenter } = useCostCenter();
  const { getEquipmentById, updateEquipment } = useEquipment();
  const { addExpense, updateExpense, deleteExpense, getAllExpenses } = useFinancial();

  // ---------- EQUIPAMENTO ----------
  const equipment = useMemo(() => {
    const equipmentId = params.id ?? 'eq-1';
    const contextEquipment = getEquipmentById(equipmentId);

    if (contextEquipment) {
      return contextEquipment;
    }

    // fallback se não achar no contexto
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

  // ---------- DESPESAS ----------
  const expenses: ExpenseItem[] = useMemo(() => {
    if (!equipment?.id) return [];

    const allExpensesList = getAllExpenses();
    const equipmentId = String(equipment.id).trim();

    const equipmentExpenses = allExpensesList.filter((exp) => {
      const expEquipmentId = exp.equipmentId ? String(exp.equipmentId).trim() : null;
      return (
        expEquipmentId &&
        expEquipmentId === equipmentId &&
        exp.category === 'manutencao'
      );
    });

    const sortedExpenses = equipmentExpenses.sort((a, b) => {
      const dateA = dayjs(a.date, 'DD/MM/YYYY').valueOf();
      const dateB = dayjs(b.date, 'DD/MM/YYYY').valueOf();
      return dateB - dateA;
    });

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
      documents: exp.documents || [],
      expenseId: exp.id,
    }));
  }, [equipment?.id, getAllExpenses]);

  // ---------- DOCUMENTOS / FOTOS / REVISÕES (Supabase) ----------
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  // DOCUMENTOS
  useEffect(() => {
    const loadDocuments = async () => {
      if (!equipment?.id) return;

      const { data, error } = await supabase
        .from('equipment_documents')
        .select('id, name, date, file_url, file_name')
        .eq('equipment_id', equipment.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar documentos:', error);
        return;
      }

      const mapped: DocumentItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.name,
        date: row.date ? dayjs(row.date).format('DD/MM/YYYY') : '',
        fileName: row.file_name ?? row.name,
        fileUri: row.file_url,
        mimeType: null,
        type: 'Documento',
      }));

      setDocuments(mapped);
    };

    loadDocuments();
  }, [equipment?.id]);

  // FOTOS
  useEffect(() => {
    const loadPhotos = async () => {
      if (!equipment?.id) return;

      const { data, error } = await supabase
        .from('equipment_photos')
        .select('id, file_url, description, uploaded_at')
        .eq('equipment_id', equipment.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar fotos:', error);
        return;
      }

      const mapped: PhotoItem[] = (data ?? []).map((row: any, index: number) => ({
        id: row.id,
        title: row.description ?? `Foto ${index + 1}`,
        date: row.uploaded_at
          ? dayjs(row.uploaded_at).format('DD/MM/YYYY')
          : '',
        fileName: undefined,
        fileUri: row.file_url,
        mimeType: null,
      }));

      setPhotos(mapped);
    };

    loadPhotos();
  }, [equipment?.id]);

  // REVISÕES
  useEffect(() => {
    const loadReviews = async () => {
      if (!equipment?.id) return;

      const { data, error } = await supabase
        .from('equipment_reviews')
        .select('id, type, description, date, next_date')
        .eq('equipment_id', equipment.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar revisões:', error);
        return;
      }

      const mapped: ReviewItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.type ?? 'Revisão',
        date: row.date ? dayjs(row.date).format('DD/MM/YYYY') : '',
        description: row.description ?? '',
        next: row.next_date
          ? dayjs(row.next_date).format('DD/MM/YYYY')
          : undefined,
      }));

      setReviews(mapped);
    };

    loadReviews();
  }, [equipment?.id]);

  // ---------- UI STATE ----------
  const [isDocumentModalVisible, setDocumentModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);

  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);

  const [expenseDocumentsModalVisible, setExpenseDocumentsModalVisible] =
    useState(false);
  const [selectedExpenseDocuments, setSelectedExpenseDocuments] = useState<
    ExpenseDocument[]
  >([]);

  const [activeTab, setActiveTab] = useState<TabKey>('despesas');

  // ---------- HANDLERS ----------
  const handleStatusToggle = () => {
    const newStatus = equipment.status === 'ativo' ? 'inativo' : 'ativo';
    updateEquipment(equipment.id, { status: newStatus });
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
    // se for despesa com documentos, abre modal
    if (
      activeTab === 'despesas' &&
      'documents' in item &&
      Array.isArray(item.documents) &&
      item.documents.length > 0
    ) {
      setSelectedExpenseDocuments(item.documents as ExpenseDocument[]);
      setExpenseDocumentsModalVisible(true);
      return;
    }

    // para documentos/fotos, abre preview
    if ('fileUri' in item && item.fileUri) {
      setPreviewFile({
        uri: item.fileUri,
        name: item.fileName ?? item.title,
        mimeType:
          'mimeType' in item ? (item.mimeType as string | null | undefined) : undefined,
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
    } else if (activeTab === 'despesas') {
      // Buscar a despesa completa do contexto
      const expenseItem = item as ExpenseItem;
      const allExpenses = getAllExpenses();
      const fullExpense = allExpenses.find((exp) => exp.id === expenseItem.expenseId || exp.id === expenseItem.id);
      
      if (fullExpense) {
        setEditingExpense(expenseItem);
        setExpenseModalVisible(true);
      }
    }
  };

  const handleDeleteCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent
  ) => {
    event.stopPropagation();
    Alert.alert('Excluir registro', 'Tem certeza que deseja remover este item?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          if (activeTab === 'documentos') {
            const document = item as DocumentItem;
            (async () => {
              try {
                const { error } = await supabase
                  .from('equipment_documents')
                  .delete()
                  .eq('id', document.id);

                if (error) {
                  console.error('❌ Erro ao excluir documento:', error);
                  Alert.alert('Erro', 'Não foi possível excluir o documento.');
                  return;
                }

                setDocuments((prev) =>
                  prev.filter((doc) => doc.id !== document.id)
                );
                if (previewFile?.uri === document.fileUri) {
                  setPreviewVisible(false);
                  setPreviewFile(null);
                }
                if (editingDocument?.id === document.id) {
                  setEditingDocument(null);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao excluir documento:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao excluir o documento.');
              }
            })();
          } else if (activeTab === 'fotos') {
            const photo = item as PhotoItem;
            (async () => {
              try {
                const { error } = await supabase
                  .from('equipment_photos')
                  .delete()
                  .eq('id', photo.id);

                if (error) {
                  console.error('❌ Erro ao excluir foto:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a foto.');
                  return;
                }

                setPhotos((prev) => prev.filter((pic) => pic.id !== photo.id));
                if (previewFile?.uri === photo.fileUri) {
                  setPreviewVisible(false);
                  setPreviewFile(null);
                }
                if (editingPhoto?.id === photo.id) {
                  setEditingPhoto(null);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao excluir foto:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao excluir a foto.');
              }
            })();
          } else if (activeTab === 'revisoes') {
            const review = item as ReviewItem;
            (async () => {
              try {
                const { error } = await supabase
                  .from('equipment_reviews')
                  .delete()
                  .eq('id', review.id);

                if (error) {
                  console.error('❌ Erro ao excluir revisão:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a revisão.');
                  return;
                }

                setReviews((prev) => prev.filter((rev) => rev.id !== review.id));
                if (editingReview?.id === review.id) {
                  setEditingReview(null);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao excluir revisão:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao excluir a revisão.');
              }
            })();
          } else if (activeTab === 'despesas') {
            const expenseItem = item as ExpenseItem;
            const expenseId = expenseItem.expenseId || expenseItem.id;
            deleteExpense(expenseId);
            if (editingExpense?.id === expenseItem.id || editingExpense?.expenseId === expenseId) {
              setEditingExpense(null);
            }
          }
        },
      },
    ]);
  };

  // ---------- RENDER ----------
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAction}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{actionLabel()}</Text>
              </TouchableOpacity>
            </View>

            {tabData.map((item) => {
              const allowActions =
                activeTab === 'documentos' ||
                activeTab === 'fotos' ||
                activeTab === 'revisoes' ||
                activeTab === 'despesas';
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
                      <Text style={styles.cardMeta}>
                        Arquivo: {item.fileName}
                      </Text>
                    ) : null}
                    {'description' in item && item.description ? (
                      <Text style={styles.cardMeta}>{item.description}</Text>
                    ) : null}
                    {'next' in item && item.next ? (
                      <Text style={styles.cardMeta}>Próxima: {item.next}</Text>
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

          {/* --------- MODAIS --------- */}
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
            onSubmit={async (data) => {
              try {
                // default: hoje se vier vazio
                if (!data.date || `${data.date}`.trim() === '') {
                  data.date = dayjs().format('DD/MM/YYYY');
                }

                const isoDate = toIsoDateOrNull(data.date);
                console.log('📅 Documento - raw:', data.date, 'iso:', isoDate);

                if (!isoDate) {
                  Alert.alert(
                    'Data inválida',
                    'Use o formato DD/MM/AAAA para a data do documento.'
                  );
                  return;
                }

                if (editingDocument) {
                  // UPDATE
                  const { error } = await supabase
                    .from('equipment_documents')
                    .update({
                      name: data.name,
                      date: isoDate,
                      file_url: data.fileUri,
                      file_name: data.fileName,
                    })
                    .eq('id', editingDocument.id);

                  if (error) {
                    console.error('❌ Erro ao atualizar documento:', error);
                    Alert.alert(
                      'Erro',
                      'Não foi possível atualizar o documento.'
                    );
                    return;
                  }

                  setDocuments((prev) =>
                    prev.map((doc) =>
                      doc.id === editingDocument.id
                        ? {
                            ...doc,
                            title: data.name,
                            date: dayjs(isoDate).format('DD/MM/YYYY'),
                            fileName: data.fileName,
                            fileUri: data.fileUri,
                            mimeType: data.mimeType,
                          }
                        : doc
                    )
                  );
                  setEditingDocument(null);
                } else {
                  // INSERT
                  const { data: inserted, error } = await supabase
                    .from('equipment_documents')
                    .insert({
                      equipment_id: equipment.id,
                      name: data.name,
                      date: isoDate,
                      file_url: data.fileUri,
                      file_name: data.fileName,
                    })
                    .select('id, name, date, file_url, file_name')
                    .single();

                  if (error || !inserted) {
                    console.error('❌ Erro ao salvar documento:', error);
                    Alert.alert(
                      'Erro',
                      'Não foi possível salvar o documento.'
                    );
                    return;
                  }

                  const newDoc: DocumentItem = {
                    id: inserted.id,
                    title: inserted.name,
                    date: inserted.date
                      ? dayjs(inserted.date).format('DD/MM/YYYY')
                      : dayjs(isoDate).format('DD/MM/YYYY'),
                    fileName: inserted.file_name ?? inserted.name,
                    fileUri: inserted.file_url,
                    mimeType: data.mimeType,
                    type: 'Documento',
                  };

                  setDocuments((prev) => [newDoc, ...prev]);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao salvar documento:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao salvar o documento.');
              } finally {
                setDocumentModalVisible(false);
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
            onClose={() => {
              setExpenseModalVisible(false);
              setEditingExpense(null);
            }}
            onSubmit={(data) => {
              if (editingExpense) {
                // UPDATE - buscar a despesa completa
                const allExpenses = getAllExpenses();
                const fullExpense = allExpenses.find(
                  (exp) => exp.id === editingExpense.expenseId || exp.id === editingExpense.id
                );
                
                if (fullExpense) {
                  updateExpense({
                    ...fullExpense,
                    name: data.name,
                    category: data.category,
                    date: data.date,
                    value: data.value,
                    equipmentId: data.equipmentId,
                    gestaoSubcategory: data.gestaoSubcategory,
                    observations: data.observations,
                    documents: data.documents,
                  });
                }
              } else {
                // CREATE
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
              }
              setExpenseModalVisible(false);
              setEditingExpense(null);
            }}
            initialData={
              editingExpense
                ? (() => {
                    // Buscar a despesa completa para preencher o formulário
                    const allExpenses = getAllExpenses();
                    const fullExpense = allExpenses.find(
                      (exp) => exp.id === editingExpense.expenseId || exp.id === editingExpense.id
                    );
                    
                    if (fullExpense) {
                      return {
                        id: fullExpense.id,
                        name: fullExpense.name,
                        category: fullExpense.category,
                        date: fullExpense.date,
                        value: fullExpense.value,
                        equipmentId: fullExpense.equipmentId,
                        gestaoSubcategory: fullExpense.gestaoSubcategory,
                        observations: fullExpense.observations,
                        documents: fullExpense.documents || [],
                      };
                    }
                    return undefined;
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
            onSubmit={async (data) => {
              try {
                if (editingPhoto) {
                  const { error } = await supabase
                    .from('equipment_photos')
                    .update({
                      file_url: data.uri,
                      description: data.title,
                    })
                    .eq('id', editingPhoto.id);

                  if (error) {
                    console.error('❌ Erro ao atualizar foto:', error);
                    Alert.alert(
                      'Erro',
                      'Não foi possível atualizar a foto.'
                    );
                    return;
                  }

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
                  const { data: inserted, error } = await supabase
                    .from('equipment_photos')
                    .insert({
                      equipment_id: equipment.id,
                      file_url: data.uri,
                      description: data.title,
                    })
                    .select('id, file_url, description, uploaded_at')
                    .single();

                  if (error || !inserted) {
                    console.error('❌ Erro ao salvar foto:', error);
                    Alert.alert('Erro', 'Não foi possível salvar a foto.');
                    return;
                  }

                  const newPhoto: PhotoItem = {
                    id: inserted.id,
                    title: inserted.description ?? data.title,
                    date: inserted.uploaded_at
                      ? dayjs(inserted.uploaded_at).format('DD/MM/YYYY')
                      : data.date,
                    fileName: data.fileName,
                    fileUri: inserted.file_url,
                    mimeType: data.mimeType,
                  };

                  setPhotos((prev) => [newPhoto, ...prev]);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao salvar foto:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao salvar a foto.');
              } finally {
                setPhotoModalVisible(false);
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
            onSubmit={async (data) => {
              try {
                // DATA PRINCIPAL
                if (!data.date || `${data.date}`.trim() === '') {
                  data.date = dayjs().format('DD/MM/YYYY');
                }

                const isoDate = toIsoDateOrNull(data.date);
                console.log('📅 Revisão - raw date:', data.date, 'iso:', isoDate);

                if (!isoDate) {
                  Alert.alert(
                    'Data inválida',
                    'Use o formato DD/MM/AAAA para a data da revisão.'
                  );
                  return;
                }

                // PRÓXIMA DATA (opcional)
                let isoNextDate: string | null = null;
                if (data.next && `${data.next}`.trim() !== '') {
                  isoNextDate = toIsoDateOrNull(data.next);
                  console.log(
                    '📅 Revisão - raw next:',
                    data.next,
                    'isoNextDate:',
                    isoNextDate
                  );
                  // se usuário digitar errado, simplesmente ignora próxima data
                  if (!isoNextDate) {
                    isoNextDate = null;
                  }
                }

                if (editingReview) {
                  // UPDATE
                  const { error } = await supabase
                    .from('equipment_reviews')
                    .update({
                      type: data.type,
                      description: data.description,
                      date: isoDate,
                      next_date: isoNextDate,
                    })
                    .eq('id', editingReview.id);

                  if (error) {
                    console.error('❌ Erro ao atualizar revisão:', error);
                    Alert.alert(
                      'Erro',
                      'Não foi possível atualizar a revisão.'
                    );
                    return;
                  }

                  setReviews((prev) =>
                    prev.map((review) =>
                      review.id === editingReview.id
                        ? {
                            ...review,
                            title: data.type,
                            date: dayjs(isoDate!).format('DD/MM/YYYY'),
                            description: data.description,
                            next:
                              isoNextDate && isoNextDate !== null
                                ? dayjs(isoNextDate).format('DD/MM/YYYY')
                                : undefined,
                          }
                        : review
                    )
                  );
                  setEditingReview(null);
                } else {
                  // INSERT
                  const { data: inserted, error } = await supabase
                    .from('equipment_reviews')
                    .insert({
                      equipment_id: equipment.id,
                      type: data.type,
                      description: data.description,
                      date: isoDate,
                      next_date: isoNextDate,
                    })
                    .select('id, type, description, date, next_date')
                    .single();

                  if (error || !inserted) {
                    console.error('❌ Erro ao salvar revisão:', error);
                    Alert.alert('Erro', 'Não foi possível salvar a revisão.');
                    return;
                  }

                  const newReview: ReviewItem = {
                    id: inserted.id,
                    title: inserted.type ?? 'Revisão',
                    date: inserted.date
                      ? dayjs(inserted.date).format('DD/MM/YYYY')
                      : dayjs(isoDate!).format('DD/MM/YYYY'),
                    description: inserted.description ?? '',
                    next: inserted.next_date
                      ? dayjs(inserted.next_date).format('DD/MM/YYYY')
                      : undefined,
                  };

                  setReviews((prev) => [newReview, ...prev]);
                }
              } catch (e) {
                console.error('❌ Erro inesperado ao salvar revisão:', e);
                Alert.alert('Erro', 'Ocorreu um erro ao salvar a revisão.');
              } finally {
                setReviewModalVisible(false);
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
    gap: 8,
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A84FF',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: '#E5F1FF',
  },
  tabLabel: {
    fontSize: 13,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
  },
  cardActionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  cardContent: {
    gap: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6C6C70',
  },
  cardMeta: {
    fontSize: 13,
    color: '#8E8E93',
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
    fontSize: 13,
    color: '#0A84FF',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
});