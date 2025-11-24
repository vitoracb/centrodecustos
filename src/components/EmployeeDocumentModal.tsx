import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown } from 'lucide-react-native';

interface EmployeeDocumentData {
  employeeName: string;
  documentName: string;
  date: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
  equipmentId?: string;
}

interface Equipment {
  id: string;
  name: string;
}

interface EmployeeDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeDocumentData) => void;
  initialData?: EmployeeDocumentData | null;
  equipments?: Equipment[];
  showEquipmentSelector?: boolean;
}

export const EmployeeDocumentModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  equipments = [],
  showEquipmentSelector = false,
}: EmployeeDocumentModalProps) => {
  const [employeeName, setEmployeeName] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [date, setDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [file, setFile] = useState<{
    fileName: string;
    fileUri: string;
    mimeType?: string | null;
  } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [equipmentDropdownOpen, setEquipmentDropdownOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPickerVisible(false);
      setEquipmentDropdownOpen(false);
      setSelectedEquipment(null);
      return;
    }

    // Inicializa dados do formulário
    if (initialData) {
      setEmployeeName(initialData.employeeName);
      setDocumentName(initialData.documentName);
      const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
      setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
      setFile({
        fileName: initialData.fileName,
        fileUri: initialData.fileUri,
        mimeType: initialData.mimeType,
      });
      
      // Define equipamento se houver initialData com equipmentId
      if (showEquipmentSelector && initialData.equipmentId && equipments.length > 0) {
        const equipment = equipments.find((eq) => eq.id === initialData.equipmentId);
        if (equipment) {
          setSelectedEquipment(equipment);
        }
      }
    } else {
      setEmployeeName('');
      setDocumentName('');
      setDate(new Date());
      setFile(null);
      
      // Seleciona o primeiro equipamento quando o modal abre sem initialData
      if (showEquipmentSelector && equipments.length > 0) {
        setSelectedEquipment(equipments[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setFile({
        fileName: asset.name ?? 'Documento',
        fileUri: asset.uri,
        mimeType: asset.mimeType,
      });
    }
  };

  const handlePickFromAlbum = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length) {
      const asset = result.assets[0];
      setFile({
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const handleSave = () => {
    if (!employeeName.trim() || !documentName.trim() || !file) return;
    if (showEquipmentSelector && !selectedEquipment) return;
    onSubmit({
      employeeName: employeeName.trim(),
      documentName: documentName.trim(),
      date: dayjs(date).format('DD/MM/YYYY'),
      fileName: file.fileName,
      fileUri: file.fileUri,
      mimeType: file.mimeType,
      equipmentId: selectedEquipment?.id,
    });
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {initialData ? 'Editar Funcionário' : 'Adicionar Funcionário'}
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {showEquipmentSelector && equipments.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>Equipamento *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  activeOpacity={0.8}
                  onPress={() => setEquipmentDropdownOpen(!equipmentDropdownOpen)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedEquipment ? selectedEquipment.name : 'Selecione um equipamento'}
                  </Text>
                  <ChevronDown size={18} color="#6C6C70" />
                </TouchableOpacity>
                {equipmentDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {equipments.map((equipment) => (
                      <TouchableOpacity
                        key={equipment.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedEquipment(equipment);
                          setEquipmentDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{equipment.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Nome do funcionário *</Text>
              <TextInput
                style={styles.input}
                value={employeeName}
                onChangeText={setEmployeeName}
                placeholder="Ex: João Silva"
              />
            </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nome do documento *</Text>
            <TextInput
              style={styles.input}
              value={documentName}
              onChangeText={setDocumentName}
              placeholder="Ex: ASO Admissional"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.inputText}>{dayjs(date).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Documento</Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument}>
                <Text style={styles.uploadText}>Selecionar PDF/Doc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, styles.secondaryUploadButton]}
                onPress={handlePickFromAlbum}
              >
                <Text style={[styles.uploadText, styles.secondaryUploadText]}>
                  Selecionar foto
                </Text>
              </TouchableOpacity>
            </View>
            {file ? (
              <Text style={styles.selectedFile}>Arquivo selecionado: {file.fileName}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!employeeName.trim() || !documentName.trim() || !file || (showEquipmentSelector && !selectedEquipment)) &&
                  styles.disabledButton,
              ]}
              disabled={!employeeName.trim() || !documentName.trim() || !file || (showEquipmentSelector && !selectedEquipment)}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {initialData ? 'Salvar alterações' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {pickerVisible && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={date}
              onChange={(_, selectedDate) => {
                setPickerVisible(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlay: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 16,
    maxHeight: '90%',
  },
  scrollContent: {
    maxHeight: 500,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F5F5F7',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  uploadButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flex: 1,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  secondaryUploadButton: {
    borderColor: '#E5E5EA',
  },
  secondaryUploadText: {
    color: '#1C1C1E',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectedFile: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
  },
  disabledButton: {
    backgroundColor: '#A5C9FF',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledText: {
    color: '#8E8E93',
  },
});

