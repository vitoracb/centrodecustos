import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Equipment } from '../context/EquipmentContext';

interface UpdateHoursModalProps {
  visible: boolean;
  equipment: Equipment | null;
  onClose: () => void;
  onUpdate: (equipmentId: string, newHours: number, newHoursUntilRevision?: number) => void;
}

export const UpdateHoursModal = ({
  visible,
  equipment,
  onClose,
  onUpdate,
}: UpdateHoursModalProps) => {
  const [hours, setHours] = useState('');
  const [hoursUntilRevision, setHoursUntilRevision] = useState('');
  const [error, setError] = useState('');
  const [errorHoursUntilRevision, setErrorHoursUntilRevision] = useState('');

  useEffect(() => {
    if (equipment) {
      setHours(equipment.currentHours.toString());
      setHoursUntilRevision(equipment.hoursUntilRevision.toString());
      setError('');
      setErrorHoursUntilRevision('');
    }
  }, [equipment, visible]);

  const handleUpdate = () => {
    const newHours = parseFloat(hours.replace(',', '.'));
    const newHoursUntilRevisionValue = parseFloat(hoursUntilRevision.replace(',', '.'));
    
    // Validação horas atuais
    if (isNaN(newHours) || newHours < 0) {
      setError('Digite um valor válido para horas atuais');
      return;
    }
    
    if (equipment && newHours < equipment.currentHours) {
      setError('As horas não podem diminuir');
      return;
    }
    
    // Validação horas até revisão
    if (isNaN(newHoursUntilRevisionValue) || newHoursUntilRevisionValue < 0) {
      setErrorHoursUntilRevision('Digite um valor válido para horas até revisão');
      return;
    }
    
    if (equipment) {
      onUpdate(equipment.id, newHours, newHoursUntilRevisionValue);
      onClose();
    }
  };

  if (!equipment) return null;

  const hoursAdded = parseFloat(hours.replace(',', '.') || '0') - equipment.currentHours;
  const newHoursUntilRevisionValue = parseFloat(hoursUntilRevision.replace(',', '.') || '0');
  const nextRevisionHours = parseFloat(hours.replace(',', '.') || '0') + newHoursUntilRevisionValue;
  const isNearRevision = newHoursUntilRevisionValue <= 50 && newHoursUntilRevisionValue > 0;
  const isPastRevision = newHoursUntilRevisionValue <= 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Atualizar Horas</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            {/* Equipment Info */}
            <View style={styles.equipmentInfo}>
              <Text style={styles.equipmentName}>{equipment.name}</Text>
              <Text style={styles.currentHours}>
                Horas Atuais: {equipment.currentHours.toLocaleString('pt-BR')}h
              </Text>
              <Text style={styles.nextRevision}>
                Próxima Revisão: {nextRevisionHours.toLocaleString('pt-BR')}h
              </Text>
              <Text style={styles.currentHours}>
                Faltam: {equipment.hoursUntilRevision.toLocaleString('pt-BR')}h
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Horas Atuais:</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={hours}
                onChangeText={(text) => {
                  // Permite apenas números, vírgula e ponto
                  const cleaned = text.replace(/[^0-9,.]/g, '');
                  setHours(cleaned);
                  setError('');
                }}
                keyboardType="decimal-pad"
                placeholder="Ex: 1350"
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              {hoursAdded > 0 && !error && (
                <Text style={styles.addedHours}>
                  +{hoursAdded.toFixed(1).replace('.', ',')}h trabalhadas
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Horas até Próxima Revisão:</Text>
              <TextInput
                style={[styles.input, errorHoursUntilRevision ? styles.inputError : null]}
                value={hoursUntilRevision}
                onChangeText={(text) => {
                  // Permite apenas números, vírgula e ponto
                  const cleaned = text.replace(/[^0-9,.]/g, '');
                  setHoursUntilRevision(cleaned);
                  setErrorHoursUntilRevision('');
                }}
                keyboardType="decimal-pad"
                placeholder="Ex: 250"
              />
              {errorHoursUntilRevision ? <Text style={styles.errorText}>{errorHoursUntilRevision}</Text> : null}
              
              <Text style={styles.hintText}>
                Quantas horas faltam para a próxima revisão
              </Text>
            </View>

            {/* Preview de próxima revisão */}
            {!error && !errorHoursUntilRevision && hours && hoursUntilRevision && (
              <View style={[
                styles.revisionPreview,
                isPastRevision && styles.revisionPreviewError,
                isNearRevision && styles.revisionPreviewWarning,
              ]}>
                <Text style={styles.revisionPreviewLabel}>Próxima Revisão:</Text>
                <Text style={[
                  styles.revisionPreviewValue,
                  isPastRevision && styles.revisionPreviewTextError,
                  isNearRevision && styles.revisionPreviewTextWarning,
                ]}>
                  {nextRevisionHours.toLocaleString('pt-BR')}h
                </Text>
                <Text style={[
                  styles.revisionPreviewText,
                  isPastRevision && styles.revisionPreviewTextError,
                  isNearRevision && styles.revisionPreviewTextWarning,
                ]}>
                  {isPastRevision 
                    ? `⚠️ REVISÃO URGENTE!` 
                    : isNearRevision
                    ? `🔔 Faltam ${newHoursUntilRevisionValue.toFixed(0)}h para revisão`
                    : `Faltam ${newHoursUntilRevisionValue.toFixed(0)}h para revisão`
                  }
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.updateButton]} 
                onPress={handleUpdate}
                disabled={!!error || !!errorHoursUntilRevision}
              >
                <Text style={styles.updateButtonText}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  equipmentInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  currentHours: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 2,
  },
  nextRevision: {
    fontSize: 14,
    color: '#6C6C70',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
  addedHours: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 6,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: 6,
    fontStyle: 'italic',
  },
  revisionPreviewLabel: {
    fontSize: 12,
    color: '#6C6C70',
    marginBottom: 4,
  },
  revisionPreviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
    marginBottom: 4,
  },
  revisionPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E5F1FF',
    borderRadius: 8,
  },
  revisionPreviewWarning: {
    backgroundColor: '#FFF4E5',
  },
  revisionPreviewError: {
    backgroundColor: '#FFEBEE',
  },
  revisionPreviewText: {
    fontSize: 13,
    color: '#0A84FF',
    fontWeight: '600',
    textAlign: 'center',
  },
  revisionPreviewTextWarning: {
    color: '#FF9500',
  },
  revisionPreviewTextError: {
    color: '#FF3B30',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  updateButton: {
    backgroundColor: '#0A84FF',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

