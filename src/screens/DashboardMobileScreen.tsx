import React, { useMemo } from 'react';
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
import { CostCenterSelector } from '../components/CostCenterSelector';
import { HeroCard } from '../components/HeroCard';
import { QuickSummaryCard } from '../components/QuickSummaryCard';
import { LargeActionButton } from '../components/LargeActionButton';
import { PendencyCard } from '../components/PendencyCard';
import { Plus, TrendingUp, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';

export default function DashboardMobileScreen() {
  const router = useRouter();
  const { selectedCenter } = useCostCenter();
  const { getAllExpenses, getAllReceipts } = useFinancial();
  const { getEquipmentsByCenter } = useEquipment();
  const { getContractsByCenter } = useContracts();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Cálculos financeiros
  const financialData = useMemo(() => {
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
    };
  }, [selectedCenter, getAllExpenses, getAllReceipts]);

  // Contadores
  const counts = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    const contracts = getContractsByCenter(selectedCenter);

    return {
      equipments: equipments.length,
      contracts: contracts.length,
    };
  }, [selectedCenter, getEquipmentsByCenter, getContractsByCenter]);

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
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${Math.floor(value / 1000)}K`;
    }
    return formatCurrency(value);
  };

  // Dados da semana (mock)
  const weekData = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Menu size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Data */}
          <View style={styles.section}>
            <Text style={styles.dateText}>
              Hoje • {dayjs().format('DD MMM')}
            </Text>
          </View>

          {/* Hero Card - Saldo */}
          <View style={styles.section}>
            <HeroCard
              label="Saldo Disponível"
              value={formatCompact(financialData.balance)}
              trend="↗️ +18% vs mês anterior"
            />
          </View>

          {/* Centro de Custo */}
          <View style={styles.section}>
            <CostCenterSelector />
          </View>

          {/* Resumo Rápido */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo Rápido</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryContainer}
            >
              <QuickSummaryCard
                icon="💰"
                value={formatCompact(financialData.receipts)}
                label="Receitas"
              />
              <QuickSummaryCard
                icon="💸"
                value={formatCompact(financialData.expenses)}
                label="Despesas"
              />
              <QuickSummaryCard
                icon="🏗️"
                value={counts.equipments.toString()}
                label="Equipamentos"
              />
              <QuickSummaryCard
                icon="📊"
                value={counts.contracts.toString()}
                label="Contratos"
              />
            </ScrollView>
          </View>

          {/* Ação Rápida */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Ação Rápida</Text>
            <LargeActionButton
              icon={Plus}
              label="Nova Despesa"
              color="#EF4444"
              onPress={() => router.push('/(tabs)/financeiro' as any)}
            />
            <View style={{ height: 12 }} />
            <LargeActionButton
              icon={TrendingUp}
              label="Novo Recebimento"
              color="#10B981"
              onPress={() => router.push('/(tabs)/financeiro' as any)}
            />
          </View>

          {/* Esta Semana */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Esta Semana</Text>
            <View style={styles.weekCard}>
              <View style={styles.weekChart}>
                {weekData.map((day, index) => (
                  <View key={day} style={styles.weekBar}>
                    <View
                      style={[
                        styles.weekBarFill,
                        { height: `${Math.random() * 60 + 40}%` }
                      ]}
                    />
                    <Text style={styles.weekLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Pendências */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Pendências</Text>
            <View style={styles.pendenciesCard}>
              <PendencyCard
                icon="⚠️"
                count={3}
                label="Revisões"
              />
              <PendencyCard
                icon="📅"
                count={2}
                label="Contratos"
              />
              <PendencyCard
                icon="💰"
                count={5}
                label="Despesas"
              />
            </View>
          </View>

          {/* Ver Mais */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => router.push('/(tabs)/financeiro' as any)}
            >
              <Text style={styles.moreButtonText}>Ver Mais Detalhes</Text>
            </TouchableOpacity>
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
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryContainer: {
    gap: 12,
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  weekBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  weekBarFill: {
    width: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 4,
    marginBottom: 8,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  pendenciesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moreButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  moreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
});
