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
import { UserPlus, Trash2, FileText, ChevronDown } from 'lucide-react-native';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const equipmentsMock = [
  { id: 'eq-1', name: 'Trator John Deere 5090E' },
  { id: 'eq-2', name: 'Colheitadeira Case IH 7150' },
  { id: 'eq-3', name: 'Caminhão Volvo VM 270' },
];

const documentsMock = [
  {
    id: 'doc-1',
    employee: 'João Silva',
    document: 'ASO - Admissional',
    date: '05/11/2024',
  },
  {
    id: 'doc-2',
    employee: 'Maria Costa',
    document: 'Treinamento NR-12',
    date: '22/10/2024',
  },
];

export const FuncionariosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const [selectedEquipment, setSelectedEquipment] = useState(equipmentsMock[0]);
  const [equipmentDropdown, setEquipmentDropdown] = useState(false);

  return (
    <View style={styles.container}>
      <CostCenterSelector />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Funcionários</Text>
          <Text style={styles.subtitle}>
            Documentos vinculados ao centro {centerLabels[selectedCenter]}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecionar Equipamento</Text>
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setEquipmentDropdown(true)}
          >
            <Text style={styles.dropdownText}>{selectedEquipment.name}</Text>
            <ChevronDown size={18} color="#1C1C1E" />
          </TouchableOpacity>
          {equipmentDropdown && (
            <View style={styles.dropdownList}>
              {equipmentsMock.map((equipment) => (
                <TouchableOpacity
                  key={equipment.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedEquipment(equipment);
                    setEquipmentDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{equipment.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Documentos dos Funcionários
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <UserPlus size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Adicionar Documento</Text>
            </TouchableOpacity>
          </View>

          {documentsMock.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <FileText size={18} color="#0A84FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{doc.document}</Text>
                  <Text style={styles.cardSubtitle}>{doc.employee}</Text>
                </View>
                <Text style={styles.cardDate}>{doc.date}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionPill}>
                  <Text style={styles.actionText}>Visualizar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton}>
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={styles.deleteText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F7',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  dropdownItemText: {
    fontSize: 14,
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5F1FF',
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
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
