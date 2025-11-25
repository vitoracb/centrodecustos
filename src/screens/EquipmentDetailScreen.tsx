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

import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import { ExpenseDocument } from '../context/FinancialContext';

import dayjs from 'dayjs';
import { supabase } from '@/src/lib/supabaseClient';

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
  const { getEquipmentById, updateEquipment } = useEquipment();
  const { addExpense, getAllExpenses } = useFinancial();

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
      return (
        expEquipmentId &&
        expEquipmentId === equipmentId &&
        exp.category === 'manutencao'
      );
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
      setSelectedExpenseDocuments(item.documents as ExpenseDocument[]);
      setExpenseDocumentsModalVisible(true);
      return;
    }

    if ('fileUri' in item && item.fileUri) {
      setPreviewFile({
        uri: item.fileUri!,
        name: item.fileName ?? item.title,
        mimeType:
          'mimeType' in item ? (item.mimeType as string | null | undefined) : undefined,
      });
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
    }
  };

  const handleDeleteCard = (
    item: (typeof tabData)[number],
    event: GestureResponderEvent,
  ) => {
    event.stopPropagation();

    Alert.alert('Excluir registro', 'Tem certeza que deseja remover este item?', [
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
                <Text style={styles.infoLabel}>Próxima revisão</Text>
                <Text style={styles.infoValue}>{equipment.nextReview}</Text>
              </View>
            </View>
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
                        onPress={event => handleEditCard(item, event)}
                        hitSlop={{
                          top: 10,
                          bottom: 10,
                          left: 10,
                          right: 10,
                        }}
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

                    {'fileName' in item && item.fileName ? (
                      <Text style={styles.cardMeta}>
                        Arquivo: {item.fileName}
                      </Text>
                    ) : null}

                    {'description' in item && item.description ? (
                      <Text style={styles.cardMeta}>{item.description}</Text>
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
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[styles.cardActionButton, styles.deleteButton]}
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
                    </View>
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
                  const { error } = await supabase
                    .from('equipment_documents')
                    .update({
                      name: data.name,
                      date: isoDate,
                      file_name: data.fileName,
                      file_url: data.fileUri,
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
                            fileUri: data.fileUri,
                            mimeType: data.mimeType,
                          }
                        : doc,
                    ),
                  );
                  setEditingDocument(null);
                } else {
                  const insertPayload = {
                    equipment_id: equipment.id,
                    name: data.name,
                    date: isoDate,
                    file_name: data.fileName,
                    file_url: data.fileUri,
                    mime_type: data.mimeType,
                  };

                  const { data: inserted, error } = await supabase
                    .from('equipment_documents')
                    .insert(insertPayload)
                    .select('*')
                    .maybeSingle();

                  if (error) throw error;

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
              } catch (err) {
                console.log('❌ Erro ao salvar documento:', err);
                Alert.alert(
                  'Erro',
                  'Não foi possível salvar o documento do equipamento.',
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
          />

          <ExpenseDocumentsModal
            visible={expenseDocumentsModalVisible}
            onClose={() => {
              setExpenseDocumentsModalVisible(false);
              setSelectedExpenseDocuments([]);
            }}
            documents={selectedExpenseDocuments}
            onDocumentPress={document => {
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
            onSubmit={data => {
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
            onSubmit={async data => {
              try {
                const isoDate = brToIso(data.date);
                const insertPayload = {
                  equipment_id: equipment.id,
                  file_url: data.uri,
                  file_name: data.fileName,
                  description: data.title,
                  mime_type: data.mimeType,
                  uploaded_at: isoDate ?? new Date().toISOString(),
                };

                if (editingPhoto) {
                  const { error } = await supabase
                    .from('equipment_photos')
                    .update(insertPayload)
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
                            fileUri: data.uri,
                            mimeType: data.mimeType,
                          }
                        : photo,
                    ),
                  );
                  setEditingPhoto(null);
                } else {
                  const { data: inserted, error } = await supabase
                    .from('equipment_photos')
                    .insert(insertPayload)
                    .select('*')
                    .maybeSingle();

                  if (error) throw error;

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
              } catch (err) {
                console.log('❌ Erro ao salvar foto:', err);
                Alert.alert(
                  'Erro',
                  'Não foi possível salvar a foto do equipamento.',
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