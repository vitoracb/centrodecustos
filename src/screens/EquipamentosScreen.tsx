import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  GestureResponderEvent,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  ChevronRight,
  Edit3,
  Trash2,
  Filter,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useEquipment } from '../context/EquipmentContext';
import { useRouter } from 'expo-router';
import { EquipmentFormModal } from '../components/EquipmentFormModal';
import { EquipmentFilterModal, EquipmentFilters } from '../components/EquipmentFilterModal';
import dayjs from 'dayjs';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

export const EquipamentosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter, addEquipment, updateEquipment, deleteEquipment, getAllEquipments, refresh } = useEquipment();
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Erro ao atualizar equipamentos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);
  const router = useRouter();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<EquipmentFilters>({});
  const [editingEquipment, setEditingEquipment] = useState<{
    id: string;
    name: string;
    brand: string;
    year: number;
    purchaseDate: string;
    nextReview: string;
  } | null>(null);
  
  // Pega todos os equipamentos (para filtrar por centro de custo também)
  const allEquipments = useMemo(
    () => getAllEquipments(),
    [getAllEquipments]
  );

  // Aplica os filtros
  const filteredEquipments = useMemo(() => {
    // Primeiro filtra pelo centro de custo selecionado no dropdown superior e remove os deletados
    let filtered = allEquipments.filter((eq) => eq.center === selectedCenter && !eq.deletedAt);

    // Filtrar por nome
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      filtered = filtered.filter((eq) =>
        eq.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por marca
    if (filters.brand) {
      const searchTerm = filters.brand.toLowerCase();
      filtered = filtered.filter((eq) =>
        eq.brand.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por ano
    if (filters.year !== null && filters.year !== undefined) {
      filtered = filtered.filter((eq) => eq.year === filters.year);
    }

    // Filtrar por data da compra (mês e ano)
    if (filters.purchaseMonth !== null && filters.purchaseMonth !== undefined && filters.purchaseYear) {
      filtered = filtered.filter((eq) => {
        const purchaseDate = dayjs(eq.purchaseDate, 'DD/MM/YYYY');
        if (!purchaseDate.isValid()) return false;
        return (
          purchaseDate.month() === filters.purchaseMonth &&
          purchaseDate.year() === filters.purchaseYear
        );
      });
    }

    return filtered;
  }, [allEquipments, filters, selectedCenter]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.name ||
      filters.brand ||
      (filters.year !== null && filters.year !== undefined) ||
      (filters.purchaseMonth !== null && filters.purchaseMonth !== undefined && filters.purchaseYear)
    );
  }, [filters]);

  const handleEdit = (equipment: typeof equipmentList[0], event: GestureResponderEvent) => {
    event.stopPropagation();
    setEditingEquipment({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      year: equipment.year,
      purchaseDate: equipment.purchaseDate,
      nextReview: equipment.nextReview,
    });
    setIsFormVisible(true);
  };

  const handleDelete = (equipment: typeof equipmentList[0], event: GestureResponderEvent) => {
    event.stopPropagation();
    Alert.alert(
      'Excluir equipamento',
      `Tem certeza que deseja excluir o equipamento "${equipment.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteEquipment(equipment.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <CostCenterSelector />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Equipamentos</Text>
            <Text style={styles.subtitle}>
              Gestão completa dos ativos do centro {centerLabels[selectedCenter]}
            </Text>
          </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => setIsFormVisible(true)}
        >
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.primaryButtonText}>Novo Equipamento</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de Equipamentos</Text>
            <TouchableOpacity
              style={[
                styles.filterButton,
                hasActiveFilters && styles.filterButtonActive
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Filter 
                size={18} 
                color={hasActiveFilters ? '#0A84FF' : '#6C6C70'} 
              />
            </TouchableOpacity>
          </View>

          {filteredEquipments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {hasActiveFilters 
                  ? 'Nenhum equipamento encontrado com os filtros aplicados'
                  : 'Nenhum equipamento cadastrado'}
              </Text>
            </View>
          ) : (
            filteredEquipments.map((equipment) => (
            <TouchableOpacity
              key={equipment.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/equipamentos/[id]' as any,
                  params: {
                    id: equipment.id,
                    name: equipment.name,
                    brand: equipment.brand,
                    year: String(equipment.year),
                    purchaseDate: equipment.purchaseDate,
                    nextReview: equipment.nextReview,
                    center: centerLabels[selectedCenter],
                  },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{equipment.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        equipment.status === 'ativo'
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          equipment.status === 'ativo'
                            ? styles.statusTextActive
                            : styles.statusTextInactive,
                        ]}
                      >
                        {equipment.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {equipment.brand} · Ano {equipment.year}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(event) => handleEdit(equipment, event)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Edit3 size={18} color="#0A84FF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(event) => handleDelete(equipment, event)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                  <ChevronRight size={18} color="#C7C7CC" />
                </View>
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
            </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      <EquipmentFormModal
        visible={isFormVisible}
        onClose={() => {
          setIsFormVisible(false);
          setEditingEquipment(null);
        }}
        onSubmit={(data) => {
          if (editingEquipment) {
            updateEquipment(editingEquipment.id, {
              name: data.name,
              brand: data.brand,
              year: Number(data.year) || new Date().getFullYear(),
              purchaseDate: data.purchaseDate,
              nextReview: data.nextReview,
            });
          } else {
            addEquipment({
              name: data.name,
              brand: data.brand,
              year: Number(data.year) || new Date().getFullYear(),
              purchaseDate: data.purchaseDate,
              nextReview: data.nextReview,
              center: selectedCenter,
              status: 'ativo',
            });
          }
          setIsFormVisible(false);
          setEditingEquipment(null);
        }}
        initialData={editingEquipment ? {
          name: editingEquipment.name,
          brand: editingEquipment.brand,
          year: String(editingEquipment.year),
          purchaseDate: editingEquipment.purchaseDate,
          nextReview: editingEquipment.nextReview,
          } : undefined}
      />
      <EquipmentFilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
      />
      </View>
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
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#E5F1FF',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
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
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E5F1FF',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#E9FAF0',
  },
  statusBadgeInactive: {
    backgroundColor: '#FDECEC',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#34C759',
  },
  statusTextInactive: {
    color: '#FF3B30',
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
});
