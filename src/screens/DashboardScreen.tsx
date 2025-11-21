import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import {
  Package,
  DollarSign,
  Users,
  FileText,
  PlusCircle,
  ShoppingCart,
} from 'lucide-react-native';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const statCards = [
  {
    label: 'Equipamentos Ativos',
    value: '24',
    change: '+12% vs mês anterior',
    icon: Package,
  },
  {
    label: 'Despesas do Mês',
    value: 'R$ 45.2K',
    change: '↓ 8% vs mês anterior',
    icon: DollarSign,
  },
  {
    label: 'Funcionários',
    value: '156',
    change: '↑ 3 novos este mês',
    icon: Users,
  },
  {
    label: 'Contratos Ativos',
    value: '8',
    change: '↔ último mês',
    icon: FileText,
  },
];

const activities = [
  {
    title: 'Novo equipamento cadastrado',
    description: 'Trator John Deere',
    timeAgo: '2h atrás',
  },
  {
    title: 'Despesa registrada',
    description: 'Manutenção preventiva',
    timeAgo: '5h atrás',
  },
  {
    title: 'Funcionário adicionado',
    description: 'João Silva',
    timeAgo: '1d atrás',
  },
  {
    title: 'Contrato renovado',
    description: 'Serviços de TI',
    timeAgo: '2d atrás',
  },
];

const quickActions = [
  { label: 'Novo Equipamento', icon: Package },
  { label: 'Registrar Despesa', icon: DollarSign },
  { label: 'Novo Funcionário', icon: Users },
  { label: 'Criar Pedido', icon: ShoppingCart },
];

export const DashboardScreen = () => {
  const { selectedCenter } = useCostCenter();

  return (
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
              <Text style={styles.statChange}>{card.change}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionsRow}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Atividades Recentes</Text>
            {activities.map((activity) => (
              <View key={activity.title} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <PlusCircle size={18} color="#0A84FF" />
                </View>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>
                    {activity.description}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{activity.timeAgo}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickButton}
                  activeOpacity={0.8}
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
});


