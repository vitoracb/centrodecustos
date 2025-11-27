import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useEquipment } from '../context/EquipmentContext';
import { useFinancial } from '../context/FinancialContext';
import { useEmployees } from '../context/EmployeeContext';
import { useContracts } from '../context/ContractContext';
import { useOrders } from '../context/OrderContext';
import { EquipmentFormModal } from '../components/EquipmentFormModal';
import { EmployeeDocumentModal } from '../components/EmployeeDocumentModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { OrderFormModal } from '../components/OrderFormModal';
import { showSuccess, showError } from '../lib/toast';
import { GlobalSearch } from '../components/GlobalSearch';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import {
  Tractor,
  DollarSign,
  Users,
  FileText,
  PlusCircle,
  ShoppingCart,
  Trash2,
  Download,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import { exportToPDF, exportToExcel, buildReportHTML, ReportData } from '../lib/reportExport';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

type ActivityType = 
  | 'equipment_add'
  | 'equipment_remove'
  | 'equipment_activate'
  | 'expense'
  | 'receipt'
  | 'order_pending'
  | 'order_sent'
  | 'order_approved'
  | 'order_rejected'
  | 'employee_add'
  | 'employee_remove'
  | 'contract_add'
  | 'contract_remove';

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  timeAgo: string;
  type: ActivityType;
  // Campos opcionais para navegação
  equipmentId?: string;
  expenseId?: string;
  receiptId?: string;
  orderId?: string;
  contractId?: string;
}

const formatTimeAgo = (timestamp: number): string => {
  const now = dayjs();
  const time = dayjs(timestamp);
  const diffMinutes = now.diff(time, 'minute');
  const diffHours = now.diff(time, 'hour');
  const diffDays = now.diff(time, 'day');

  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return time.format('DD/MM/YYYY');
};

// Função para obter ícone e cor baseado no tipo de atividade
const getActivityIcon = (type: ActivityType): { icon: React.ComponentType<any>; color: string; backgroundColor: string } => {
  switch (type) {
    case 'equipment_add':
      return {
        icon: Tractor,
        color: '#0A84FF',
        backgroundColor: '#E5F1FF',
      };
    case 'equipment_remove':
      return {
        icon: Tractor,
        color: '#FF3B30',
        backgroundColor: '#FDECEC',
      };
    case 'equipment_activate':
      return {
        icon: Tractor,
        color: '#34C759',
        backgroundColor: '#E9FAF0',
      };
    case 'expense':
      return {
        icon: DollarSign,
        color: '#FF3B30',
        backgroundColor: '#FDECEC',
      };
    case 'receipt':
      return {
        icon: DollarSign,
        color: '#34C759',
        backgroundColor: '#E9FAF0',
      };
    case 'order_pending':
      return {
        icon: ShoppingCart,
        color: '#FF9500',
        backgroundColor: '#FFF3D6',
      };
    case 'order_sent':
      return {
        icon: ShoppingCart,
        color: '#0A84FF',
        backgroundColor: '#E5F1FF',
      };
    case 'order_approved':
      return {
        icon: ShoppingCart,
        color: '#34C759',
        backgroundColor: '#E9FAF0',
      };
    case 'order_rejected':
      return {
        icon: ShoppingCart,
        color: '#FF3B30',
        backgroundColor: '#FDECEC',
      };
    case 'employee_add':
      return {
        icon: Users,
        color: '#0A84FF',
        backgroundColor: '#E5F1FF',
      };
    case 'employee_remove':
      return {
        icon: Users,
        color: '#FF3B30',
        backgroundColor: '#FDECEC',
      };
    case 'contract_add':
      return {
        icon: FileText,
        color: '#0A84FF',
        backgroundColor: '#E5F1FF',
      };
    case 'contract_remove':
      return {
        icon: FileText,
        color: '#FF3B30',
        backgroundColor: '#FDECEC',
      };
    default:
      return {
        icon: PlusCircle,
        color: '#0A84FF',
        backgroundColor: '#E5F1FF',
      };
  }
};

export const DashboardScreen = () => {
  const router = useRouter();
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter, getAllEquipments, addEquipment, refresh: refreshEquipments } = useEquipment();
  const { getAllExpenses, getAllReceipts, addExpense } = useFinancial();
  const { documentsByCenter, addEmployeeDocument, loadDocuments } = useEmployees();
  const { getContractsByCenter, getAllContracts, refresh: refreshContracts } = useContracts();
  const { getAllOrders, addOrder, refresh: refreshOrders } = useOrders();

  const [refreshing, setRefreshing] = useState(false);
  const [reportPreview, setReportPreview] = useState<{
    type: 'pdf' | 'excel';
    html: string;
    data: ReportData;
  } | null>(null);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshEquipments(),
        refreshContracts(),
        refreshOrders(),
        loadDocuments(),
      ]);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshEquipments, refreshContracts, refreshOrders, loadDocuments]);

  // Estados para controlar os modais
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [isEmployeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isOrderModalVisible, setOrderModalVisible] = useState(false);

  // Função para navegar baseado no tipo de atividade
  const handleActivityPress = useCallback((activity: Activity) => {
    switch (activity.type) {
      case 'equipment_add':
      case 'equipment_remove':
      case 'equipment_activate':
        if (activity.equipmentId) {
          // Busca o equipamento para obter os dados necessários
          const allEquipments = getAllEquipments();
          const equipment = allEquipments.find(eq => eq.id === activity.equipmentId);
          if (equipment) {
            router.push({
              pathname: '/equipamentos/[id]' as any,
              params: {
                id: equipment.id,
                name: equipment.name,
                brand: equipment.brand || '',
                year: String(equipment.year || ''),
                purchaseDate: equipment.purchaseDate || '',
                nextReview: equipment.nextReview || '',
                center: centerLabels[equipment.center] || '',
              },
            });
          } else {
            router.push('/equipamentos' as any);
          }
        } else {
          router.push('/equipamentos' as any);
        }
        break;
      
      case 'expense':
        router.push({
          pathname: '/financeiro' as any,
          params: { tab: 'Despesas' },
        });
        break;
      
      case 'receipt':
        router.push({
          pathname: '/financeiro' as any,
          params: { tab: 'Recebimentos' },
        });
        break;
      
      case 'order_pending':
      case 'order_sent':
      case 'order_approved':
      case 'order_rejected':
        router.push('/pedidos' as any);
        break;
      
      case 'employee_add':
      case 'employee_remove':
        router.push('/funcionarios' as any);
        break;
      
      case 'contract_add':
      case 'contract_remove':
        router.push('/contratos' as any);
        break;
      
      default:
        // Não navega para tipos desconhecidos
        break;
    }
  }, [router, getAllEquipments]);

  // Calcula equipamentos ativos
  const activeEquipments = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    return equipments.filter(eq => eq.status === 'ativo').length;
  }, [selectedCenter, getEquipmentsByCenter]);

  // Calcula despesas do mês atual
  const monthlyExpenses = useMemo(() => {
    const expenses = getAllExpenses();
    const now = dayjs();
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    const centerExpenses = expenses.filter(exp => {
      if (exp.center !== selectedCenter) return false;
      
      const expenseDate = dayjs(exp.date, 'DD/MM/YYYY');
      return expenseDate.isValid() && 
             expenseDate.isAfter(startOfMonth.subtract(1, 'day')) && 
             expenseDate.isBefore(endOfMonth.add(1, 'day'));
    });

    const total = centerExpenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
    return total;
  }, [selectedCenter, getAllExpenses]);

  // Calcula funcionários únicos
  const employeesCount = useMemo(() => {
    const centerDocs = documentsByCenter[selectedCenter] ?? {};
    const allEmployees = new Set<string>();
    
    Object.values(centerDocs).forEach((docs) => {
      docs.forEach(doc => {
        if (doc.employee) {
          allEmployees.add(doc.employee);
        }
      });
    });

    return allEmployees.size;
  }, [selectedCenter, documentsByCenter]);

  // Calcula contratos
  const contractsCount = useMemo(() => {
    const contracts = getContractsByCenter(selectedCenter);
    return contracts.length;
  }, [selectedCenter, getContractsByCenter]);

  // Equipamentos para o dropdown de funcionário
  const equipmentsForEmployee = useMemo(() => {
    return getEquipmentsByCenter(selectedCenter);
  }, [selectedCenter, getEquipmentsByCenter]);

  // Coleta atividades recentes
  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];

    // 1. Equipamentos
    const allEquipments = getAllEquipments();
    allEquipments.forEach(eq => {
      if (eq.center !== selectedCenter) return;
      
      // Equipamento excluído
      if (eq.deletedAt) {
        activities.push({
          id: `eq-deleted-${eq.id}`,
          title: 'Equipamento excluído',
          description: eq.name,
          timestamp: eq.deletedAt,
          timeAgo: formatTimeAgo(eq.deletedAt),
          type: 'equipment_remove',
          equipmentId: eq.id,
        });
        return; // Não mostra outras atividades para equipamentos deletados
      }
      
      // Equipamento adicionado
      if (eq.createdAt) {
        activities.push({
          id: `eq-add-${eq.id}`,
          title: 'Equipamento adicionado',
          description: eq.name,
          timestamp: eq.createdAt,
          timeAgo: formatTimeAgo(eq.createdAt),
          type: 'equipment_add',
          equipmentId: eq.id,
        });
      }

      // Equipamento inativado
      if (eq.statusChangedAt && eq.status === 'inativo') {
        activities.push({
          id: `eq-inactive-${eq.id}`,
          title: 'Equipamento inativado',
          description: eq.name,
          timestamp: eq.statusChangedAt,
          timeAgo: formatTimeAgo(eq.statusChangedAt),
          type: 'equipment_remove',
          equipmentId: eq.id,
        });
      }

      // Equipamento ativado
      if (eq.statusChangedAt && eq.status === 'ativo') {
        activities.push({
          id: `eq-active-${eq.id}`,
          title: 'Equipamento ativado',
          description: eq.name,
          timestamp: eq.statusChangedAt,
          timeAgo: formatTimeAgo(eq.statusChangedAt),
          type: 'equipment_activate',
          equipmentId: eq.id,
        });
      }
    });

    // 2. Despesas e Receitas
    const allExpenses = getAllExpenses();
    allExpenses.forEach(exp => {
      if (exp.center !== selectedCenter) return;
      if (!exp.createdAt) return;

      activities.push({
        id: `expense-${exp.id}`,
        title: 'Despesa registrada',
        description: exp.name,
        timestamp: exp.createdAt,
        timeAgo: formatTimeAgo(exp.createdAt),
        type: 'expense',
        expenseId: exp.id,
      });
    });

    const allReceipts = getAllReceipts();
    allReceipts.forEach(rec => {
      if (rec.center !== selectedCenter) return;
      if (!rec.createdAt) return;

      activities.push({
        id: `receipt-${rec.id}`,
        title: 'Recebimento registrado',
        description: rec.name,
        timestamp: rec.createdAt,
        timeAgo: formatTimeAgo(rec.createdAt),
        type: 'receipt',
        receiptId: rec.id,
      });
    });

    // 3. Pedidos
    const allOrders = getAllOrders();
    allOrders.forEach(order => {
      if (order.costCenter !== selectedCenter) return;
      if (!order.createdAt) return;

      // Determina o tipo de atividade baseado no status do pedido
      let activityType: ActivityType = 'order_pending';
      let activityTitle = 'Pedido de orçamento';

      if (order.status === 'orcamento_enviado') {
        activityType = 'order_sent';
        activityTitle = 'Orçamento enviado';
      } else if (order.status === 'orcamento_aprovado') {
        activityType = 'order_approved';
        activityTitle = 'Orçamento aprovado';
      } else if (order.status === 'orcamento_reprovado') {
        activityType = 'order_rejected';
        activityTitle = 'Orçamento reprovado';
      } else {
        // orcamento_solicitado, orcamento_pendente, etc.
        activityType = 'order_pending';
        activityTitle = 'Pedido de orçamento';
      }

      activities.push({
        id: `order-${order.status}-${order.id}`,
        title: activityTitle,
        description: order.name,
        timestamp: order.createdAt,
        timeAgo: formatTimeAgo(order.createdAt),
        type: activityType,
        orderId: order.id,
      });
    });

    // 4. Funcionários (documentos)
    const centerDocs = documentsByCenter[selectedCenter] ?? {};
    Object.values(centerDocs).forEach((docs) => {
      docs.forEach(doc => {
        // Funcionário excluído
        if (doc.deletedAt) {
          activities.push({
            id: `employee-deleted-${doc.id}`,
            title: 'Funcionário excluído',
            description: doc.employee,
            timestamp: doc.deletedAt,
            timeAgo: formatTimeAgo(doc.deletedAt),
            type: 'employee_remove',
          });
          return; // Não mostra outras atividades para documentos deletados
        }
        
        const docTimestamp = doc.createdAt || Date.now();
        
        // Verifica se é um novo funcionário (primeiro documento deste funcionário neste equipamento)
        // Considera apenas documentos não deletados
        const nonDeletedDocs = docs.filter(d => !d.deletedAt);
        const isNewEmployee = nonDeletedDocs.filter(d => 
          d.employee === doc.employee && 
          (d.createdAt || Date.now()) <= docTimestamp
        ).length === 1;

        if (isNewEmployee) {
          activities.push({
            id: `employee-${doc.id}`,
            title: 'Funcionário adicionado',
            description: doc.employee,
            timestamp: docTimestamp,
            timeAgo: formatTimeAgo(docTimestamp),
            type: 'employee_add',
          });
        }
      });
    });

    // 5. Contratos
    const allContracts = getAllContracts();
    allContracts.forEach(contract => {
      if (contract.center !== selectedCenter) return;

      // Contrato excluído
      if (contract.deletedAt) {
        activities.push({
          id: `contract-deleted-${contract.id}`,
          title: 'Contrato excluído',
          description: contract.name,
          timestamp: contract.deletedAt,
          timeAgo: formatTimeAgo(contract.deletedAt),
          type: 'contract_remove',
          contractId: contract.id,
        });
        return; // Não mostra outras atividades para contratos deletados
      }

      // Contrato adicionado
      if (contract.createdAt) {
        activities.push({
          id: `contract-${contract.id}`,
          title: 'Contrato adicionado',
          description: contract.name,
          timestamp: contract.createdAt,
          timeAgo: formatTimeAgo(contract.createdAt),
          type: 'contract_add',
          contractId: contract.id,
        });
      }

      // Documentos de contratos (apenas se o contrato não foi deletado)
      if (contract.documents) {
        contract.documents.forEach(doc => {
          // Usa o timestamp do contrato como aproximação, já que documentos não têm createdAt separado
          activities.push({
            id: `contract-doc-${contract.id}-${doc.fileName}`,
            title: 'Documento de contrato adicionado',
            description: `${contract.name} - ${doc.fileName}`,
            timestamp: contract.createdAt || Date.now(),
            timeAgo: formatTimeAgo(contract.createdAt || Date.now()),
            type: 'contract_add',
          });
        });
      }
    });

    // Ordena por timestamp (mais recente primeiro) e limita a 6
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6);
  }, [selectedCenter, getAllEquipments, getAllExpenses, getAllReceipts, getAllOrders, documentsByCenter, getAllContracts]);

  // Formata valor monetário
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = useMemo(() => [
    {
      label: 'Equipamentos Ativos',
      value: String(activeEquipments),
      change: '',
      icon: Tractor,
      onPress: () => router.push('/(tabs)/equipamentos'),
    },
    {
      label: 'Despesas do Mês',
      value: formatCurrency(monthlyExpenses),
      change: '',
      icon: DollarSign,
      onPress: () => {
        router.push({
          pathname: '/(tabs)/financeiro',
          params: { tab: 'Despesas', month: dayjs().month(), year: dayjs().year() },
        });
      },
    },
    {
      label: 'Funcionários',
      value: String(employeesCount),
      change: '',
      icon: Users,
      onPress: () => router.push('/(tabs)/funcionarios'),
    },
    {
      label: 'Contratos Ativos',
      value: String(contractsCount),
      change: '',
      icon: FileText,
      onPress: () => router.push('/(tabs)/contratos'),
    },
  ], [activeEquipments, monthlyExpenses, employeesCount, contractsCount, router]);

  const expensesByCenter = useMemo(
    () => getAllExpenses().filter(exp => exp.center === selectedCenter),
    [getAllExpenses, selectedCenter],
  );

  const receiptsByCenter = useMemo(
    () => getAllReceipts().filter(rec => rec.center === selectedCenter),
    [getAllReceipts, selectedCenter],
  );

  const currentMonth = dayjs().month();
  const currentYear = dayjs().year();

  const expensesForCurrentPeriod = useMemo(
    () =>
      expensesByCenter.filter(expense => {
        const date = dayjs(expense.date, 'DD/MM/YYYY', true);
        if (!date.isValid()) return false;
        return date.month() === currentMonth && date.year() === currentYear;
      }),
    [expensesByCenter, currentMonth, currentYear],
  );

  const receiptsForCurrentPeriod = useMemo(
    () =>
      receiptsByCenter.filter(receipt => {
        const date = dayjs(receipt.date, 'DD/MM/YYYY', true);
        if (!date.isValid()) return false;
        return date.month() === currentMonth && date.year() === currentYear;
      }),
    [receiptsByCenter, currentMonth, currentYear],
  );

  const reportData = useMemo<ReportData>(
    () => ({
      expenses: expensesForCurrentPeriod,
      receipts: receiptsForCurrentPeriod,
      period: { month: currentMonth, year: currentYear },
      center: selectedCenter,
    }),
    [expensesForCurrentPeriod, receiptsForCurrentPeriod, currentMonth, currentYear, selectedCenter],
  );

  const handleOpenReportPreview = useCallback(
    (type: 'pdf' | 'excel') => {
      const html = buildReportHTML(reportData);
      setReportPreview({ type, html, data: reportData });
    },
    [reportData],
  );

  const handleDownloadReport = useCallback(async () => {
    if (!reportPreview) return;
    try {
      if (reportPreview.type === 'pdf') {
        await exportToPDF(reportPreview.data);
        showSuccess('Relatório exportado', 'O relatório PDF foi gerado com sucesso');
      } else {
        await exportToExcel(reportPreview.data);
        showSuccess('Relatório exportado', 'O relatório Excel foi gerado com sucesso');
      }
      setReportPreview(null);
    } catch (error: any) {
      showError('Erro ao exportar', error.message || 'Tente novamente');
    }
  }, [reportPreview, showSuccess, showError]);

  const quickActions = [
    { 
      label: 'Novo Equipamento', 
      icon: Tractor,
      onPress: () => setIsEquipmentModalVisible(true),
    },
    { 
      label: 'Registrar Despesa', 
      icon: DollarSign,
      onPress: () => setExpenseModalVisible(true),
    },
    { 
      label: 'Novo Funcionário', 
      icon: Users,
      onPress: () => setEmployeeModalVisible(true),
    },
    { 
      label: 'Criar Pedido', 
      icon: ShoppingCart,
      onPress: () => setOrderModalVisible(true),
    },
    {
      label: 'Gerar Relatório PDF',
      icon: FileText,
      onPress: () => handleOpenReportPreview('pdf'),
    },
    {
      label: 'Gerar Relatório Excel',
      icon: Download,
      onPress: () => handleOpenReportPreview('excel'),
    },
  ];

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
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              Visão geral das operações do centro de custo{' '}
              {centerLabels[selectedCenter]}
            </Text>
          </View>

          <GlobalSearch />

        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <TouchableOpacity
              key={card.label}
              style={styles.statCard}
              onPress={card.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.statIcon}>
                <card.icon size={20} color="#0A84FF" />
              </View>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
              {card.change ? (
                <Text style={styles.statChange}>{card.change}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

          <View style={styles.sectionsRow}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Atividades Recentes</Text>
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const { icon: Icon, color, backgroundColor } = getActivityIcon(activity.type);
                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.activityItem}
                    onPress={() => handleActivityPress(activity)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.activityIcon, { backgroundColor }]}>
                      <Icon size={18} color={color} />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDescription}>
                        {activity.description}
                      </Text>
                    </View>
                    <Text style={styles.activityTime}>{activity.timeAgo}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyActivities}>
                <Text style={styles.emptyActivitiesText}>
                  Nenhuma atividade recente
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickButton}
                  activeOpacity={0.8}
                  onPress={action.onPress}
                >
                  <action.icon size={20} color="#0A84FF" />
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          </View>
        </ScrollView>
      </View>

      <ReportPreviewModal
        visible={!!reportPreview}
        html={reportPreview?.html}
        onClose={() => setReportPreview(null)}
        onDownload={handleDownloadReport}
        downloadLabel={
          reportPreview?.type === 'pdf' ? 'Baixar PDF' : 'Baixar Excel'
        }
      />

      {/* Modal de Novo Equipamento */}
      <EquipmentFormModal
        visible={isEquipmentModalVisible}
        onClose={() => setIsEquipmentModalVisible(false)}
        onSubmit={async (data) => {
          try {
            await addEquipment({
              name: data.name,
              brand: data.brand,
              year: Number(data.year),
              purchaseDate: data.purchaseDate,
              nextReview: data.nextReview,
              status: 'ativo',
              center: selectedCenter,
            });
            setIsEquipmentModalVisible(false);
            showSuccess('Equipamento adicionado', data.name);
          } catch (error) {
            showError('Erro ao adicionar equipamento', 'Tente novamente');
          }
        }}
      />

      {/* Modal de Novo Funcionário */}
      <EmployeeDocumentModal
        visible={isEmployeeModalVisible}
        onClose={() => setEmployeeModalVisible(false)}
        onSubmit={(data) => {
          if (!data.equipmentId) {
            return;
          }
          addEmployeeDocument({
            employee: data.employeeName,
            documentName: data.documentName,
            date: data.date,
            fileName: data.fileName,
            fileUri: data.fileUri,
            mimeType: data.mimeType,
            equipmentId: data.equipmentId,
            center: selectedCenter,
          });
          setEmployeeModalVisible(false);
          showSuccess('Funcionário adicionado', data.employeeName);
        }}
        equipments={equipmentsForEmployee}
        showEquipmentSelector={true}
      />

      {/* Modal de Nova Despesa */}
      <ExpenseFormModal
        visible={isExpenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={async (data) => {
          try {
            await addExpense({
              name: data.name,
              value: data.value,
              date: data.date,
              category: data.category,
              center: selectedCenter,
              equipmentId: data.equipmentId,
              documents: data.documents || [],
            });
            setExpenseModalVisible(false);
            showSuccess('Despesa registrada', data.name);
          } catch (error) {
            showError('Erro ao registrar despesa', 'Tente novamente');
          }
        }}
      />

      {/* Modal de Novo Pedido */}
      <OrderFormModal
        visible={isOrderModalVisible}
        onClose={() => setOrderModalVisible(false)}
        onSubmit={async (data) => {
          try {
            await addOrder({
              name: data.name,
              description: data.observations,
              orderDate: data.date,
              status: 'orcamento_solicitado',
              costCenter: selectedCenter,
              equipmentId: data.equipmentId,
            });
            setOrderModalVisible(false);
            showSuccess('Pedido criado', data.name);
          } catch (error) {
            showError('Erro ao criar pedido', 'Tente novamente');
          }
        }}
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 15,
    color: '#6C6C70',
  },
  reportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  reportButtonPDF: {
    backgroundColor: '#0A84FF',
  },
  reportButtonExcel: {
    backgroundColor: '#34C759',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6C6C70',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statChange: {
    fontSize: 12,
    color: '#34C759',
  },
  sectionsRow: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  activityDescription: {
    fontSize: 13,
    color: '#6C6C70',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyActivities: {
    padding: 20,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickButton: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
});
