import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  FileText,
  AlertTriangle,
  Calendar,
  Wrench,
  Package,
} from 'lucide-react-native';
import { useCostCenter } from '../context/CostCenterContext';
import { useFinancial } from '../context/FinancialContext';
import { useEquipment } from '../context/EquipmentContext';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { DashboardCard } from '../components/DashboardCard';
import { StatusCard } from '../components/StatusCard';
import { AlertCard } from '../components/AlertCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';

export default function DashboardVisualScreen() {
  const router = useRouter();
  const { selectedCenter } = useCostCenter();
  const { getAllExpenses, getAllReceipts } = useFinancial();
  const { getEquipmentsByCenter } = useEquipment();
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

    return {
      expenses: totalExpenses,
      receipts: totalReceipts,
      balance,
      expensesTrend: -5, // Mock - calcular real depois
      receiptsTrend: 12, // Mock - calcular real depois
      balanceTrend: 18, // Mock - calcular real depois
    };
  }, [selectedCenter, getAllExpenses, getAllReceipts]);

  // Status dos equipamentos
  const equipmentStatus = useMemo(() => {
    const equipments = getEquipmentsByCenter(selectedCenter);
    const active = equipments.filter(eq => eq.status === 'ativo').length;
    const inactive = equipments.filter(eq => eq.status === 'inativo').length;
    const maintenance = equipments.length - active - inactive;
    
    return {
      active,
      maintenance,
      inactive,
    };
  }, [selectedCenter, getEquipmentsByCenter]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dashboard Visual</Text>
            <Text style={styles.subtitle}>Visão geral do centro de custo</Text>
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
          {/* Cards Principais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            >
              <DashboardCard
                title="RECEITAS"
                value={formatCurrency(monthlyData.receipts)}
                trend={{
                  value: monthlyData.receiptsTrend,
                  isPositive: monthlyData.receiptsTrend > 0,
                }}
                icon={TrendingUp}
                gradientColors={['#10B981', '#059669']}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro',
                  params: { tab: 'Recebimentos' },
                } as any)}
              />

              <DashboardCard
                title="DESPESAS"
                value={formatCurrency(monthlyData.expenses)}
                trend={{
                  value: monthlyData.expensesTrend,
                  isPositive: monthlyData.expensesTrend > 0,
                }}
                icon={TrendingDown}
                gradientColors={['#EF4444', '#DC2626']}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro',
                  params: { tab: 'Despesas' },
                } as any)}
              />

              <DashboardCard
                title="SALDO"
                value={formatCurrency(monthlyData.balance)}
                trend={{
                  value: monthlyData.balanceTrend,
                  isPositive: monthlyData.balanceTrend > 0,
                }}
                icon={DollarSign}
                gradientColors={['#0A84FF', '#0066CC']}
                onPress={() => router.push({
                  pathname: '/(tabs)/financeiro',
                  params: { tab: 'Fechamento' },
                } as any)}
              />
            </ScrollView>
          </View>

          {/* Status dos Equipamentos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status dos Equipamentos</Text>
            <StatusCard
              icon="🟢"
              count={equipmentStatus.active}
              label="Equipamentos Ativos"
              color="#10B981"
            />
            <StatusCard
              icon="🔴"
              count={equipmentStatus.maintenance}
              label="Em Manutenção"
              color="#EF4444"
            />
            <StatusCard
              icon="⚫"
              count={equipmentStatus.inactive}
              label="Inativos"
              color="#6B7280"
            />
          </View>

          {/* Ações Rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.actionsGrid}>
              <QuickActionButton
                icon={Plus}
                label="Nova Despesa"
                color="#EF4444"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={TrendingUp}
                label="Recebimento"
                color="#10B981"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={FileText}
                label="Relatório"
                color="#0A84FF"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={Wrench}
                label="Revisão"
                color="#F59E0B"
                onPress={() => router.push('/(tabs)/equipamentos' as any)}
              />
              <QuickActionButton
                icon={Package}
                label="Pedido"
                color="#8B5CF6"
                onPress={() => router.push('/(tabs)/pedidos' as any)}
              />
              <QuickActionButton
                icon={PieChart}
                label="Análise"
                color="#06B6D4"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
            </View>
          </View>

          {/* Alertas e Notificações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alertas e Notificações</Text>
            <AlertCard
              icon={AlertTriangle}
              iconColor="#F59E0B"
              title="Revisões Pendentes"
              message="3 equipamentos próximos da revisão"
              badge={3}
              onPress={() => router.push('/(tabs)/equipamentos' as any)}
            />
            <AlertCard
              icon={Calendar}
              iconColor="#8B5CF6"
              title="Contratos a Vencer"
              message="2 contratos vencem este mês"
              badge={2}
              onPress={() => router.push('/(tabs)/contratos' as any)}
            />
            <AlertCard
              icon={FileText}
              iconColor="#EF4444"
              title="Despesas Pendentes"
              message="5 despesas aguardando confirmação"
              badge={5}
              onPress={() => router.push({
                pathname: '/(tabs)/financeiro',
                params: { tab: 'Despesas' },
              } as any)}
            />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    paddingHorizontal: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
});
