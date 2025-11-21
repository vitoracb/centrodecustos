import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { FilePlus, FileText, ChevronRight } from 'lucide-react-native';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const contractsMock = [
  {
    id: 'ct-1',
    name: 'Serviços de TI',
    category: 'principal',
    date: '18/09/2024',
    docs: 3,
  },
  {
    id: 'ct-2',
    name: 'Manutenção terceirizada',
    category: 'terceirizados',
    date: '02/10/2024',
    docs: 5,
  },
];

const categoryLabels = {
  principal: 'Principal',
  terceirizados: 'Terceirizados',
};

export const ContratosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const [currentMonth, setCurrentMonth] = useState('Novembro 2024');

  return (
    <View style={styles.container}>
      <CostCenterSelector />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Contratos</Text>
          <Text style={styles.subtitle}>
            Controle de contratos do centro {centerLabels[selectedCenter]}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Período</Text>
              <Text style={styles.sectionSubtitle}>Selecione mês/ano</Text>
            </View>
            <View style={styles.monthNavigator}>
              <TouchableOpacity style={styles.monthButton}>
                <Text style={styles.monthButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{currentMonth}</Text>
              <TouchableOpacity style={styles.monthButton}>
                <Text style={styles.monthButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contratos</Text>
            <TouchableOpacity style={styles.primaryButton}>
              <FilePlus size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Novo Contrato</Text>
            </TouchableOpacity>
          </View>

          {contractsMock.map((contract) => (
            <TouchableOpacity key={contract.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{contract.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    Categoria: {categoryLabels[contract.category as 'principal']}
                  </Text>
                </View>
                <ChevronRight size={18} color="#C7C7CC" />
              </View>
              <View style={styles.cardMeta}>
                <View>
                  <Text style={styles.metaLabel}>Data</Text>
                  <Text style={styles.metaValue}>{contract.date}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Documentos</Text>
                  <Text style={styles.metaValue}>{contract.docs}</Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionPill}>
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Ver documentos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPill}>
                  <FilePlus size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Adicionar documento</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 15,
    color: '#6C6C70',
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
  sectionSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 4,
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
