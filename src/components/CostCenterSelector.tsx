import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useCostCenter, CostCenter } from '../context/CostCenterContext';

interface CostCenterOption {
  id: CostCenter;
  label: string;
}

const costCenterOptions: CostCenterOption[] = [
  { id: 'valenca', label: 'Valença' },
  { id: 'cna', label: 'CNA' },
  { id: 'cabralia', label: 'Cabrália' },
];

export const CostCenterSelector = () => {
  const { selectedCenter, setSelectedCenter } = useCostCenter();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    costCenterOptions.find((option) => option.id === selectedCenter) ??
    costCenterOptions[0];

  const handleSelect = (id: CostCenter) => {
    setSelectedCenter(id);
    setIsOpen(false);
  };

  return (
    <>
    <View style={styles.container}>
        <Text style={styles.label}>Centro de Custo</Text>
        <TouchableOpacity
          style={styles.dropdown}
          activeOpacity={0.8}
          onPress={() => setIsOpen(true)}
        >
          <Text style={styles.dropdownLabel}>{currentOption.label}</Text>
          <ChevronDown size={18} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            {costCenterOptions.map((option) => {
              const isSelected = option.id === selectedCenter;
              return (
          <TouchableOpacity
            key={option.id}
            style={[
                    styles.option,
                    isSelected && styles.optionSelected,
            ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelect(option.id)}
          >
            <Text
              style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
              );
            })}
      </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F7',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: '#E5F1FF',
  },
  optionLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: '#0A84FF',
  },
});
