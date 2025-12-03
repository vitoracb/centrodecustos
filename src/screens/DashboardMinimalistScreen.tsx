import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCostCenter } from '../context/CostCenterContext';
import { useFinancial } from '../context/FinancialContext';
import { useEquipment } from '../context/EquipmentContext';
import { useContracts } from '../context/ContractContext';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { MinimalistCard } from '../components/MinimalistCard';
import { ProgressBar } from '../components/ProgressBar';
import { ActivityItem } from '../components/ActivityItem';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export default function DashboardMinimalistScreen() {
  const { selectedCenter } = useCostCenter();
  const { getAllExpenses, getAllReceipts } = useFinancial();
  const { getEquipmentsByCenter } = useEquipment();
  const { getContractsByCenter } = useContracts();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Cálculos financeiros do mês atual
  const monthlyData = useMemo(() => {
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
    const maxValue = Math.max(totalExpenses, totalReceipts);

    return {
      expenses: totalExpenses,
      receipts: totalReceipts,
      balance,
      expensesProgress: maxValue > 0 ? totalExpenses / maxValue : 0,
      receiptsProgress: maxValue > 0 ? totalReceipts / maxValue : 0,
      balanceProgress: maxValue > 0 ? Math.abs(balance) / maxValue : 0,
    };
  }, [selectedCenter, getAllExpenses, getAllReceipts]);

  // Contadores
  const counts = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    const contracts = getContractsByCenter(selectedCenter);
    const now = dayjs();
    
    // Alertas simulados
    const alerts = 3;

    return {
      equipments: equipments.length,
      contracts: contracts.length,
      alerts,
    };
  }, [selectedCenter, getEquipmentsByCenter, getContractsByCenter]);

  // Atividades recentes (mock)
  const recentActivities = [
    { icon: '💰', title: 'Nova despesa adicionada', time: '2h atrás' },
    { icon: '🔧', title: 'Equipamento revisado', time: '5h atrás' },
    { icon: '📄', title: 'Contrato renovado', time: '1d atrás' },
  ];

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
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              {dayjs().format('MMMM YYYY')}
            </Text>
          </View>
          <CostCenterSelector />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Resumo Financeiro */}
          <View style={styles.section}>
            <View style={styles.financialCard}>
              <Text style={styles.sectionTitle}>💰 Resumo Financeiro</Text>
              <View style={styles.divider} />
              
              <ProgressBar
                label="Receitas"
                value={formatCurrency(monthlyData.receipts)}
                progress={monthlyData.receiptsProgress}
                color="#10B981"
              />
              
              <ProgressBar
                label="Despesas"
                value={formatCurrency(monthlyData.expenses)}
                progress={monthlyData.expensesProgress}
                color="#EF4444"
              />
              
              <ProgressBar
                label="Saldo"
                value={formatCurrency(monthlyData.balance)}
                progress={monthlyData.balanceProgress}
                color="#0A84FF"
              />
            </View>
          </View>

          {/* Cards de Resumo */}
          <View style={styles.section}>
            <View style={styles.cardsGrid}>
              <MinimalistCard
                icon="🏗️"
                value={counts.equipments.toString()}
                label="Equipamentos"
              />
              <MinimalistCard
                icon="📊"
                value={counts.contracts.toString()}
                label="Contratos"
              />
              <MinimalistCard
                icon="⚠️"
                value={counts.alerts.toString()}
                label="Alertas"
              />
            </View>
          </View>

          {/* Gráfico de Tendência (Placeholder) */}
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>📈 Tendência (6 meses)</Text>
              <View style={styles.divider} />
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  Gráfico de área com gradiente
                </Text>
                <Text style={styles.chartPlaceholderSubtext}>
                  Evolução de receitas e despesas
                </Text>
              </View>
            </View>
          </View>

          {/* Atividades Recentes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleDark}>Atividades Recentes</Text>
            <View style={styles.activitiesCard}>
              {recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  icon={activity.icon}
                  title={activity.title}
                  time={activity.time}
                />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F7',
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
    paddingVertical: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  sectionTitleDark: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  financialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
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
  cardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  chartPlaceholderSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  activitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
