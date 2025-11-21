import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const TABS = ['Recebimentos', 'Despesas', 'Fechamento'] as const;

const recebimentosMock = [
  {
    id: 'rec-1',
    date: '05/11/2024',
    value: 'R$ 12.500',
    category: 'Serviços',
    status: 'Confirmado',
    method: 'Transferência',
  },
  {
    id: 'rec-2',
    date: '02/11/2024',
    value: 'R$ 8.100',
    category: 'Venda de equipamento',
    status: 'Previsto',
    method: 'Boleto',
  },
];

const despesasMock = [
  {
    id: 'desp-1',
    date: '06/11/2024',
    value: 'R$ 3.250',
    category: 'Manutenção',
    status: 'Pago',
    method: 'Cartão',
  },
  {
    id: 'desp-2',
    date: '03/11/2024',
    value: 'R$ 4.800',
    category: 'Combustível',
    status: 'Previsto',
    method: 'Transferência',
  },
];

const summaryMock = {
  month: 'Novembro 2024',
  received: 'R$ 54.200',
  expenses: 'R$ 38.450',
  balance: 'R$ 15.750',
};

export const FinanceiroScreen = () => {
  const { selectedCenter } = useCostCenter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Recebimentos');

  const renderContent = () => {
    switch (activeTab) {
      case 'Recebimentos':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recebimentos</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Calendar size={16} color="#0A84FF" />
                <Text style={styles.filterLabel}>Últimos 30 dias</Text>
              </TouchableOpacity>
            </View>
            {recebimentosMock.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.iconCircle}>
                    <ArrowDownCircle size={18} color="#34C759" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.value}</Text>
                    <Text style={styles.cardSubtitle}>
                      {item.category} · {item.method}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryButton}>
              <Plus size={18} color="#0A84FF" />
              <Text style={styles.secondaryButtonText}>Novo Recebimento</Text>
            </TouchableOpacity>
          </View>
        );
      case 'Despesas':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Despesas</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Calendar size={16} color="#0A84FF" />
                <Text style={styles.filterLabel}>Últimos 30 dias</Text>
              </TouchableOpacity>
            </View>
            {despesasMock.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FDECEC' }]}>
                    <ArrowUpCircle size={18} color="#FF3B30" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.value}</Text>
                    <Text style={styles.cardSubtitle}>
                      {item.category} · {item.method}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: '#FFF3D6' }]}>
                  <Text style={[styles.statusText, { color: '#FF9500' }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryButton}>
              <Plus size={18} color="#0A84FF" />
              <Text style={styles.secondaryButtonText}>Nova Despesa</Text>
            </TouchableOpacity>
          </View>
        );
      case 'Fechamento':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fechamento de Contas</Text>
              <View style={styles.monthNavigator}>
                <TouchableOpacity style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{summaryMock.month}</Text>
                <TouchableOpacity style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Recebimentos</Text>
                <Text style={styles.summaryValue}>{summaryMock.received}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={styles.summaryValue}>{summaryMock.expenses}</Text>
              </View>
              <View style={[styles.summaryCard, styles.balanceCard]}>
                <Calculator size={20} color="#FFFFFF" />
                <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>
                  {summaryMock.balance}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#E5E5EA' }]}>
                  Saldo do período
                </Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CostCenterSelector />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Financeiro</Text>
          <Text style={styles.subtitle}>
            Controle financeiramente o centro {centerLabels[selectedCenter]}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
  cardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9FAF0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
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
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  summaryGrid: {
    gap: 12,
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
  balanceCard: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
});
