import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SwipeableContainer } from '../components/SwipeableContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Plus,
  Filter,
  Edit3,
  Trash2,
  FileText,
  ChevronDown,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useFinancial, Receipt, Expense, ExpenseStatus, ExpenseDocument, ReceiptStatus } from '../context/FinancialContext';
import { usePermissions } from '../context/PermissionsContext';
import { useEquipment } from '../context/EquipmentContext';
import { ReceiptFormModal } from '../components/ReceiptFormModal';
import { ReceiptFilterModal, ReceiptFilters } from '../components/ReceiptFilterModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { ExpenseFilterModal, ExpenseFilters } from '../components/ExpenseFilterModal';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { ExpenseBarChart } from '../components/ExpenseBarChart';
import { ExpenseSectorChart } from '../components/ExpenseSectorChart';
import { CostCenterComparisonChart } from '../components/CostCenterComparisonChart';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseStatusModal } from '../components/ExpenseStatusModal';
import { ReceiptStatusModal } from '../components/ReceiptStatusModal';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { FinanceListSkeleton } from '../components/skeletons/FinanceListSkeleton';
import { exportToPDF, exportToExcel, buildReportHTML, ReportData } from '../lib/reportExport';
import { shareFile } from '../lib/shareUtils';
import { showSuccess, showError } from '../lib/toast';
import { validateFile, checkFileSizeAndAlert } from '../lib/validations';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// ✅ REFATORADO: Imports dos módulos separados
import {
  CATEGORY_LABELS,
  SECTOR_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  CENTER_LABELS,
  EXPENSES_PAGE_SIZE,
  TABS,
} from './financeiro/constants';

import {
  formatCurrency,
  getReceiptFixedInfo,
  getExpenseInstallmentInfo,
  getSharedExpenseDocuments,
  getExpenseFixedInfo,
} from './financeiro/helpers';

dayjs.locale('pt-br');

// Alias para manter compatibilidade com código existente
const centerLabels = CENTER_LABELS;

export const FinanceiroScreen = () => {
  const params = useLocalSearchParams();
  const { selectedCenter, costCenters } = useCostCenter();
  const {
    expenses, // 🚀 OPTIMISTIC: Adiciona expenses para atualizar UI imediatamente
    getReceiptsByCenter,
    getExpensesByCenter,
    getAllExpenses,
    getAllReceipts,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addExpense,
    updateExpense,
    deleteExpense,
    addDocumentToExpense,
    deleteExpenseDocument,
    generateFixedExpenses,
    loading: financialLoading,
    getExpensesForDateRange,
    getReceiptsForDateRange,
  } = useFinancial();
  const { canEdit, canDelete, isAdmin } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);
  const [reportPreview, setReportPreview] = useState<{
    type: 'pdf' | 'excel';
    html: string;
    data: ReportData;
  } | null>(null);

  // 📊 State for FULL period data (for charts)
  const [serverExpenses, setServerExpenses] = useState<Expense[]>([]);
  // 📊 State for FULL period data (for fechamneto/closure)
  const [closureServerExpenses, setClosureServerExpenses] = useState<Expense[]>([]);
  const [closureServerReceipts, setClosureServerReceipts] = useState<Receipt[]>([]);
  const [closureLoading, setClosureLoading] = useState(false);

  const [localDeletedIds, setLocalDeletedIds] = useState<Set<string>>(new Set());
  const [chartExpensesLoading, setChartExpensesLoading] = useState(false);

  // Para o FinancialContext, os dados são recarregados automaticamente via useEffect
  // Vamos apenas forçar uma atualização do estado
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Aguarda um pouco para mostrar o feedback visual
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);
  const { getEquipmentsByCenter } = useEquipment();

  // Filtra equipamentos pelo centro de custo selecionado
  const equipmentsForFilter = useMemo(
    () => getEquipmentsByCenter(selectedCenter),
    [getEquipmentsByCenter, selectedCenter]
  );
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Recebimentos');
  const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
  const [isReceiptFilterVisible, setReceiptFilterVisible] = useState(false);
  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>({});
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isExpenseFilterVisible, setExpenseFilterVisible] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({});
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(dayjs());
  const [closureMode, setClosureMode] = useState<'mensal' | 'anual'>('mensal');
  const [receiptMode, setReceiptMode] = useState<'mensal' | 'anual'>('mensal');
  const [selectedReceiptPeriod, setSelectedReceiptPeriod] = useState(dayjs());
  const [expenseMode, setExpenseMode] = useState<'mensal' | 'anual'>('mensal');
  const [selectedExpensePeriod, setSelectedExpensePeriod] = useState(dayjs());
  const [expensePage, setExpensePage] = useState(1);
  const [expenseDocumentsModalVisible, setExpenseDocumentsModalVisible] = useState(false);
  const [selectedExpenseDocuments, setSelectedExpenseDocuments] = useState<Expense['documents']>([]);
  const [selectedExpenseForDocument, setSelectedExpenseForDocument] = useState<Expense | null>(null);
  const [documentTypeModalVisible, setDocumentTypeModalVisible] = useState(false);
  const [documentInputMode, setDocumentInputMode] = useState<'file' | 'photo' | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [receiptStatusModalVisible, setReceiptStatusModalVisible] = useState(false);
  const [selectedReceiptForStatus, setSelectedReceiptForStatus] = useState<Receipt | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
    files?: {
      fileUri: string;
      fileName: string;
      mimeType: string | null;
    }[];
    initialIndex?: number;
  } | null>(null);
  const [statusModalExpense, setStatusModalExpense] = useState<Expense | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'expenses' | 'receipts' | 'balance'>('expenses');
  const [isExportingClosure, setIsExportingClosure] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [expenseSortOption, setExpenseSortOption] = useState<
    'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'name_asc' | 'category_asc' | 'sector_asc'
  >('date_desc');
  const [isExpenseSortDropdownOpen, setIsExpenseSortDropdownOpen] = useState(false);
  const [isExpenseBottomNavActive, setIsExpenseBottomNavActive] = useState(false);

  // Ref para rastrear se já aplicamos os parâmetros
  const paramsAppliedRef = useRef(false);

  // 📊 Fetch full period data for charts when period/center changes
  // Otimização: Separa o fetch de dados do servidor da atualização otimista
  useEffect(() => {
    const fetchChartData = async () => {
      setChartExpensesLoading(true);
      // ✅ CORREÇÃO: Limpa dados antigos antes de buscar novos para evitar flicker
      setServerExpenses([]);
      try {
        let startDate: string;
        let endDate: string;

        if (expenseMode === 'mensal') {
          startDate = selectedExpensePeriod.startOf('month').format('YYYY-MM-DD');
          endDate = selectedExpensePeriod.endOf('month').format('YYYY-MM-DD');
        } else {
          startDate = selectedExpensePeriod.startOf('year').format('YYYY-MM-DD');
          endDate = selectedExpensePeriod.endOf('year').format('YYYY-MM-DD');
        }

        const data = await getExpensesForDateRange(startDate, endDate, selectedCenter);
        setServerExpenses(data);
      } catch (error) {
        console.error('Error fetching chart expenses:', error);
      } finally {
        setChartExpensesLoading(false);
      }
    };

    fetchChartData();
  }, [selectedExpensePeriod, expenseMode, selectedCenter, getExpensesForDateRange]);

  // 📊 Fetch full period data for closure when tab/period/center changes
  useEffect(() => {
    const fetchClosureData = async () => {
      if (activeTab !== 'Fechamento') return;

      setClosureLoading(true);
      // ✅ CORREÇÃO: Limpa dados antigos antes de buscar novos para evitar flicker
      setClosureServerExpenses([]);
      setClosureServerReceipts([]);
      try {
        let startDate: string;
        let endDate: string;

        // Determina o intervalo de datas baseado no modo (mensal/anual)
        if (closureMode === 'mensal') {
          startDate = selectedPeriod.startOf('month').format('YYYY-MM-DD');
          endDate = selectedPeriod.endOf('month').format('YYYY-MM-DD');
        } else {
          startDate = selectedPeriod.startOf('year').format('YYYY-MM-DD');
          endDate = selectedPeriod.endOf('year').format('YYYY-MM-DD');
        }

        // Busca despesas e recebimentos em paralelo
        // Passamos undefined como center para pegar DE TODOS os centros (para o gráfico comparativo)
        const [expensesData, receiptsData] = await Promise.all([
          getExpensesForDateRange(startDate, endDate, undefined),
          getReceiptsForDateRange(startDate, endDate, undefined)
        ]);

        // Verifica se o usuário tem permissão para ver todos os dados
        // Se não for admin, talvez devessemos filtrar aqui? 
        // Mas a regra de negócio diz que Admin vê tudo. Se User normal, a query do Supabase já filtra por user_id. 
        // O app parece ser single-tenant ou multi-user onde cada user vê seus dados.
        // A filtragem por centro é visual/organizacional.

        setClosureServerExpenses(expensesData);
        setClosureServerReceipts(receiptsData);
      } catch (error) {
        console.error('Error fetching closure data:', error);
      } finally {
        setClosureLoading(false);
      }
    };

    fetchClosureData();
  }, [selectedPeriod, closureMode, activeTab, getExpensesForDateRange, getReceiptsForDateRange]);

  // Mescla dados do servidor com dados otimistas para o Fechamento (Despesas)
  const closureExpenses = useMemo(() => {
    if (activeTab !== 'Fechamento') return [];

    const serverIds = new Set(closureServerExpenses.map(e => e.id));

    // Itens do contexto (otimistas/recentes) que não estão no servidor
    const pendingItems = expenses.filter((e) => {
      // Para o fechamento, queremos itens de TODOS os centros se eles forem novos
      // mas se o usuário acabou de criar num centro específico, ele aparecerá aqui

      if (serverIds.has(e.id)) return false; // Já está na lista do servidor
      if (localDeletedIds.has(e.id)) return false; // Foi deletado localmente

      const [day, month, year] = e.date.split('/').map(Number);
      const expenseDate = dayjs(`${year}-${month}-${day}`);
      if (!expenseDate.isValid()) return false;

      if (closureMode === 'mensal') {
        return expenseDate.isSame(selectedPeriod, 'month');
      } else {
        return expenseDate.isSame(selectedPeriod, 'year');
      }
    });

    const visibleServerExpenses = closureServerExpenses.filter(e => !localDeletedIds.has(e.id));
    return [...pendingItems, ...visibleServerExpenses];
  }, [closureServerExpenses, expenses, localDeletedIds, selectedPeriod, closureMode, activeTab]);

  // Mescla dados do servidor com dados otimistas para o Fechamento (Recebimentos)
  const closureReceipts = useMemo(() => {
    if (activeTab !== 'Fechamento') return [];

    // Receipt não tem "receipts" context optimista exposto separadamente no provider da mesma forma que expenses?
    // Verificando useFinancial... Sim, tem `receipts`.
    // Mas Receipts geralmente usamos `allReceipts`. Vamos usar a mesma lógica.

    const serverIds = new Set(closureServerReceipts.map(r => r.id));

    const pendingItems = getAllReceipts().filter((r) => {
      // getAllReceipts pega do contexto (paginado). 
      // Se tivermos itens criados recentemente (temp-), estarão lá.

      if (serverIds.has(r.id)) return false;

      const [day, month, year] = r.date.split('/').map(Number);
      const receiptDate = dayjs(`${year}-${month}-${day}`);
      if (!receiptDate.isValid()) return false;

      if (closureMode === 'mensal') {
        return receiptDate.isSame(selectedPeriod, 'month');
      } else {
        return receiptDate.isSame(selectedPeriod, 'year');
      }
    });

    return [...pendingItems, ...closureServerReceipts];
  }, [closureServerReceipts, getAllReceipts, selectedPeriod, closureMode, activeTab]);

  // Deriva a lista final mesclando dados do servidor com estado otimista (contexto)
  // Isso roda síncronamente sem disparar novos fetches de rede
  const chartExpenses = useMemo(() => {
    // Cria um Set com os IDs que já estão no servido (para busca rápida O(1))
    const serverIds = new Set(serverExpenses.map(e => e.id));

    // 1. Itens do Contexto que NÃO estão ne lista do servidor
    // Isso inclui:
    // a) Itens otimistas (temp-*)
    // b) Itens recém-confirmados que ainda não foram buscados novamente do servidor
    const pendingOrRecentItems = expenses.filter((e) => {
      // Deve ser do centro atual
      if (e.center !== selectedCenter) return false;

      // Se já está na lista do servidor, ignora (usa a versão do servidor)
      if (serverIds.has(e.id)) return false;

      // Verifica se está no período visualizado
      const [day, month, year] = e.date.split('/').map(Number);
      const expenseDate = dayjs(`${year}-${month}-${day}`);

      if (expenseMode === 'mensal') {
        return expenseDate.isSame(selectedExpensePeriod, 'month');
      } else {
        return expenseDate.isSame(selectedExpensePeriod, 'year');
      }
    });

    // 2. Dados do servidor, excluindo itens removidos localmente
    const visibleServerExpenses = serverExpenses.filter(e => !localDeletedIds.has(e.id));

    // Retorna a combinação (Recentes do Contexto + Servidor Filtrado)
    return [...pendingOrRecentItems, ...visibleServerExpenses];
  }, [serverExpenses, expenses, localDeletedIds, selectedCenter, selectedExpensePeriod, expenseMode]);

  // Sincroniza períodos entre abas quando o usuário troca de aba
  const lastActiveTabRef = useRef(activeTab);
  useEffect(() => {
    // Só sincroniza se a aba mudou (não na primeira renderização)
    if (lastActiveTabRef.current !== activeTab) {
      // Pega o período da aba anterior
      let currentPeriod: dayjs.Dayjs;

      if (lastActiveTabRef.current === 'Recebimentos') {
        currentPeriod = selectedReceiptPeriod;
      } else if (lastActiveTabRef.current === 'Despesas') {
        currentPeriod = selectedExpensePeriod;
      } else {
        currentPeriod = selectedPeriod;
      }

      // Aplica o período na nova aba
      if (activeTab === 'Recebimentos' && !selectedReceiptPeriod.isSame(currentPeriod, 'month')) {
        setSelectedReceiptPeriod(currentPeriod);
      } else if (activeTab === 'Despesas' && !selectedExpensePeriod.isSame(currentPeriod, 'month')) {
        setSelectedExpensePeriod(currentPeriod);
      } else if (activeTab === 'Fechamento' && !selectedPeriod.isSame(currentPeriod, 'month')) {
        setSelectedPeriod(currentPeriod);
      }

      lastActiveTabRef.current = activeTab;
    }
  }, [activeTab, selectedPeriod, selectedReceiptPeriod, selectedExpensePeriod]);

  // Swipe handlers para navegação de período
  const handleReceiptSwipeLeft = useCallback(() => {
    if (receiptMode === 'mensal') {
      setSelectedReceiptPeriod((prev) => prev.add(1, 'month'));
    } else {
      setSelectedReceiptPeriod((prev) => prev.add(1, 'year'));
    }
  }, [receiptMode]);

  const handleReceiptSwipeRight = useCallback(() => {
    if (receiptMode === 'mensal') {
      setSelectedReceiptPeriod((prev) => prev.subtract(1, 'month'));
    } else {
      setSelectedReceiptPeriod((prev) => prev.subtract(1, 'year'));
    }
  }, [receiptMode]);

  const handleExpenseSwipeLeft = useCallback(() => {
    if (expenseMode === 'mensal') {
      setSelectedExpensePeriod((prev) => prev.add(1, 'month'));
    } else {
      setSelectedExpensePeriod((prev) => prev.add(1, 'year'));
    }
  }, [expenseMode]);

  const handleExpenseSwipeRight = useCallback(() => {
    if (expenseMode === 'mensal') {
      setSelectedExpensePeriod((prev) => prev.subtract(1, 'month'));
    } else {
      setSelectedExpensePeriod((prev) => prev.subtract(1, 'year'));
    }
  }, [expenseMode]);

  const handleClosureSwipeLeft = useCallback(() => {
    if (closureMode === 'mensal') {
      setSelectedPeriod((prev) => prev.add(1, 'month'));
    } else {
      setSelectedPeriod((prev) => prev.add(1, 'year'));
    }
  }, [closureMode]);

  const handleClosureSwipeRight = useCallback(() => {
    if (closureMode === 'mensal') {
      setSelectedPeriod((prev) => prev.subtract(1, 'month'));
    } else {
      setSelectedPeriod((prev) => prev.subtract(1, 'year'));
    }
  }, [closureMode]);

  const handlePickExpenseDocument = async (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' | 'boleto') => {
    if (!selectedExpenseForDocument || isUploadingDocument) return;

    setIsUploadingDocument(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType,
        asset.name,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Tipo de arquivo não permitido');
        return;
      }

      const newDocument = await addDocumentToExpense(selectedExpenseForDocument.id, {
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType,
        type,
      });

      // Atualiza a lista de documentos imediatamente
      setSelectedExpenseDocuments(prev => [...(prev || []), newDocument]);
      setSelectedExpenseForDocument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          documents: [...(prev.documents || []), newDocument],
        };
      });

      Alert.alert('Sucesso', 'Documento adicionado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao adicionar documento:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o documento.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleAddExpenseDocument = () => {
    if (!selectedExpenseForDocument || isUploadingDocument) {
      return;
    }

    // Fecha o modal de documentos antes de abrir o Action Sheet
    setExpenseDocumentsModalVisible(false);

    Alert.alert(
      'Tipo de documento',
      undefined,
      [
        {
          text: 'Nota Fiscal',
          onPress: () => handlePickExpenseDocument('nota_fiscal'),
        },
        {
          text: 'Recibo',
          onPress: () => handlePickExpenseDocument('recibo'),
        },
        {
          text: 'Comprovante',
          onPress: () => handlePickExpenseDocument('comprovante_pagamento'),
        },
        {
          text: 'Boleto',
          onPress: () => handlePickExpenseDocument('boleto'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
    );
  };

  const pickExpensePhotoFromSource = async (
    type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' | 'boleto',
    source: 'camera' | 'library',
  ) => {
    if (!selectedExpenseForDocument || isUploadingDocument) return;

    try {
      if (source === 'library') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar fotos.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];

        const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
        if (!isValidSize) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/*'];
        const fileValidation = await validateFile(
          asset.uri,
          asset.mimeType ?? 'image/jpeg',
          asset.fileName ?? undefined,
          allowedTypes,
          80,
        );

        if (!fileValidation.isValid) {
          Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Apenas imagens são permitidas');
          return;
        }

        const newDocument = await addDocumentToExpense(selectedExpenseForDocument.id, {
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          type,
        });

        setSelectedExpenseDocuments(prev => [...(prev || []), newDocument]);
        setSelectedExpenseForDocument(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: [...(prev.documents || []), newDocument],
          };
        });

        Alert.alert('Sucesso', 'Foto adicionada com sucesso!');
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permissão necessária', 'Autorize o acesso à câmera para tirar fotos.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];

        const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
        if (!isValidSize) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/*'];
        const fileValidation = await validateFile(
          asset.uri,
          asset.mimeType ?? 'image/jpeg',
          asset.fileName ?? undefined,
          allowedTypes,
          80,
        );

        if (!fileValidation.isValid) {
          Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Apenas imagens são permitidas');
          return;
        }

        const newDocument = await addDocumentToExpense(selectedExpenseForDocument.id, {
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          type,
        });

        setSelectedExpenseDocuments(prev => [...(prev || []), newDocument]);
        setSelectedExpenseForDocument(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: [...(prev.documents || []), newDocument],
          };
        });

        Alert.alert('Sucesso', 'Foto adicionada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar foto:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a foto.');
    }
  };

  const handleAddExpensePhoto = () => {
    if (!selectedExpenseForDocument || isUploadingDocument) {
      return;
    }

    // Fecha o modal de documentos antes de abrir o Action Sheet
    setExpenseDocumentsModalVisible(false);

    const askPhotoSource = (
      type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' | 'boleto',
    ) => {
      Alert.alert(
        'Origem da foto',
        undefined,
        [
          {
            text: 'Tirar foto',
            onPress: () => pickExpensePhotoFromSource(type, 'camera'),
          },
          {
            text: 'Escolher do álbum',
            onPress: () => pickExpensePhotoFromSource(type, 'library'),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ],
      );
    };

    Alert.alert(
      'Tipo de documento',
      undefined,
      [
        {
          text: 'Nota Fiscal',
          onPress: () => askPhotoSource('nota_fiscal'),
        },
        {
          text: 'Recibo',
          onPress: () => askPhotoSource('recibo'),
        },
        {
          text: 'Comprovante',
          onPress: () => askPhotoSource('comprovante_pagamento'),
        },
        {
          text: 'Boleto',
          onPress: () => askPhotoSource('boleto'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
    );
  };

  const handleAddPaymentReceiptDocument = async () => {
    if (!selectedExpenseForDocument || isUploadingDocument) return;

    setIsUploadingDocument(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType,
        asset.name,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Tipo de arquivo não permitido');
        return;
      }

      const newDocument = await addDocumentToExpense(selectedExpenseForDocument.id, {
        fileName: asset.name ?? 'Comprovante de Pagamento',
        fileUri: asset.uri,
        mimeType: asset.mimeType,
        type: 'comprovante_pagamento',
      });

      // Atualiza a lista de documentos imediatamente
      setSelectedExpenseDocuments(prev => [...(prev || []), newDocument]);
      setSelectedExpenseForDocument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          documents: [...(prev.documents || []), newDocument],
        };
      });

      Alert.alert('Sucesso', 'Comprovante de pagamento adicionado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao adicionar comprovante de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comprovante de pagamento.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleAddPaymentReceiptPhoto = async () => {
    if (!selectedExpenseForDocument || isUploadingDocument) return;

    setIsUploadingDocument(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo (imagens)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/*'];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.fileName ?? undefined,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Apenas imagens são permitidas');
        return;
      }

      const newDocument = await addDocumentToExpense(selectedExpenseForDocument.id, {
        fileName: asset.fileName ?? 'Comprovante de Pagamento',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        type: 'comprovante_pagamento',
      });

      // Atualiza a lista de documentos imediatamente
      setSelectedExpenseDocuments(prev => [...(prev || []), newDocument]);
      setSelectedExpenseForDocument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          documents: [...(prev.documents || []), newDocument],
        };
      });

      Alert.alert('Sucesso', 'Comprovante de pagamento adicionado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao adicionar comprovante de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comprovante de pagamento.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleStatusChange = (expense: Expense, newStatus: ExpenseStatus) => {
    // Validação: "pago" só pode ser selecionado se houver documentos
    if (newStatus === 'pago' && (!expense.documents || expense.documents.length === 0)) {
      Alert.alert(
        'Status não disponível',
        'O status "Pago" só pode ser aplicado quando há comprovante anexado à despesa.'
      );
      return;
    }

    updateExpense({
      ...expense,
      status: newStatus,
    });
  };

  const handleDeleteExpense = async (id: string) => {
    // Atualiza imediatamente a UI (Set state é muito rápido)
    setLocalDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Chama a função do contexto (que também faz optimistic update no contexto global)
    await deleteExpense(id);
  };

  // Aplica parâmetros da navegação (vindo do dashboard) - apenas uma vez
  useEffect(() => {
    const tabParam = params.tab as string | undefined;
    const monthParam = params.month as string | undefined;
    const yearParam = params.year as string | undefined;

    // Reset ref quando params mudam
    if (tabParam || monthParam || yearParam) {
      paramsAppliedRef.current = false;
    }

    if (paramsAppliedRef.current) return;

    if (tabParam === 'Despesas') {
      setActiveTab('Despesas');
      paramsAppliedRef.current = true;
    } else if (tabParam === 'Recebimentos') {
      setActiveTab('Recebimentos');
      paramsAppliedRef.current = true;
    } else if (tabParam === 'Fechamento') {
      setActiveTab('Fechamento');
      paramsAppliedRef.current = true;
    }

    if (monthParam && yearParam) {
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      if (!isNaN(month) && !isNaN(year)) {
        setExpenseFilters({ month, year });
        paramsAppliedRef.current = true;
      }
    }
  }, [params.tab, params.month, params.year]);

  const allReceiptsForCenter = useMemo(
    () => getReceiptsByCenter(selectedCenter),
    [getReceiptsByCenter, selectedCenter]
  );

  const allExpensesForCenter = useMemo(
    () => getExpensesByCenter(selectedCenter),
    [getExpensesByCenter, selectedCenter]
  );

  // Para calcular parcelas, precisamos de todos os recebimentos/despesas, não apenas do centro
  const allReceipts = getAllReceipts();
  const allExpenses = getAllExpenses();

  const buildClosureReportData = useCallback((): ReportData => {
    const selectedMonth = selectedPeriod.month();
    const selectedYear = selectedPeriod.year();

    // ✅ CORREÇÃO: Usa closureExpenses e closureReceipts (dados completos do período)
    // ao invés de allExpenses/allReceipts (dados paginados que podem estar incompletos)
    // closureExpenses/closureReceipts já vêm filtrados por período do getExpensesForDateRange
    const expensesInPeriod = closureExpenses.filter(
      expense => expense.center === selectedCenter,
    );
    const receiptsInPeriod = closureReceipts.filter(
      receipt => receipt.center === selectedCenter,
    );

    return {
      expenses: expensesInPeriod,
      receipts: receiptsInPeriod,
      period: {
        month: closureMode === 'mensal' ? selectedMonth : undefined,
        year: selectedYear,
      },
      center: selectedCenter,
    };
  }, [closureExpenses, closureReceipts, closureMode, selectedPeriod, selectedCenter]);

  const handleOpenClosureReportPreview = useCallback(
    (type: 'pdf' | 'excel') => {
      const data = buildClosureReportData();
      const html = buildReportHTML(data);
      setReportPreview({ type, html, data });
    },
    [buildClosureReportData],
  );

  const handleDownloadClosureReport = useCallback(async () => {
    if (!reportPreview) return;

    const hasData =
      (reportPreview.data.expenses && reportPreview.data.expenses.length > 0) ||
      (reportPreview.data.receipts && reportPreview.data.receipts.length > 0);

    if (!hasData) {
      showError('Sem dados', 'Não há dados para gerar o relatório neste período');
      return;
    }

    setIsExportingClosure(true);
    try {
      if (reportPreview.type === 'pdf') {
        const fileUri = await exportToPDF(reportPreview.data);
        showSuccess('Relatório exportado', 'O relatório PDF foi gerado com sucesso');
        const fileName = `Relatorio_${reportPreview.data.period.year}_${reportPreview.data.period.month !== undefined ? dayjs().month(reportPreview.data.period.month).format('MMMM') : 'Anual'}.pdf`;
        await shareFile(fileUri, fileName);
      } else {
        await exportToExcel(reportPreview.data);
        showSuccess('Relatório exportado', 'O relatório Excel foi gerado com sucesso');
      }
    } catch (error: any) {
      showError('Erro ao exportar', error.message || 'Tente novamente');
    } finally {
      setIsExportingClosure(false);
    }
  }, [reportPreview]);

  const handleShareClosureReport = useCallback(async () => {
    if (!reportPreview) return;

    const hasData =
      (reportPreview.data.expenses && reportPreview.data.expenses.length > 0) ||
      (reportPreview.data.receipts && reportPreview.data.receipts.length > 0);

    if (!hasData) {
      showError('Sem dados', 'Não há dados para gerar o relatório neste período');
      return;
    }

    setIsExportingClosure(true);
    try {
      if (reportPreview.type === 'pdf') {
        const fileUri = await exportToPDF(reportPreview.data);
        const fileName = `Relatorio_${reportPreview.data.period.year}_${reportPreview.data.period.month !== undefined ? dayjs().month(reportPreview.data.period.month).format('MMMM') : 'Anual'}.pdf`;
        await shareFile(fileUri, fileName);
      } else {
        await exportToExcel(reportPreview.data);
        showSuccess('Relatório compartilhado', 'O relatório Excel foi gerado');
      }
    } catch (error: any) {
      showError('Erro ao compartilhar', error.message || 'Tente novamente');
    } finally {
      setIsExportingClosure(false);
    }
  }, [reportPreview]);

  const filteredExpenses = useMemo(() => {
    // chartExpenses is already filtered by period (month/year) and center
    let filtered = [...chartExpenses];

    // Filtrar por categoria
    if (expenseFilters.category) {
      filtered = filtered.filter((expense) => expense.category === expenseFilters.category);
    }

    // Filtrar por equipamento
    if (expenseFilters.equipmentId) {
      filtered = filtered.filter((expense) => expense.equipmentId === expenseFilters.equipmentId);
    }

    // Filtrar por valor
    if (expenseFilters.value !== null && expenseFilters.value !== undefined) {
      filtered = filtered.filter((expense) => expense.value === expenseFilters.value);
    }

    // Filtrar por nome
    if (expenseFilters.name && expenseFilters.name.trim()) {
      const searchName = expenseFilters.name.trim().toLowerCase();
      filtered = filtered.filter((expense) =>
        expense.name.toLowerCase().includes(searchName)
      );
    }

    // Filtrar por setor
    if (expenseFilters.sector) {
      filtered = filtered.filter((expense) => expense.sector === expenseFilters.sector);
    }

    return filtered;
  }, [chartExpenses, expenseFilters]);

  const sortedExpenses = useMemo(() => {
    const expenses = [...filteredExpenses];

    const compareDates = (a: Expense, b: Expense) => {
      const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
      const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
      if (!dateA.isValid() || !dateB.isValid()) return 0;
      return dateA.valueOf() - dateB.valueOf();
    };

    switch (expenseSortOption) {
      case 'date_asc':
        expenses.sort((a, b) => compareDates(a, b));
        break;
      case 'value_desc':
        expenses.sort((a, b) => b.value - a.value || compareDates(b, a));
        break;
      case 'value_asc':
        expenses.sort((a, b) => a.value - b.value || compareDates(b, a));
        break;
      case 'name_asc':
        expenses.sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name, 'pt-BR');
          if (nameCompare !== 0) return nameCompare;
          return compareDates(b, a);
        });
        break;
      case 'category_asc':
        expenses.sort((a, b) => {
          const labelA = CATEGORY_LABELS[a.category] || a.category;
          const labelB = CATEGORY_LABELS[b.category] || b.category;
          const catCompare = labelA.localeCompare(labelB, 'pt-BR');
          if (catCompare !== 0) return catCompare;
          return compareDates(b, a);
        });
        break;
      case 'sector_asc':
        expenses.sort((a, b) => {
          const labelA = a.sector ? (SECTOR_LABELS[a.sector] || a.sector) : '';
          const labelB = b.sector ? (SECTOR_LABELS[b.sector] || b.sector) : '';
          const secCompare = labelA.localeCompare(labelB, 'pt-BR');
          if (secCompare !== 0) return secCompare;
          return compareDates(b, a);
        });
        break;
      case 'date_desc':
      default:
        expenses.sort((a, b) => compareDates(b, a));
        break;
    }

    return expenses;
  }, [filteredExpenses, expenseSortOption]);

  useEffect(() => {
    setExpensePage(1);
  }, [
    selectedCenter,
    expenseFilters.category,
    expenseFilters.equipmentId,
    expenseFilters.value,
    expenseFilters.month,
    expenseFilters.year,
  ]);

  const paginatedExpenses = useMemo(
    () => sortedExpenses.slice(0, expensePage * EXPENSES_PAGE_SIZE),
    [sortedExpenses, expensePage],
  );

  const hasMoreExpenses = paginatedExpenses.length < filteredExpenses.length;

  const handleLoadMoreExpenses = () => {
    if (hasMoreExpenses) {
      setExpensePage(prev => prev + 1);
    }
  };

  const hasActiveExpenseFilters = useMemo(() => {
    return !!(
      expenseFilters.category ||
      expenseFilters.equipmentId ||
      (expenseFilters.value !== null && expenseFilters.value !== undefined) ||
      (expenseFilters.month !== null &&
        expenseFilters.month !== undefined &&
        expenseFilters.year) ||
      (expenseFilters.name && expenseFilters.name.trim()) ||
      expenseFilters.sector
    );
  }, [expenseFilters]);

  // Calcular despesas por status para a aba Despesas (using full period data)
  const expensesByStatusForDespesas = useMemo(() => {
    const expensesByStatus = {
      confirmar: chartExpenses.filter((e) => e.status === 'confirmar' || !e.status),
      confirmado: chartExpenses.filter((e) => e.status === 'confirmado'),
      a_pagar: chartExpenses.filter((e) => e.status === 'a_pagar'),
      pago: chartExpenses.filter((e) => e.status === 'pago'),
    };

    const totalsByStatus = {
      confirmar: expensesByStatus.confirmar.reduce((sum, e) => sum + e.value, 0),
      confirmado: expensesByStatus.confirmado.reduce((sum, e) => sum + e.value, 0),
      a_pagar: expensesByStatus.a_pagar.reduce((sum, e) => sum + e.value, 0),
      pago: expensesByStatus.pago.reduce((sum, e) => sum + e.value, 0),
    };

    return {
      expensesByStatus,
      totalsByStatus,
    };
  }, [chartExpenses]);

  const periodSummary = useMemo(() => {
    const selectedMonth = selectedPeriod.month();
    const selectedYear = selectedPeriod.year();

    const receiptsInPeriod = activeTab === 'Fechamento'
      ? closureReceipts.filter(r => r.center === selectedCenter) // Filtra por centro para o resumo
      : allReceipts.filter((receipt) => {
        const [day, month, year] = receipt.date.split('/').map(Number);
        if (!day || !month || !year) {
          const receiptDate = dayjs(receipt.date, 'DD/MM/YYYY', true);
          if (!receiptDate.isValid()) return false;
          if (closureMode === 'anual') {
            return receiptDate.year() === selectedYear;
          }
          return receiptDate.month() === selectedMonth && receiptDate.year() === selectedYear;
        }
        if (closureMode === 'anual') {
          return year === selectedYear;
        }
        return month - 1 === selectedMonth && year === selectedYear;
      });

    const expensesInPeriod = activeTab === 'Fechamento'
      ? closureExpenses.filter(e => e.center === selectedCenter) // Filtra por centro para o resumo
      : allExpenses.filter((expense) => {
        const [day, month, year] = expense.date.split('/').map(Number);
        if (!day || !month || !year) {
          const expenseDate = dayjs(expense.date, 'DD/MM/YYYY', true);
          if (!expenseDate.isValid()) return false;
          if (closureMode === 'anual') {
            return expenseDate.year() === selectedYear;
          }
          return expenseDate.month() === selectedMonth && expenseDate.year() === selectedYear;
        }
        if (closureMode === 'anual') {
          return year === selectedYear;
        }
        return month - 1 === selectedMonth && year === selectedYear;
      });

    const totalReceipts = receiptsInPeriod.reduce((sum, receipt) => sum + receipt.value, 0);
    const totalExpenses = expensesInPeriod.reduce((sum, expense) => sum + expense.value, 0);
    const balance = totalReceipts - totalExpenses;

    // Agrupa despesas por status
    const expensesByStatus = {
      confirmar: expensesInPeriod.filter((e) => e.status === 'confirmar' || !e.status),
      confirmado: expensesInPeriod.filter((e) => e.status === 'confirmado'),
      a_pagar: expensesInPeriod.filter((e) => e.status === 'a_pagar'),
      pago: expensesInPeriod.filter((e) => e.status === 'pago'),
    };

    const totalsByStatus = {
      confirmar: expensesByStatus.confirmar.reduce((sum, e) => sum + e.value, 0),
      confirmado: expensesByStatus.confirmado.reduce((sum, e) => sum + e.value, 0),
      a_pagar: expensesByStatus.a_pagar.reduce((sum, e) => sum + e.value, 0),
      pago: expensesByStatus.pago.reduce((sum, e) => sum + e.value, 0),
    };

    return {
      period: closureMode === 'anual'
        ? selectedPeriod.format('YYYY')
        : selectedPeriod.format('MMMM [de] YYYY'),
      received: formatCurrency(totalReceipts),
      expenses: formatCurrency(totalExpenses),
      balance: formatCurrency(balance),
      balanceValue: balance, // Valor numérico para verificar se é positivo ou negativo
      receiptsCount: receiptsInPeriod.length,
      expensesCount: expensesInPeriod.length,
      expensesByStatus,
      totalsByStatus,
    };
  }, [allReceipts, allExpenses, selectedPeriod, closureMode, activeTab, closureExpenses, closureReceipts, selectedCenter]);

  const filteredReceipts = useMemo(() => {
    let filtered = [...allReceiptsForCenter];

    // Filtrar por período (Mensal/Anual)
    const selectedMonth = selectedReceiptPeriod.month();
    const selectedYear = selectedReceiptPeriod.year();

    const filterByPeriod = (dateString: string) => {
      const [day, month, year] = dateString.split('/').map(Number);
      if (!day || !month || !year) {
        const receiptDate = dayjs(dateString, 'DD/MM/YYYY', true);
        if (!receiptDate.isValid()) {
          return false;
        }
        if (receiptMode === 'anual') {
          return receiptDate.year() === selectedYear;
        }
        return receiptDate.month() === selectedMonth && receiptDate.year() === selectedYear;
      }
      if (receiptMode === 'anual') {
        return year === selectedYear;
      }
      return month - 1 === selectedMonth && year === selectedYear;
    };

    filtered = filtered.filter((receipt) => {
      if (!filterByPeriod(receipt.date)) {
        return false;
      }
      return true;
    });

    // Filtrar por nome
    if (receiptFilters.name) {
      const searchTerm = receiptFilters.name.toLowerCase();
      filtered = filtered.filter((receipt) =>
        receipt.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por valor
    if (receiptFilters.value !== null && receiptFilters.value !== undefined) {
      filtered = filtered.filter((receipt) =>
        receipt.value === receiptFilters.value
      );
    }

    // Filtrar por status
    if (receiptFilters.status) {
      filtered = filtered.filter((receipt) =>
        receipt.status === receiptFilters.status
      );
    }

    // Filtrar por período do filtro (se especificado, sobrescreve o período padrão)
    if (receiptFilters.month !== null && receiptFilters.month !== undefined && receiptFilters.year) {
      filtered = filtered.filter((receipt) => {
        // Parse da data no formato DD/MM/YYYY
        const [day, month, year] = receipt.date.split('/').map(Number);
        if (!day || !month || !year) {
          // Fallback para dayjs se o split não funcionar
          const receiptDate = dayjs(receipt.date, 'DD/MM/YYYY', true);
          if (!receiptDate.isValid()) {
            return false;
          }
          return receiptDate.month() === receiptFilters.month && receiptDate.year() === receiptFilters.year;
        }
        // month vem como 1-12 do formato brasileiro, convertemos para 0-11
        const receiptMonth = month - 1;
        return receiptMonth === receiptFilters.month && year === receiptFilters.year;
      });
    }

    return filtered.sort(
      (a, b) => {
        const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
        const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
        if (!dateA.isValid() || !dateB.isValid()) return 0;
        return dateB.valueOf() - dateA.valueOf();
      }
    );
  }, [allReceipts, receiptFilters, receiptMode, selectedReceiptPeriod]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      receiptFilters.name ||
      (receiptFilters.value !== null && receiptFilters.value !== undefined) ||
      receiptFilters.status ||
      (receiptFilters.month !== null &&
        receiptFilters.month !== undefined &&
        receiptFilters.year)
    );
  }, [receiptFilters]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Recebimentos':
        return (
          <SwipeableContainer
            onSwipeLeft={handleReceiptSwipeLeft}
            onSwipeRight={handleReceiptSwipeRight}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recebimentos</Text>
              <View style={styles.headerActions}>
                {canEdit && (
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => {
                      setEditingReceipt(null);
                      setReceiptModalVisible(true);
                    }}
                  >
                    <Plus size={18} color="#0A84FF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                  onPress={() => setReceiptFilterVisible(true)}
                >
                  <Filter size={16} color={hasActiveFilters ? "#FFFFFF" : "#0A84FF"} />
                </TouchableOpacity>
              </View>
            </View>
            {hasActiveFilters && (
              <Text style={styles.filterInfo}>
                {filteredReceipts.length} recebimento(s) encontrado(s)
              </Text>
            )}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  receiptMode === 'mensal' && styles.modeButtonActive,
                ]}
                onPress={() => setReceiptMode('mensal')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    receiptMode === 'mensal' && styles.modeButtonTextActive,
                  ]}
                >
                  Mensal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  receiptMode === 'anual' && styles.modeButtonActive,
                ]}
                onPress={() => setReceiptMode('anual')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    receiptMode === 'anual' && styles.modeButtonTextActive,
                  ]}
                >
                  Anual
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodNavigatorContainer}>
              {receiptMode === 'mensal' ? (
                <>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Mês</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedReceiptPeriod((prev) => prev.subtract(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedReceiptPeriod.format('MMMM')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedReceiptPeriod((prev) => prev.add(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Ano</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedReceiptPeriod((prev) => prev.subtract(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedReceiptPeriod.format('YYYY')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedReceiptPeriod((prev) => prev.add(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.periodNavigatorRow}>
                  <Text style={styles.periodNavigatorLabel}>Ano</Text>
                  <View style={styles.periodNavigator}>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedReceiptPeriod((prev) => prev.subtract(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.periodNavValue}>
                      {selectedReceiptPeriod.format('YYYY')}
                    </Text>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedReceiptPeriod((prev) => prev.add(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            {filteredReceipts.length > 0 ? (
              filteredReceipts.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>
                      <ArrowDownCircle size={18} color="#34C759" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{formatCurrency(item.value)}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardDate}>{item.date}</Text>
                      {(() => {
                        const fixedInfo = getReceiptFixedInfo(item, allReceipts);
                        if (fixedInfo.isFixed) {
                          return (
                            <View style={styles.fixedBadge}>
                              <Text style={styles.fixedText}>
                                Recebimento fixo {fixedInfo.installment ? `- ${fixedInfo.installment}` : ''}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                    <View style={styles.cardActions}>
                      {canEdit && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            setEditingReceipt(item);
                            setReceiptModalVisible(true);
                          }}
                        >
                          <Edit3 size={16} color="#0A84FF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {(item.status || canDelete) && (
                    <View style={styles.statusRow}>
                      {item.status && (
                        <TouchableOpacity
                          style={[
                            styles.statusPill,
                            item.status === 'a_confirmar' && styles.statusPillAConfirmar,
                            item.status === 'confirmado' && styles.statusPillConfirmado,
                            item.status === 'a_receber' && styles.statusPillAReceber,
                            item.status === 'recebido' && styles.statusPillRecebido,
                          ]}
                          onPress={() => {
                            if (!canEdit) return;
                            setSelectedReceiptForStatus(item);
                            setReceiptStatusModalVisible(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              item.status === 'a_confirmar' && styles.statusTextAConfirmar,
                              item.status === 'confirmado' && styles.statusTextConfirmado,
                              item.status === 'a_receber' && styles.statusTextAReceber,
                              item.status === 'recebido' && styles.statusTextRecebido,
                            ]}
                          >
                            {item.status === 'a_confirmar' && 'A Confirmar'}
                            {item.status === 'confirmado' && 'Confirmado'}
                            {item.status === 'a_receber' && 'A Receber'}
                            {item.status === 'recebido' && 'Recebido'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            Alert.alert(
                              'Excluir recebimento',
                              'Tem certeza que deseja excluir este recebimento?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Excluir',
                                  style: 'destructive',
                                  onPress: () => deleteReceipt(item.id),
                                },
                              ]
                            );
                          }}
                        >
                          <Trash2 size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum recebimento encontrado para os filtros aplicados.
                </Text>
              </View>
            )}
          </SwipeableContainer>
        );
      case 'Despesas':
        return (
          <SwipeableContainer
            onSwipeLeft={handleExpenseSwipeLeft}
            onSwipeRight={handleExpenseSwipeRight}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Despesas</Text>
              <View style={styles.headerActions}>
                {canEdit && (
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => {
                      setEditingExpense(null);
                      setExpenseModalVisible(true);
                    }}
                  >
                    <Plus size={18} color="#0A84FF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.filterButton, hasActiveExpenseFilters && styles.filterButtonActive]}
                  onPress={() => setExpenseFilterVisible(true)}
                >
                  <Filter size={16} color={hasActiveExpenseFilters ? "#FFFFFF" : "#0A84FF"} />
                </TouchableOpacity>
              </View>
            </View>
            {hasActiveExpenseFilters && (
              <Text style={styles.filterInfo}>
                {filteredExpenses.length} despesa(s) encontrada(s)
              </Text>
            )}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  expenseMode === 'mensal' && styles.modeButtonActive,
                ]}
                onPress={() => setExpenseMode('mensal')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    expenseMode === 'mensal' && styles.modeButtonTextActive,
                  ]}
                >
                  Mensal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  expenseMode === 'anual' && styles.modeButtonActive,
                ]}
                onPress={() => setExpenseMode('anual')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    expenseMode === 'anual' && styles.modeButtonTextActive,
                  ]}
                >
                  Anual
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodNavigatorContainer}>
              {expenseMode === 'mensal' ? (
                <>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Mês</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedExpensePeriod((prev) => prev.subtract(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedExpensePeriod.format('MMMM')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedExpensePeriod((prev) => prev.add(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Ano</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedExpensePeriod((prev) => prev.subtract(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedExpensePeriod.format('YYYY')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedExpensePeriod((prev) => prev.add(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.periodNavigatorRow}>
                  <Text style={styles.periodNavigatorLabel}>Ano</Text>
                  <View style={styles.periodNavigator}>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedExpensePeriod((prev) => prev.subtract(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.periodNavValue}>
                      {selectedExpensePeriod.format('YYYY')}
                    </Text>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedExpensePeriod((prev) => prev.add(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            {/* Gráficos de Despesas */}
            {chartExpensesLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#8E8E93', fontSize: 14 }}>Carregando dados...</Text>
              </View>
            ) : (
              <>
                <ExpensePieChart
                  expenses={chartExpenses}
                  mode={expenseMode}
                  selectedPeriod={selectedExpensePeriod}
                />
                <ExpenseBarChart expenses={chartExpenses} />
                <ExpenseSectorChart
                  expenses={chartExpenses}
                  mode={expenseMode}
                  selectedPeriod={selectedExpensePeriod}
                />
              </>
            )}

            {/* Despesas agrupadas por status */}
            {filteredExpenses.length > 0 && (
              <View style={styles.expensesByStatusContainer}>
                <Text style={styles.expensesByStatusTitle}>Despesas por Status</Text>

                {/* A Confirmar */}
                {expensesByStatusForDespesas.totalsByStatus.confirmar > 0 && (
                  <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.confirmar.backgroundColor }]}>
                    <View style={styles.statusExpenseHeader}>
                      <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.confirmar.color }]}>
                        {STATUS_LABELS.confirmar}
                      </Text>
                      <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.confirmar.color }]}>
                        {formatCurrency(expensesByStatusForDespesas.totalsByStatus.confirmar)}
                      </Text>
                    </View>
                    <Text style={styles.statusExpenseCount}>
                      {expensesByStatusForDespesas.expensesByStatus.confirmar.length} {expensesByStatusForDespesas.expensesByStatus.confirmar.length === 1 ? 'despesa' : 'despesas'}
                    </Text>
                  </View>
                )}

                {/* Confirmado */}
                {expensesByStatusForDespesas.totalsByStatus.confirmado > 0 && (
                  <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.confirmado.backgroundColor }]}>
                    <View style={styles.statusExpenseHeader}>
                      <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.confirmado.color }]}>
                        {STATUS_LABELS.confirmado}
                      </Text>
                      <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.confirmado.color }]}>
                        {formatCurrency(expensesByStatusForDespesas.totalsByStatus.confirmado)}
                      </Text>
                    </View>
                    <Text style={styles.statusExpenseCount}>
                      {expensesByStatusForDespesas.expensesByStatus.confirmado.length} {expensesByStatusForDespesas.expensesByStatus.confirmado.length === 1 ? 'despesa' : 'despesas'}
                    </Text>
                  </View>
                )}

                {/* A Pagar */}
                {expensesByStatusForDespesas.totalsByStatus.a_pagar > 0 && (
                  <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.a_pagar.backgroundColor }]}>
                    <View style={styles.statusExpenseHeader}>
                      <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.a_pagar.color }]}>
                        {STATUS_LABELS.a_pagar}
                      </Text>
                      <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.a_pagar.color }]}>
                        {formatCurrency(expensesByStatusForDespesas.totalsByStatus.a_pagar)}
                      </Text>
                    </View>
                    <Text style={styles.statusExpenseCount}>
                      {expensesByStatusForDespesas.expensesByStatus.a_pagar.length} {expensesByStatusForDespesas.expensesByStatus.a_pagar.length === 1 ? 'despesa' : 'despesas'}
                    </Text>
                  </View>
                )}

                {/* Pago */}
                {expensesByStatusForDespesas.totalsByStatus.pago > 0 && (
                  <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.pago.backgroundColor }]}>
                    <View style={styles.statusExpenseHeader}>
                      <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.pago.color }]}>
                        {STATUS_LABELS.pago}
                      </Text>
                      <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.pago.color }]}>
                        {formatCurrency(expensesByStatusForDespesas.totalsByStatus.pago)}
                      </Text>
                    </View>
                    <Text style={styles.statusExpenseCount}>
                      {expensesByStatusForDespesas.expensesByStatus.pago.length} {expensesByStatusForDespesas.expensesByStatus.pago.length === 1 ? 'despesa' : 'despesas'}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {filteredExpenses.length > 0 && (
              <View style={styles.sortHeaderContainer}>
                <View style={styles.sortHeaderRow}>
                  <TouchableOpacity
                    style={styles.sortButtonCompact}
                    onPress={() => setIsExpenseSortDropdownOpen(prev => !prev)}
                  >
                    <ChevronDown size={18} color="#0A84FF" />
                  </TouchableOpacity>
                </View>

                {isExpenseSortDropdownOpen && (
                  <View style={styles.sortDropdown}>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('date_desc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Data (mais recente primeiro)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('date_asc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Data (mais antiga primeiro)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('value_desc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Valor (maior para menor)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('value_asc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Valor (menor para maior)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('name_asc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Nome (A-Z)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('category_asc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Categoria (A-Z)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sortDropdownItem}
                      onPress={() => {
                        setExpenseSortOption('sector_asc');
                        setIsExpenseSortDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.sortDropdownItemText}>Setor (A-Z)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {paginatedExpenses.length > 0 ? (
              <>
                {paginatedExpenses.map((item) => (
                  <View
                    key={item.id}
                    style={styles.card}
                  >
                    <TouchableOpacity
                      style={styles.cardRow}
                      onPress={() => {
                        const sharedDocs = getSharedExpenseDocuments(item, allExpenses);
                        setSelectedExpenseForDocument(item);
                        setSelectedExpenseDocuments(sharedDocs);
                        setExpenseDocumentsModalVisible(true);
                      }}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: '#FDECEC' }]}>
                        <ArrowUpCircle size={18} color="#FF3B30" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{formatCurrency(item.value)}</Text>
                        <Text style={styles.cardSubtitle}>
                          {item.name}
                        </Text>
                        <View style={styles.cardMeta}>
                          <Text style={styles.cardDate}>{item.date}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryText}>
                                {CATEGORY_LABELS[item.category]}
                              </Text>
                            </View>
                            {item.sector && (
                              <View style={styles.sectorBadge}>
                                <Text style={styles.sectorText}>
                                  {SECTOR_LABELS[item.sector] || item.sector}
                                </Text>
                              </View>
                            )}
                            {(() => {
                              const instInfo = getExpenseInstallmentInfo(item, allExpenses);
                              if (!instInfo.isInstallment || !instInfo.label) return null;
                              return (
                                <View style={styles.sectorBadge}>
                                  <Text style={styles.sectorText}>Parcela {instInfo.label}</Text>
                                </View>
                              );
                            })()}
                            {item.method && (
                              <View style={styles.sectorBadge}>
                                <Text style={styles.sectorText}>
                                  {item.method === 'BOLETO'
                                    ? 'Boleto'
                                    : item.method === 'TRANSFERENCIA'
                                      ? 'Transferência'
                                      : item.method}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {item.debitAdjustment && (
                          <View style={styles.debitBadge}>
                            <Text style={styles.debitText}>
                              Abatimento: -{formatCurrency(item.debitAdjustment.amount)}
                              {item.debitAdjustment.description ? ` • ${item.debitAdjustment.description}` : ''}
                            </Text>
                          </View>
                        )}
                        {(() => {
                          const fixedInfo = getExpenseFixedInfo(item, allExpenses);
                          if (fixedInfo.isFixed) {
                            return (
                              <View style={styles.fixedBadge}>
                                <Text style={styles.fixedText}>
                                  Despesa fixa {fixedInfo.installment ? `- ${fixedInfo.installment}` : ''}
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                      <View style={styles.cardActions}>
                        {canEdit && (
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              setEditingExpense(item);
                              setExpenseModalVisible(true);
                            }}
                          >
                            <Edit3 size={16} color="#0A84FF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Status da despesa + lixeira alinhados na mesma linha */}
                    {(item.status || canDelete) && (
                      <View style={styles.statusRow}>
                        <TouchableOpacity
                          style={[
                            styles.statusPill,
                            item.status && STATUS_STYLES[item.status]
                              ? { backgroundColor: STATUS_STYLES[item.status].backgroundColor }
                              : { backgroundColor: '#FFF3D6' },
                          ]}
                          onPress={() => {
                            if (!isAdmin) return;
                            setStatusModalExpense(item);
                          }}
                          activeOpacity={isAdmin ? 0.7 : 1}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              item.status && STATUS_STYLES[item.status]
                                ? { color: STATUS_STYLES[item.status].color }
                                : { color: '#FF9500' },
                            ]}
                          >
                            {item.status ? STATUS_LABELS[item.status] : 'A Confirmar'}
                          </Text>
                          <ChevronDown
                            size={14}
                            color={
                              item.status && STATUS_STYLES[item.status]
                                ? STATUS_STYLES[item.status].color
                                : '#FF9500'
                            }
                          />
                        </TouchableOpacity>

                        {canDelete && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert(
                                'Excluir despesa',
                                'Tem certeza que deseja excluir esta despesa?',
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Excluir',
                                    style: 'destructive',
                                    onPress: () => handleDeleteExpense(item.id),
                                  },
                                ]
                              );
                            }}
                          >
                            <Trash2 size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {getSharedExpenseDocuments(item, allExpenses).length > 0 && (
                      <TouchableOpacity
                        style={styles.documentsIndicator}
                        onPress={() => {
                          const sharedDocs = getSharedExpenseDocuments(item, allExpenses);
                          setSelectedExpenseForDocument(item);
                          setSelectedExpenseDocuments(sharedDocs);
                          setExpenseDocumentsModalVisible(true);
                        }}
                      >
                        <FileText size={14} color="#0A84FF" />
                        <Text style={styles.documentsIndicatorText}>
                          {getSharedExpenseDocuments(item, allExpenses).length} documento(s) anexado(s)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {hasMoreExpenses && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={handleLoadMoreExpenses}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.loadMoreText}>Carregar mais</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhuma despesa encontrada para os filtros aplicados.
                </Text>
              </View>
            )}
          </SwipeableContainer>
        );
      case 'Fechamento':
        return (
          <SwipeableContainer
            onSwipeLeft={handleClosureSwipeLeft}
            onSwipeRight={handleClosureSwipeRight}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fechamento de Contas</Text>
            </View>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  closureMode === 'mensal' && styles.modeButtonActive,
                ]}
                onPress={() => setClosureMode('mensal')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    closureMode === 'mensal' && styles.modeButtonTextActive,
                  ]}
                >
                  Mensal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  closureMode === 'anual' && styles.modeButtonActive,
                ]}
                onPress={() => setClosureMode('anual')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    closureMode === 'anual' && styles.modeButtonTextActive,
                  ]}
                >
                  Anual
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodNavigatorContainer}>
              {closureMode === 'mensal' ? (
                <>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Mês</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedPeriod.format('MMMM')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.add(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Ano</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.add(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <View style={[styles.periodNavigatorRow, { flex: 1 }]}>
                  <Text style={styles.periodNavigatorLabel}>Ano</Text>
                  <View style={styles.periodNavigator}>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedPeriod((prev) => prev.add(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.periodInfo}>
              <Text style={styles.periodInfoText}>
                Período: {periodSummary.period}
              </Text>
              <Text style={styles.periodInfoSubtext}>
                {closureLoading ? 'Carregando...' : `${periodSummary.receiptsCount} recebimento(s) • ${periodSummary.expensesCount} despesa(s)`}
              </Text>
            </View>
            {closureLoading ? (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { opacity: 0.6 }]}>
                  <Text style={styles.summaryLabel}>Recebimentos</Text>
                  <Text style={[styles.summaryValue, { color: '#C7C7CC' }]}>--</Text>
                  <Text style={styles.summaryCount}>carregando...</Text>
                </View>
                <View style={[styles.summaryCard, { opacity: 0.6 }]}>
                  <Text style={styles.summaryLabel}>Despesas Total</Text>
                  <Text style={[styles.summaryValue, { color: '#C7C7CC' }]}>--</Text>
                  <Text style={styles.summaryCount}>carregando...</Text>
                </View>
                <View style={[styles.summaryCard, styles.balanceCardPositive, { opacity: 0.6 }]}>
                  <Calculator size={20} color="#FFFFFF" />
                  <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>--</Text>
                  <Text style={[styles.summaryLabel, { color: '#E5E5EA' }]}>Saldo do período</Text>
                </View>
              </View>
            ) : (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Recebimentos</Text>
                  <Text style={styles.summaryValue}>{periodSummary.received}</Text>
                  <Text style={styles.summaryCount}>
                    {periodSummary.receiptsCount} {periodSummary.receiptsCount === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Despesas Total</Text>
                  <Text style={styles.summaryValue}>{periodSummary.expenses}</Text>
                  <Text style={styles.summaryCount}>
                    {periodSummary.expensesCount} {periodSummary.expensesCount === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryCard,
                    periodSummary.balanceValue >= 0
                      ? styles.balanceCardPositive
                      : styles.balanceCardNegative,
                  ]}
                >
                  <Calculator size={20} color="#FFFFFF" />
                  <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>
                    {periodSummary.balance}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: '#E5E5EA' }]}>
                    Saldo do período
                  </Text>
                </View>
              </View>
            )}

            {/* Gráfico Comparativo entre Centros */}
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonTitle}>Comparativo entre Centros</Text>

              {/* Botões de modo */}
              <View style={styles.comparisonModeSelector}>
                <TouchableOpacity
                  style={[styles.comparisonModeButton, comparisonMode === 'expenses' && styles.comparisonModeButtonActive]}
                  onPress={() => setComparisonMode('expenses')}
                >
                  <Text style={[styles.comparisonModeText, comparisonMode === 'expenses' && styles.comparisonModeTextActive]}>
                    Despesas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.comparisonModeButton, comparisonMode === 'receipts' && styles.comparisonModeButtonActive]}
                  onPress={() => setComparisonMode('receipts')}
                >
                  <Text style={[styles.comparisonModeText, comparisonMode === 'receipts' && styles.comparisonModeTextActive]}>
                    Recebimentos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.comparisonModeButton, comparisonMode === 'balance' && styles.comparisonModeButtonActive]}
                  onPress={() => setComparisonMode('balance')}
                >
                  <Text style={[styles.comparisonModeText, comparisonMode === 'balance' && styles.comparisonModeTextActive]}>
                    Saldo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Gráfico */}
              <CostCenterComparisonChart
                expenses={closureExpenses} // Passa TODAS as despesas (não filtradas por centro)
                receipts={closureReceipts} // Passa TODOS os recebimentos (não filtrados por centro)
                mode={comparisonMode}
                period={{
                  month: closureMode === 'mensal' ? selectedPeriod.month() : undefined,
                  year: selectedPeriod.year(),
                }}
              />
            </View>

            {/* Botão de Exportação (apenas PDF) */}
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={[styles.exportButton, styles.exportButtonPDF]}
                onPress={() => handleOpenClosureReportPreview('pdf')}
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.exportButtonText}>Gerar Relatório PDF</Text>
              </TouchableOpacity>
            </View>
          </SwipeableContainer>
        );
      default:
        return null;
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
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y;

            if (activeTab === 'Despesas') {
              // Ativa/desativa o mini-navegador inferior conforme o scroll
              setIsExpenseBottomNavActive(y > 400);
            } else {
              setIsExpenseBottomNavActive(false);
            }
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Image
                source={require('../../icons/nowtranding_icon_1024.png')}
                style={styles.headerLogo}
              />
              <Text style={styles.title}>Financeiro</Text>
            </View>
            <Text style={styles.subtitle}>
              Controle financeiro do centro {costCenters.find(cc => cc.code === selectedCenter)?.name || centerLabels[selectedCenter as keyof typeof centerLabels] || selectedCenter}
            </Text>
          </View>

          <View style={styles.tabContainer}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {renderContent()}
        </ScrollView>
      </View>
      <ReceiptFormModal
        visible={isReceiptModalVisible}
        onClose={() => {
          setReceiptModalVisible(false);
          setEditingReceipt(null);
        }}
        onSubmit={(data) => {
          if (editingReceipt) {
            // Se for fixo, busca o template para atualizar todas as parcelas
            let templateReceipt = editingReceipt;
            if (editingReceipt.isFixed) {
              const allReceipts = getAllReceipts();
              const template = allReceipts.find(
                (r) => r.isFixed && r.name === editingReceipt.name && r.center === editingReceipt.center
              );
              if (template) {
                templateReceipt = template;
              }
            }

            // Atualiza usando o template (que atualizará todas as parcelas)
            updateReceipt({
              ...templateReceipt,
              name: data.name,
              date: templateReceipt.date, // Mantém a data original do template
              value: data.value,
              isFixed: data.isFixed,
              fixedDurationMonths: data.fixedDurationMonths,
            });
          } else {
            addReceipt({
              name: data.name,
              date: data.date,
              value: data.value,
              center: selectedCenter,
              isFixed: data.isFixed,
              fixedDurationMonths: data.fixedDurationMonths,
            });
          }
          setEditingReceipt(null);
        }}
        initialData={
          editingReceipt
            ? (() => {
              // Busca informações de receita fixa
              const fixedInfo = getReceiptFixedInfo(editingReceipt, allReceipts);

              // Se for uma receita fixa (template ou parcela), busca o template
              let isFixed = editingReceipt.isFixed ?? false;
              let fixedDurationMonths = editingReceipt.fixedDurationMonths;

              if (fixedInfo.isFixed && !isFixed) {
                // É uma parcela de receita fixa, busca o template
                const template = allReceipts.find(
                  (r) => r.isFixed && r.name === editingReceipt.name && r.center === editingReceipt.center
                );
                if (template) {
                  isFixed = true;
                  fixedDurationMonths = template.fixedDurationMonths;
                }
              }

              return {
                name: editingReceipt.name,
                date: editingReceipt.date,
                value: editingReceipt.value,
                isFixed,
                fixedDurationMonths,
                id: editingReceipt.id,
              };
            })()
            : undefined
        }
      />
      <ReceiptFilterModal
        visible={isReceiptFilterVisible}
        onClose={() => setReceiptFilterVisible(false)}
        onApply={setReceiptFilters}
        initialFilters={receiptFilters}
      />
      <ExpenseFormModal
        visible={isExpenseModalVisible}
        onClose={() => {
          setExpenseModalVisible(false);
          setEditingExpense(null);
        }}
        onSubmit={(data) => {
          if (editingExpense) {
            // Se for fixa, busca o template para atualizar todas as parcelas
            let templateExpense = editingExpense;
            if (editingExpense.isFixed) {
              const allExpenses = getAllExpenses();
              const template = allExpenses.find(
                (e) => e.isFixed && e.name === editingExpense.name && e.center === editingExpense.center
              );
              if (template) {
                // Usa os dados do template, mas mantém a data e documentos da despesa sendo editada
                templateExpense = {
                  ...template,
                  date: editingExpense.date, // Mantém a data da parcela sendo editada
                  documents: editingExpense.documents || [], // Mantém os documentos da parcela
                  id: editingExpense.id, // Mantém o ID da parcela sendo editada
                };
              }
            }

            // Verifica se a data foi alterada (para despesas não fixas)
            const dateChanged = !editingExpense.isFixed && data.date !== editingExpense.date;

            // Atualiza usando o template (que atualizará todas as parcelas)
            updateExpense({
              ...templateExpense,
              name: data.name,
              category: data.category,
              date: data.date, // Usa a nova data (para fixas, será atualizada nas parcelas também)
              value: data.value,
              documents: data.documents,
              equipmentId: data.equipmentId,
              gestaoSubcategory: data.gestaoSubcategory,
              observations: data.observations,
              isFixed: data.isFixed,
              sector: data.sector,
              fixedDurationMonths: data.fixedDurationMonths,
              debitAdjustment: data.debitAdjustment,
            });

            // Navega para o mês da nova data se foi alterada e está no modo mensal
            if (dateChanged && expenseMode === 'mensal' && data.date) {
              const [day, month, year] = data.date.split('/').map(Number);
              const newDate = dayjs(`${year}-${month}-${day}`);

              if (newDate.isValid()) {
                setSelectedExpensePeriod(newDate.startOf('month'));
              }
            }
          } else {
            if (data.isInstallment && data.installments && data.installments.length > 0) {
              data.installments.forEach((inst) => {
                addExpense({
                  name: data.name,
                  category: data.category,
                  date: inst.date,
                  value: inst.value,
                  center: selectedCenter,
                  documents: data.documents,
                  equipmentId: data.equipmentId,
                  gestaoSubcategory: data.gestaoSubcategory,
                  observations: data.observations,
                  status: 'confirmar',
                  isFixed: false,
                  sector: data.sector,
                  fixedDurationMonths: undefined,
                  debitAdjustment: data.debitAdjustment,
                  method: data.method,
                  installmentNumber: inst.installmentNumber,
                });
              });
            } else {
              addExpense({
                name: data.name,
                category: data.category,
                date: data.date,
                value: data.value,
                center: selectedCenter,
                documents: data.documents,
                equipmentId: data.equipmentId,
                gestaoSubcategory: data.gestaoSubcategory,
                observations: data.observations,
                status: 'confirmar', // Status padrão para novas despesas
                isFixed: data.isFixed,
                sector: data.sector,
                fixedDurationMonths: data.fixedDurationMonths,
                debitAdjustment: data.debitAdjustment,
                method: data.method,
              });
            }
          }
          setEditingExpense(null);
        }}
        initialData={
          editingExpense
            ? (() => {
              const allExpenses = getAllExpenses();

              // Primeiro, trata o caso de despesa fixa (ou parcela de despesa fixa)
              let expenseData = editingExpense;
              const fixedInfo = getExpenseFixedInfo(editingExpense, allExpenses);

              if (fixedInfo.isFixed) {
                // Busca o template para obter isFixed e fixedDurationMonths corretos
                const template = allExpenses.find(
                  (e) => e.isFixed && e.name === editingExpense.name && e.center === editingExpense.center
                );

                if (template) {
                  // Usa os dados do template, mas mantém a data e documentos da despesa sendo editada
                  expenseData = {
                    ...template,
                    date: editingExpense.date,
                    documents: editingExpense.documents || [],
                    id: editingExpense.id,
                  };
                }
              }

              // Depois, verifica se é um grupo parcelado manual (não fixo)
              let isInstallment = false;
              let installments: { installmentNumber: number; value: number; date: string }[] | undefined;
              let installmentsCount: number | undefined;

              const installmentInfo = getExpenseInstallmentInfo(editingExpense, allExpenses);
              if (installmentInfo.isInstallment) {
                const siblings = allExpenses
                  .filter((e) =>
                    e.center === editingExpense.center &&
                    e.name === editingExpense.name &&
                    e.installmentNumber != null &&
                    !e.isFixed
                  )
                  .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));

                if (siblings.length > 0) {
                  isInstallment = true;
                  installments = siblings.map((e) => ({
                    installmentNumber: e.installmentNumber ?? 0,
                    value: e.value,
                    date: e.date,
                  }));
                  installmentsCount = siblings.length;
                }
              }

              return {
                name: expenseData.name,
                category: expenseData.category,
                date: expenseData.date,
                value: expenseData.value,
                documents: expenseData.documents || [],
                equipmentId: expenseData.equipmentId,
                gestaoSubcategory: expenseData.gestaoSubcategory,
                observations: expenseData.observations,
                isFixed: expenseData.isFixed ?? false,
                sector: expenseData.sector,
                fixedDurationMonths: expenseData.fixedDurationMonths,
                id: expenseData.id,
                debitAdjustment: expenseData.debitAdjustment,
                method: expenseData.method,
                isInstallment,
                installments,
                installmentsCount,
              };
            })()
            : undefined
        }
      />
      <ExpenseFilterModal
        key={`expense-filter-${selectedCenter}`}
        visible={isExpenseFilterVisible}
        onClose={() => setExpenseFilterVisible(false)}
        onApply={setExpenseFilters}
        initialFilters={expenseFilters}
        equipments={equipmentsForFilter}
      />
      <ExpenseDocumentsModal
        visible={expenseDocumentsModalVisible}
        onClose={() => {
          setExpenseDocumentsModalVisible(false);
          setSelectedExpenseDocuments([]);
          setSelectedExpenseForDocument(null);
        }}
        documents={selectedExpenseDocuments || []}
        onDocumentPress={(document) => {
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
          if (!selectedExpenseForDocument) return;
          try {
            await deleteExpenseDocument(selectedExpenseForDocument.id, document.fileUri);
            // Atualiza os documentos locais
            setSelectedExpenseDocuments((prev) =>
              prev?.filter((doc) => doc.fileUri !== document.fileUri) || []
            );
            setSelectedExpenseForDocument((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                documents: prev.documents?.filter((doc) => doc.fileUri !== document.fileUri) || [],
              };
            });
            showSuccess('Documento excluído', 'O documento foi removido com sucesso');
          } catch (error: any) {
            showError('Erro ao excluir', error.message || 'Não foi possível excluir o documento');
          }
        }}
        onAddDocument={handleAddExpenseDocument}
        onAddPhoto={handleAddExpensePhoto}
        onAddPaymentReceiptDocument={handleAddPaymentReceiptDocument}
        onAddPaymentReceiptPhoto={handleAddPaymentReceiptPhoto}
        isUploading={isUploadingDocument}
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
      <ReportPreviewModal
        visible={!!reportPreview}
        html={reportPreview?.html}
        onClose={() => setReportPreview(null)}
        onDownload={handleDownloadClosureReport}
        onShare={handleShareClosureReport}
        downloadLabel={reportPreview?.type === 'pdf' ? 'Baixar PDF' : 'Baixar Excel'}
        title="Prévia do Relatório de Fechamento"
        isExporting={isExportingClosure}
      />
      <ExpenseStatusModal
        visible={statusModalExpense !== null}
        onClose={() => setStatusModalExpense(null)}
        expense={statusModalExpense}
        onStatusChange={handleStatusChange}
      />
      <ReceiptStatusModal
        visible={receiptStatusModalVisible}
        onClose={() => {
          setReceiptStatusModalVisible(false);
          setSelectedReceiptForStatus(null);
        }}
        currentStatus={selectedReceiptForStatus?.status}
        onSelect={async (newStatus: ReceiptStatus) => {
          if (selectedReceiptForStatus) {
            try {
              const updated = await updateReceipt({
                ...selectedReceiptForStatus,
                status: newStatus,
              });

              if (updated) {
                setReceiptStatusModalVisible(false);
                setSelectedReceiptForStatus(null);
                showSuccess('Status atualizado com sucesso!');
              } else {
                throw new Error('Receipt não foi atualizado');
              }
            } catch (error: any) {
              console.error('Erro ao atualizar status:', error);
              const errorMessage = error?.message || 'Erro ao atualizar status. Verifique se o script SQL foi executado.';
              showError(errorMessage);
            }
          }
        }}
      />

      {/* Modal de seleção de tipo de documento */}
      <Modal
        visible={documentTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDocumentTypeModalVisible(false);
          setDocumentInputMode(null);
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => {
            setDocumentTypeModalVisible(false);
            setDocumentInputMode(null);
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '85%',
              maxWidth: 400,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 }}>
              Tipo de documento
            </Text>
            <Text style={{ fontSize: 15, color: '#6C6C70', marginBottom: 24 }}>
              Selecione o tipo de documento
            </Text>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#F5F5F7',
                marginBottom: 12,
              }}
              onPress={() => {
                setDocumentTypeModalVisible(false);
                if (documentInputMode === 'file') {
                  handlePickExpenseDocument('nota_fiscal');
                } else if (documentInputMode === 'photo') {
                  Alert.alert(
                    'Origem da foto',
                    'Escolha de onde anexar a foto',
                    [
                      {
                        text: 'Câmera',
                        onPress: () => pickExpensePhotoFromSource('nota_fiscal', 'camera'),
                      },
                      {
                        text: 'Álbum',
                        onPress: () => pickExpensePhotoFromSource('nota_fiscal', 'library'),
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                    ],
                  );
                }
                setDocumentInputMode(null);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E' }}>
                Nota Fiscal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#F5F5F7',
                marginBottom: 12,
              }}
              onPress={() => {
                setDocumentTypeModalVisible(false);
                if (documentInputMode === 'file') {
                  handlePickExpenseDocument('recibo');
                } else if (documentInputMode === 'photo') {
                  Alert.alert(
                    'Origem da foto',
                    'Escolha de onde anexar a foto',
                    [
                      {
                        text: 'Câmera',
                        onPress: () => pickExpensePhotoFromSource('recibo', 'camera'),
                      },
                      {
                        text: 'Álbum',
                        onPress: () => pickExpensePhotoFromSource('recibo', 'library'),
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                    ],
                  );
                }
                setDocumentInputMode(null);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E' }}>
                Recibo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#F5F5F7',
                marginBottom: 12,
              }}
              onPress={() => {
                setDocumentTypeModalVisible(false);
                if (documentInputMode === 'file') {
                  handlePickExpenseDocument('comprovante_pagamento');
                } else if (documentInputMode === 'photo') {
                  Alert.alert(
                    'Origem da foto',
                    'Escolha de onde anexar a foto',
                    [
                      {
                        text: 'Câmera',
                        onPress: () => pickExpensePhotoFromSource('comprovante_pagamento', 'camera'),
                      },
                      {
                        text: 'Álbum',
                        onPress: () => pickExpensePhotoFromSource('comprovante_pagamento', 'library'),
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                    ],
                  );
                }
                setDocumentInputMode(null);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E' }}>
                Comprovante de Pagamento
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: '#F5F5F7',
                marginBottom: 20,
              }}
              onPress={() => {
                setDocumentTypeModalVisible(false);
                if (documentInputMode === 'file') {
                  handlePickExpenseDocument('boleto');
                } else if (documentInputMode === 'photo') {
                  Alert.alert(
                    'Origem da foto',
                    'Escolha de onde anexar a foto',
                    [
                      {
                        text: 'Câmera',
                        onPress: () => pickExpensePhotoFromSource('boleto', 'camera'),
                      },
                      {
                        text: 'Álbum',
                        onPress: () => pickExpensePhotoFromSource('boleto', 'library'),
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                    ],
                  );
                }
                setDocumentInputMode(null);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E' }}>
                Boleto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E5EA',
                alignItems: 'center',
              }}
              onPress={() => {
                setDocumentTypeModalVisible(false);
                setDocumentInputMode(null);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#6C6C70' }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {activeTab === 'Despesas' && (
        <View
          style={[
            styles.expenseBottomNavigator,
            !isExpenseBottomNavActive && { opacity: 0.15 },
          ]}
          pointerEvents={isExpenseBottomNavActive ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.miniNavButton}
            onPress={() =>
              setSelectedExpensePeriod(prev =>
                expenseMode === 'mensal'
                  ? prev.subtract(1, 'month')
                  : prev.subtract(1, 'year')
              )
            }
          >
            <Text style={styles.miniNavText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniNavButton}
            onPress={() =>
              setSelectedExpensePeriod(prev =>
                expenseMode === 'mensal'
                  ? prev.add(1, 'month')
                  : prev.add(1, 'year')
              )
            }
          >
            <Text style={styles.miniNavText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

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
    gap: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
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
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  filterInfo: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: -8,
    marginBottom: 8,
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
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 10,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9FAF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardMeta: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  sectorBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  sectorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C6C70',
  },
  debitBadge: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  debitText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
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
  sortHeaderContainer: {
    marginBottom: 12,
    gap: 8,
  },
  sortHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  sortRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
  },
  sortButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseBottomNavigator: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDeleteRow: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    marginTop: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF9C4',
  },
  statusPillAConfirmar: {
    backgroundColor: '#FFF9C4', // Amarelo
  },
  statusPillConfirmado: {
    backgroundColor: '#E3F2FD', // Azul
  },
  statusPillAReceber: {
    backgroundColor: '#FFEBEE', // Vermelho
  },
  statusPillRecebido: {
    backgroundColor: '#E8F5E9', // Verde
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9A825',
  },
  statusTextAConfirmar: {
    color: '#F9A825', // Amarelo
  },
  statusTextConfirmado: {
    color: '#1976D2', // Azul
  },
  statusTextAReceber: {
    color: '#D32F2F', // Vermelho
  },
  statusTextRecebido: {
    color: '#388E3C', // Verde
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  modeButtonTextActive: {
    color: '#0A84FF',
  },
  periodNavigatorContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  periodNavigatorRow: {
    flex: 1,
    gap: 8,
  },
  periodNavigatorLabel: {
    fontSize: 12,
    color: '#6C6C70',
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  periodNavButton: {
    padding: 5,
  },
  periodNavButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  periodNavValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  periodInfo: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  periodInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  periodInfoSubtext: {
    fontSize: 12,
    color: '#6C6C70',
  },
  summaryGrid: {
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6C6C70',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  summaryCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  balanceCardPositive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  balanceCardNegative: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  expensesByStatusContainer: {
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  expensesByStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusExpenseCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusExpenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusExpenseLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusExpenseValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusExpenseCount: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: 4,
  },
  sortContainer: {
    marginBottom: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: '#6C6C70',
    marginBottom: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
  },
  sortDropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sortDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sortDropdownItemText: {
    fontSize: 14,
    color: '#1C1C1E',
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
  comparisonSection: {
    marginBottom: 16,
    marginTop: 16,
    gap: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  comparisonModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 8,
    width: '100%',
  },
  comparisonModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonModeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C6C70',
  },
  comparisonModeTextActive: {
    color: '#0A84FF',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonPDF: {
    backgroundColor: '#0A84FF',
  },
  exportButtonExcel: {
    backgroundColor: '#34C759',
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentsIndicatorText: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '600',
  },
});
