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
import { useOrders } from '../context/OrderContext';
import { useEquipment } from '../context/EquipmentContext';
import { useFinancial } from '../context/FinancialContext';
import { useContracts } from '../context/ContractContext';
import { useEmployees } from '../context/EmployeeContext';
import { EquipmentFormModal } from '../components/EquipmentFormModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { EmployeeDocumentModal } from '../components/EmployeeDocumentModal';
import { OrderFormModal } from '../components/OrderFormModal';
import { Package, DollarSign, Users, FileText, ShoppingCart } from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

// Helper function para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};


const quickActions = [
  { label: 'Novo Equipamento', icon: Package },
  { label: 'Registrar Despesa', icon: DollarSign },
  { label: 'Novo Funcionário', icon: Users },
  { label: 'Criar Pedido', icon: ShoppingCart },
];

type Activity = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  timestamp: number;
  icon: typeof Package;
};

export const DashboardScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { orders: allOrders, addOrder } = useOrders();
  const { getAllEquipments, getEquipmentsByCenter, addEquipment } = useEquipment();
  const { getAllReceipts, getAllExpenses, getExpensesByCenter, addExpense } = useFinancial();
  const { getAllContracts, getContractsByCenter } = useContracts();
  const { getAllEmployeeDocuments, getEmployeesCountByCenter, addEmployeeDocument } = useEmployees();
  
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isEmployeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [isOrderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedEquipmentForEmployee, setSelectedEquipmentForEmployee] = useState<{
    id: string;
    name: string;
  } | null>(null);
  
  // Equipamentos do centro selecionado para seleção de funcionário
  const equipmentsForEmployee = useMemo(
    () => getEquipmentsByCenter(selectedCenter),
    [selectedCenter, getEquipmentsByCenter]
  );
  
  // Handler para novo equipamento
  const handleNewEquipment = () => {
    setIsEquipmentModalVisible(true);
  };
  
  // Handler para nova despesa
  const handleNewExpense = () => {
    setExpenseModalVisible(true);
  };
  
  // Handler para novo funcionário
  const handleNewEmployee = () => {
    if (equipmentsForEmployee.length === 0) {
      Alert.alert(
        'Nenhum equipamento',
        'É necessário ter pelo menos um equipamento cadastrado para adicionar funcionários.'
      );
      return;
    }
    // Sempre abre o modal, que terá o seletor de equipamento
    setEmployeeModalVisible(true);
  };
  
  // Handler para novo pedido
  const handleNewOrder = () => {
    setOrderModalVisible(true);
  };
  
  // Calcula equipamentos ativos do centro selecionado
  const activeEquipmentsCount = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    return equipments.filter((eq) => eq.status === 'ativo').length;
  }, [selectedCenter, getEquipmentsByCenter]);
  
  // Calcula despesas do mês atual do centro selecionado
  const monthlyExpenses = useMemo(() => {
    const expenses = getExpensesByCenter(selectedCenter);
    const now = dayjs();
    const currentMonth = now.month();
    const currentYear = now.year();
    
    return expenses
      .filter((expense) => {
        const expenseDate = dayjs(expense.date, 'DD/MM/YYYY');
        return (
          expenseDate.month() === currentMonth &&
          expenseDate.year() === currentYear
        );
      })
      .reduce((total, expense) => total + expense.value, 0);
  }, [selectedCenter, getExpensesByCenter]);
  
  // Calcula funcionários únicos do centro selecionado
  const employeesCount = useMemo(() => {
    return getEmployeesCountByCenter(selectedCenter);
  }, [selectedCenter, getEmployeesCountByCenter]);
  
  // Calcula contratos ativos do centro selecionado
  const activeContractsCount = useMemo(() => {
    const contracts = getContractsByCenter(selectedCenter);
    // Considera todos os contratos como ativos por enquanto
    // Se houver um campo de status no futuro, podemos filtrar aqui
    return contracts.length;
  }, [selectedCenter, getContractsByCenter]);
  
  // Cria os cards de estatísticas com valores reais
  const statCards = useMemo(() => [
    {
      label: 'Equipamentos Ativos',
      value: activeEquipmentsCount.toString(),
      change: '',
      icon: Package,
    },
    {
      label: 'Despesas do Mês',
      value: formatCurrency(monthlyExpenses),
      change: '',
      icon: DollarSign,
    },
    {
      label: 'Funcionários',
      value: employeesCount.toString(),
      change: '',
      icon: Users,
    },
    {
      label: 'Contratos Ativos',
      value: activeContractsCount.toString(),
      change: '',
      icon: FileText,
    },
  ], [activeEquipmentsCount, monthlyExpenses, employeesCount, activeContractsCount]);
  
  const activities = useMemo(() => {
    const allActivities: Activity[] = [];
    
    // Equipamentos adicionados
    getAllEquipments()
      .filter((eq) => eq.center === selectedCenter && eq.createdAt)
      .forEach((eq) => {
        allActivities.push({
          id: `eq-${eq.id}`,
          title: 'Novo equipamento adicionado',
          description: eq.name,
          timeAgo: dayjs(eq.createdAt).fromNow(),
          timestamp: eq.createdAt || 0,
          icon: Package,
        });
      });
    
    // Equipamentos que ficaram inativos
    getAllEquipments()
      .filter((eq) => eq.center === selectedCenter && eq.status === 'inativo' && eq.statusChangedAt)
      .forEach((eq) => {
        allActivities.push({
          id: `eq-inactive-${eq.id}`,
          title: 'Equipamento inativado',
          description: eq.name,
          timeAgo: dayjs(eq.statusChangedAt).fromNow(),
          timestamp: eq.statusChangedAt || 0,
          icon: Package,
        });
      });
    
    // Despesas adicionadas
    getAllExpenses()
      .filter((exp) => exp.center === selectedCenter && exp.createdAt)
      .forEach((exp) => {
        allActivities.push({
          id: `exp-${exp.id}`,
          title: 'Nova despesa adicionada',
          description: exp.name,
          timeAgo: dayjs(exp.createdAt).fromNow(),
          timestamp: exp.createdAt || 0,
          icon: DollarSign,
        });
      });
    
    // Recebimentos adicionados
    getAllReceipts()
      .filter((rec) => rec.center === selectedCenter && rec.createdAt)
      .forEach((rec) => {
        allActivities.push({
          id: `rec-${rec.id}`,
          title: 'Novo recebimento adicionado',
          description: rec.name,
          timeAgo: dayjs(rec.createdAt).fromNow(),
          timestamp: rec.createdAt || 0,
          icon: DollarSign,
        });
      });
    
    // Pedidos e orçamentos
    allOrders
      .filter((order) => order.center === selectedCenter)
      .forEach((order) => {
        const timeAgo = order.updatedAt || order.createdAt || Date.now();
        const isNewOrder = order.createdAt && 
          (order.updatedAt || order.createdAt) === order.createdAt;
        const isBudgetSent = order.status === 'orçamento_enviado' && order.budget;
        
        let title = '';
        if (isNewOrder) {
          title = 'Novo pedido de orçamento';
        } else if (isBudgetSent) {
          title = 'Orçamento enviado';
        } else {
          return; // Não mostra atualizações genéricas
        }
        
        allActivities.push({
          id: `ord-${order.id}`,
          title,
          description: order.name,
          timeAgo: dayjs(timeAgo).fromNow(),
          timestamp: timeAgo,
          icon: ShoppingCart,
        });
      });
    
    // Funcionários adicionados
    getAllEmployeeDocuments()
      .filter((doc) => doc.center === selectedCenter && doc.createdAt)
      .forEach((doc) => {
        allActivities.push({
          id: `emp-${doc.id}`,
          title: 'Novo funcionário adicionado',
          description: doc.employee,
          timeAgo: dayjs(doc.createdAt).fromNow(),
          timestamp: doc.createdAt || 0,
          icon: Users,
        });
      });
    
    // Contratos adicionados
    getAllContracts()
      .filter((contract) => contract.center === selectedCenter && contract.createdAt)
      .forEach((contract) => {
        allActivities.push({
          id: `ct-${contract.id}`,
          title: 'Novo contrato adicionado',
          description: contract.name,
          timeAgo: dayjs(contract.createdAt).fromNow(),
          timestamp: contract.createdAt || 0,
          icon: FileText,
        });
      });
    
    // Ordena por timestamp (mais recente primeiro) e retorna os 5 mais recentes
    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [
    selectedCenter,
    getAllEquipments,
    getAllExpenses,
    getAllReceipts,
    getAllContracts,
    getAllEmployeeDocuments,
    allOrders,
  ]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <CostCenterSelector />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              Visão geral das operações do centro de custo{' '}
              {centerLabels[selectedCenter]}
            </Text>
          </View>

        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <View key={card.label} style={styles.statCard}>
              <View style={styles.statIcon}>
                <card.icon size={20} color="#0A84FF" />
              </View>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
              {card.change ? <Text style={styles.statChange}>{card.change}</Text> : null}
            </View>
          ))}
        </View>

          <View style={styles.sectionsRow}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Atividades Recentes</Text>
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <View key={`${activity.title}-${index}`} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <activity.icon size={18} color="#0A84FF" />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.timeAgo}</Text>
                </View>
              ))
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
              <TouchableOpacity
                style={styles.quickButton}
                activeOpacity={0.8}
                onPress={handleNewEquipment}
              >
                <Package size={20} color="#0A84FF" />
                <Text style={styles.quickLabel}>Novo Equipamento</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickButton}
                activeOpacity={0.8}
                onPress={handleNewExpense}
              >
                <DollarSign size={20} color="#0A84FF" />
                <Text style={styles.quickLabel}>Registrar Despesa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickButton}
                activeOpacity={0.8}
                onPress={handleNewEmployee}
              >
                <Users size={20} color="#0A84FF" />
                <Text style={styles.quickLabel}>Novo Funcionário</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickButton}
                activeOpacity={0.8}
                onPress={handleNewOrder}
              >
                <ShoppingCart size={20} color="#0A84FF" />
                <Text style={styles.quickLabel}>Criar Pedido</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </ScrollView>
      </View>
      
      {/* Modais */}
      <EquipmentFormModal
        visible={isEquipmentModalVisible}
        onClose={() => setIsEquipmentModalVisible(false)}
        onSubmit={(data) => {
          addEquipment({
            name: data.name,
            brand: data.brand,
            year: Number(data.year) || new Date().getFullYear(),
            purchaseDate: data.purchaseDate,
            nextReview: data.nextReview,
            center: selectedCenter,
            status: 'ativo',
          });
          setIsEquipmentModalVisible(false);
        }}
      />
      
      <ExpenseFormModal
        visible={isExpenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={(data) => {
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
          });
          setExpenseModalVisible(false);
        }}
      />
      
      <EmployeeDocumentModal
        visible={isEmployeeModalVisible}
        onClose={() => {
          setEmployeeModalVisible(false);
        }}
        onSubmit={(data) => {
          if (data.equipmentId) {
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
          }
        }}
        equipments={equipmentsForEmployee.map((eq) => ({
          id: eq.id,
          name: eq.name,
        }))}
        showEquipmentSelector={true}
      />
      
      <OrderFormModal
        visible={isOrderModalVisible}
        onClose={() => setOrderModalVisible(false)}
        onSubmit={(data) => {
          addOrder({
            name: data.name,
            description: data.observations || '',
            date: data.date,
            status: 'orçamento_pendente',
            center: selectedCenter,
            equipmentId: data.equipmentId,
          });
          setOrderModalVisible(false);
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
  emptyActivities: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});


