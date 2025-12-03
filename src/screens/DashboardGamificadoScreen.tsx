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
import { CostCenterSelector } from '../components/CostCenterSelector';
import { GoalProgress } from '../components/GoalProgress';
import { CircularGauge } from '../components/CircularGauge';
import { AchievementBadge } from '../components/AchievementBadge';
import { RankingItem } from '../components/RankingItem';
import { AlertCard } from '../components/AlertCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { Plus, TrendingUp, Target, Trophy, BarChart3, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';

export default function DashboardGamificadoScreen() {
  const router = useRouter();
  const { selectedCenter } = useCostCenter();
  const { getAllExpenses, getAllReceipts } = useFinancial();
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

    // Saúde financeira (0-100)
    const healthScore = totalReceipts > 0 
      ? Math.min(100, Math.round((balance / totalReceipts) * 100 + 50))
      : 50;

    return {
      expenses: totalExpenses,
      receipts: totalReceipts,
      balance,
      healthScore,
    };
  }, [selectedCenter, getAllExpenses, getAllReceipts]);

  // Ranking dos centros (mock com dados reais do centro atual)
  const centerRanking = useMemo(() => {
    const centers = [
      { name: 'CNA', value: 320000 },
      { name: 'Cabrália', value: financialData.balance },
      { name: 'Valença', value: 185000 },
    ];

    const sorted = centers.sort((a, b) => b.value - a.value);
    const maxValue = sorted[0].value;

    return sorted.map((center, index) => ({
      rank: index + 1,
      name: center.name,
      value: center.value,
      percentage: (center.value / maxValue) * 100,
    }));
  }, [financialData.balance]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const centerLabels: Record<string, string> = {
    valenca: 'Valença',
    cna: 'CNA',
    cabralia: 'Cabrália',
  };

  // XP e Nível (mock)
  const xp = 850;
  const level = 12;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>🏆 Dashboard</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Nível {level}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {centerLabels[selectedCenter]} • {xp} XP
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
          {/* Metas do Mês */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Metas do Mês</Text>
            <View style={styles.card}>
              <GoalProgress
                title="Reduzir Despesas"
                progress={80}
                color="#10B981"
              />
              <GoalProgress
                title="Aumentar Receitas"
                progress={100}
                color="#0A84FF"
              />
              <GoalProgress
                title="Manutenções em Dia"
                progress={60}
                color="#F59E0B"
              />
            </View>
          </View>

          {/* Saúde Financeira */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Saúde Financeira</Text>
            <View style={styles.card}>
              <View style={styles.gaugeContainer}>
                <CircularGauge percentage={financialData.healthScore} />
              </View>
              <View style={styles.financialSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Receitas:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(financialData.receipts)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Despesas:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(financialData.expenses)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
                  <Text style={styles.summaryLabelHighlight}>Saldo:</Text>
                  <Text style={styles.summaryValueHighlight}>
                    {formatCurrency(financialData.balance)} ✨
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Conquistas Recentes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏅 Conquistas Recentes</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsContainer}
            >
              <AchievementBadge
                icon="🎖️"
                title="Economy"
                subtitle="Reduziu 10%"
              />
              <AchievementBadge
                icon="⭐"
                title="Meta 100%"
                subtitle="Atingiu meta"
              />
              <AchievementBadge
                icon="💎"
                title="Profissional"
                subtitle="30 dias ativos"
              />
              <AchievementBadge
                icon="🔥"
                title="15 dias"
                subtitle="Sequência"
              />
            </ScrollView>
          </View>

          {/* Ações Rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
            <View style={styles.actionsGrid}>
              <QuickActionButton
                icon={Plus}
                label="Despesa"
                color="#EF4444"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={TrendingUp}
                label="Receita"
                color="#10B981"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={Target}
                label="Meta"
                color="#8B5CF6"
                onPress={() => {}}
              />
              <QuickActionButton
                icon={Trophy}
                label="Ranking"
                color="#F59E0B"
                onPress={() => {}}
              />
              <QuickActionButton
                icon={BarChart3}
                label="Análise"
                color="#0A84FF"
                onPress={() => router.push('/(tabs)/financeiro' as any)}
              />
              <QuickActionButton
                icon={Settings}
                label="Config"
                color="#6B7280"
                onPress={() => {}}
              />
            </View>
          </View>

          {/* Ranking dos Centros */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Ranking dos Centros</Text>
            <View style={styles.card}>
              {centerRanking.map((item) => (
                <RankingItem
                  key={item.rank}
                  rank={item.rank}
                  name={item.name}
                  value={formatCurrency(item.value)}
                  percentage={item.percentage}
                />
              ))}
            </View>
          </View>

          {/* Notificações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Notificações</Text>
            <AlertCard
              icon={Trophy}
              iconColor="#F59E0B"
              title="Meta atingida!"
              message="Você ganhou +50 XP"
              onPress={() => {}}
            />
            <AlertCard
              icon={Target}
              iconColor="#EF4444"
              title="Revisão pendente"
              message="3 equipamentos precisam de atenção"
              badge={3}
              onPress={() => router.push('/(tabs)/equipamentos' as any)}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  levelBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  financialSummary: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowHighlight: {
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  summaryLabelHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  summaryValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  achievementsContainer: {
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
});
