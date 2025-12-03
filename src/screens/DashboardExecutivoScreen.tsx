import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCostCenter } from '../context/CostCenterContext';
import { useFinancial } from '../context/FinancialContext';
import { useEquipment } from '../context/EquipmentContext';
import { useContracts } from '../context/ContractContext';
import { useEmployees } from '../context/EmployeeContext';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { TopExpenseItem } from '../components/TopExpenseItem';
import { ComparisonRow } from '../components/ComparisonRow';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Tractor, 
  FileText,
  Users,
  ShoppingCart,
  Download,
  Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';

export default function DashboardExecutivoScreen() {
  const router = useRouter();
  const { selectedCenter } = useCostCenter();
  const { getAllExpenses, getAllReceipts } = useFinancial();
  const { getEquipmentsByCenter } = useEquipment();
  const { getContractsByCenter } = useContracts();
  const { getEmployeesByCenter } = useEmployees();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Ações Rápidas
  const quickActions = [
    { 
      label: 'Novo Equipamento', 
      icon: Tractor,
      onPress: () => router.push('/(tabs)/equipamentos' as any),
    },
    { 
      label: 'Registrar Despesa', 
      icon: DollarSign,
      onPress: () => router.push('/(tabs)/financeiro' as any),
    },
    { 
      label: 'Novo Funcionário', 
      icon: Users,
      onPress: () => router.push('/(tabs)/funcionarios' as any),
    },
    { 
      label: 'Ver Contratos', 
      icon: FileText,
      onPress: () => router.push('/(tabs)/contratos' as any),
    },
  ];

  // Cálculos do mês atual
  const currentMonthData = useMemo(() => {
    const now = dayjs();
    const currentMonth = now.format('YYYY-MM');

    const expenses = getAllExpenses().filter(exp => {
      const expMonth = exp.date.split('/').reverse().slice(0, 2).join('-');
      return exp.center === selectedCenter && expMonth === currentMonth;
    });

    const receipts = getAllReceipts().filter(rec => {
      const recMonth = rec.date.split('/').reverse().slice(0, 2).join('-');
      return rec.center === selectedCenter && recMonth === currentMonth;
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalReceipts = receipts.reduce((sum, rec) => sum + rec.value, 0);
    const balance = totalReceipts - totalExpenses;

    return {
      expenses: totalExpenses,
      receipts: totalReceipts,
      balance,
      expensesData: expenses,
    };
  }, [selectedCenter, getAllExpenses, getAllReceipts]);

  // Contadores
  const counts = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    const contracts = getContractsByCenter(selectedCenter);
    const employees = getEmployeesByCenter(selectedCenter);

    return {
      equipments: equipments.length,
      contracts: contracts.length,
      employees: employees.length,
    };
  }, [selectedCenter, getEquipmentsByCenter, getContractsByCenter, getEmployeesByCenter]);

  // Top 5 despesas
  const topExpenses = useMemo(() => {
    const expensesByName = new Map<string, number>();
    
    currentMonthData.expensesData.forEach(exp => {
      const current = expensesByName.get(exp.name) || 0;
      expensesByName.set(exp.name, current + exp.value);
    });

    const sorted = Array.from(expensesByName.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const maxValue = sorted[0]?.value || 1;

    return sorted.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      value: item.value,
      percentage: (item.value / maxValue) * 100,
    }));
  }, [currentMonthData.expensesData]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    if (value >= 1000) {
      return `${Math.floor(value / 1000)}K`;
    }
    return value.toString();
  };

  const centerLabels: Record<string, string> = {
    valenca: 'Valença',
    cna: 'CNA',
    cabralia: 'Cabrália',
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Seletor de Centro de Custo */}
        <CostCenterSelector />
        
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Dashboard Executivo</Text>
            <Text style={styles.subtitle}>
              {centerLabels[selectedCenter]} • {dayjs().format('MMMM YYYY')}
            </Text>
          </View>
          {/* KPIs Principais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KPIs Principais</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kpiContainer}
            >
              {/* Receitas */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro' as any,
                  params: { tab: 'Recebimentos' }
                })}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E9FAF0' }]}>
                  <TrendingUp size={24} color="#34C759" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{formatCompact(currentMonthData.receipts)}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>↗</Text>
                  <Text style={[styles.trendText, { color: '#10B981' }]}>+12%</Text>
                </View>
                <Text style={styles.kpiLabel}>Receitas</Text>
              </TouchableOpacity>

              {/* Despesas */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro' as any,
                  params: { tab: 'Despesas' }
                })}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#FDECEC' }]}>
                  <TrendingDown size={24} color="#FF3B30" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{formatCompact(currentMonthData.expenses)}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>↘</Text>
                  <Text style={[styles.trendText, { color: '#EF4444' }]}>-5%</Text>
                </View>
                <Text style={styles.kpiLabel}>Despesas</Text>
              </TouchableOpacity>

              {/* Saldo */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro' as any,
                  params: { tab: 'Fechamento' }
                })}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E6F2FF' }]}>
                  <DollarSign size={24} color="#0A84FF" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{formatCompact(currentMonthData.balance)}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>↗</Text>
                  <Text style={[styles.trendText, { color: '#10B981' }]}>+18%</Text>
                </View>
                <Text style={styles.kpiLabel}>Saldo</Text>
              </TouchableOpacity>

              {/* Equipamentos */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/equipamentos' as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Tractor size={24} color="#FF9500" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{counts.equipments}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>↗</Text>
                  <Text style={[styles.trendText, { color: '#10B981' }]}>+2</Text>
                </View>
                <Text style={styles.kpiLabel}>Equipamentos</Text>
              </TouchableOpacity>

              {/* Contratos */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/contratos' as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                  <FileText size={24} color="#AF52DE" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{counts.contracts}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>→</Text>
                  <Text style={[styles.trendText, { color: '#6C6C70' }]}>0</Text>
                </View>
                <Text style={styles.kpiLabel}>Contratos</Text>
              </TouchableOpacity>

              {/* Funcionários */}
              <TouchableOpacity
                style={styles.kpiCard}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/funcionarios' as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Users size={24} color="#2196F3" strokeWidth={2.5} />
                </View>
                <Text style={styles.kpiValue}>{counts.employees}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendIconText}>↗</Text>
                  <Text style={[styles.trendText, { color: '#10B981' }]}>+1</Text>
                </View>
                <Text style={styles.kpiLabel}>Funcionários</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Gráficos */}
          <View style={styles.section}>
            <View style={styles.chartsRow}>
              {/* Despesas por Setor */}
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Despesas/Setor</Text>
                <View style={styles.pieChartContainer}>
                  <ExpensePieChart
                    expenses={currentMonthData.expensesData}
                    mode="mensal"
                    selectedPeriod={dayjs()}
                  />
                </View>
              </View>

              {/* Evolução Mensal (Placeholder) */}
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Evolução Mensal</Text>
                <View style={styles.lineChartPlaceholder}>
                  <Text style={styles.placeholderText}>Gráfico de Linha</Text>
                  <Text style={styles.placeholderSubtext}>Rec ─────</Text>
                  <Text style={styles.placeholderSubtext}>Des ─ ─ ─</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Top 5 Despesas */}
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top 5 Despesas do Mês</Text>
              <View style={styles.divider} />
              {topExpenses.length > 0 ? (
                topExpenses.map((item) => (
                  <TopExpenseItem
                    key={item.rank}
                    rank={item.rank}
                    name={item.name}
                    value={formatCurrency(item.value)}
                    percentage={item.percentage}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Nenhuma despesa registrada</Text>
              )}
            </View>
          </View>

          {/* Comparação com Mês Anterior */}
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comparação com Mês Anterior</Text>
              <View style={styles.divider} />
              <ComparisonRow label="Receitas" value={12} isPositive={true} />
              <ComparisonRow label="Despesas" value={-5} isPositive={false} />
              <ComparisonRow label="Saldo" value={18} isPositive={true} />
            </View>
          </View>

          {/* Ações Rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickActionButton}
                  activeOpacity={0.8}
                  onPress={action.onPress}
                >
                  <View style={styles.quickActionIcon}>
                    <action.icon size={24} color="#0A84FF" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Espaçamento final */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6C6C70',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  kpiContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  chartsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  pieChartContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineChartPlaceholder: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIconText: {
    fontSize: 14,
    marginRight: 2,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C6C70',
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
});
