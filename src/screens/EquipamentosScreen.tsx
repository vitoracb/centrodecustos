import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Plus,
  ChevronRight,
  CreditCard,
  FileText,
  Camera,
  History,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const equipmentList = [
  {
    id: 'eq-1',
    name: 'Trator John Deere 5090E',
    brand: 'John Deere',
    year: 2021,
    purchaseDate: '12/05/2023',
    nextReview: '10/03/2025',
  },
  {
    id: 'eq-2',
    name: 'Colheitadeira Case IH 7150',
    brand: 'Case IH',
    year: 2020,
    purchaseDate: '03/11/2022',
    nextReview: '22/01/2025',
  },
];

export const EquipamentosScreen = () => {
  const { selectedCenter } = useCostCenter();

  return (
    <View style={styles.container}>
      <CostCenterSelector />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Equipamentos</Text>
          <Text style={styles.subtitle}>
            Gestão completa dos ativos do centro {centerLabels[selectedCenter]}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9}>
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.primaryButtonText}>Novo Equipamento</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de Equipamentos</Text>
            <TouchableOpacity>
              <Text style={styles.link}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {equipmentList.map((equipment) => (
            <TouchableOpacity
              key={equipment.id}
              style={styles.card}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{equipment.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {equipment.brand} · Ano {equipment.year}
                  </Text>
                </View>
                <ChevronRight size={18} color="#C7C7CC" />
              </View>
              <View style={styles.cardMeta}>
                <View>
                  <Text style={styles.metaLabel}>Data da compra</Text>
                  <Text style={styles.metaValue}>{equipment.purchaseDate}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Próxima revisão</Text>
                  <Text style={styles.metaValue}>{equipment.nextReview}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <View style={styles.actionPill}>
                  <CreditCard size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Despesas</Text>
                </View>
                <View style={styles.actionPill}>
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Documentos</Text>
                </View>
                <View style={styles.actionPill}>
                  <Camera size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Fotos</Text>
                </View>
                <View style={styles.actionPill}>
                  <History size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Revisões</Text>
                </View>
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
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
  link: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
