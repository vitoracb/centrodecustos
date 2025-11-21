import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useEquipment } from '../context/EquipmentContext';
import { UserPlus, Trash2, FileText, ChevronDown, Edit3 } from 'lucide-react-native';
import { EmployeeDocumentModal } from '../components/EmployeeDocumentModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { CostCenter } from '../context/CostCenterContext';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

type EmployeeDocument = {
  id: string;
  employee: string;
  documentName: string;
  date: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
};

type DocumentsByCenter = Record<CostCenter, Record<string, EmployeeDocument[]>>;

const initialDocuments: DocumentsByCenter = {
  valenca: {
    'eq-1': [
      {
        id: 'doc-1',
        employee: 'João Silva',
        documentName: 'ASO - Admissional',
        date: '05/11/2024',
        fileName: 'aso-admissional.pdf',
        fileUri: '',
      },
    ],
  },
  cna: {},
  cabralia: {},
};

export const FuncionariosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  
  // Filtra equipamentos pelo centro de custo selecionado
  const equipments = useMemo(
    () => getEquipmentsByCenter(selectedCenter),
    [selectedCenter, getEquipmentsByCenter]
  );
  
  const [selectedEquipment, setSelectedEquipment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [equipmentDropdown, setEquipmentDropdown] = useState(false);
  const [isEmployeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [documentsByCenter, setDocumentsByCenter] =
    useState<DocumentsByCenter>(initialDocuments);
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);

  // Atualiza o equipamento selecionado quando a lista muda ou o centro muda
  useEffect(() => {
    if (equipments.length > 0 && (!selectedEquipment || !equipments.find(eq => eq.id === selectedEquipment.id))) {
      setSelectedEquipment({
        id: equipments[0].id,
        name: equipments[0].name,
      });
    } else if (equipments.length === 0) {
      setSelectedEquipment(null);
    }
  }, [equipments, selectedCenter]);

  const documents = useMemo(() => {
    if (!selectedEquipment) return [];
    const centerDocs = documentsByCenter[selectedCenter] ?? {};
    return centerDocs[selectedEquipment.id] ?? [];
  }, [documentsByCenter, selectedCenter, selectedEquipment]);

  const handleDeleteDocument = (docId: string) => {
    if (!selectedEquipment) return;
    setDocumentsByCenter((prev) => {
      const centerDocs = prev[selectedCenter] ?? {};
      const equipmentDocs = centerDocs[selectedEquipment.id] ?? [];
      return {
        ...prev,
        [selectedCenter]: {
          ...centerDocs,
          [selectedEquipment.id]: equipmentDocs.filter((doc) => doc.id !== docId),
        },
      };
    });
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
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
          {equipments.length > 0 ? (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                activeOpacity={0.8}
                onPress={() => setEquipmentDropdown(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedEquipment?.name || 'Selecione um equipamento'}
                </Text>
                <ChevronDown size={18} color="#1C1C1E" />
              </TouchableOpacity>
              {equipmentDropdown && (
                <View style={styles.dropdownList}>
                  {equipments.map((equipment) => (
                    <TouchableOpacity
                      key={equipment.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedEquipment({
                          id: equipment.id,
                          name: equipment.name,
                        });
                        setEquipmentDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{equipment.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhum equipamento cadastrado para este centro de custo
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!selectedEquipment || equipments.length === 0) && styles.disabledButton,
            ]}
            onPress={() => setEmployeeModalVisible(true)}
            disabled={!selectedEquipment || equipments.length === 0}
          >
            <UserPlus size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Adicionar Funcionário</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Funcionários</Text>
          </View>

          {documents.length > 0 ? (
            documents.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <FileText size={18} color="#0A84FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{doc.employee}</Text>
                  <Text style={styles.cardSubtitle}>{doc.documentName}</Text>
                </View>
                <Text style={styles.cardDate}>{doc.date}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => {
                    setPreviewFile({
                      uri: doc.fileUri,
                      name: doc.fileName,
                      mimeType: doc.mimeType,
                    });
                    setPreviewVisible(true);
                  }}
                >
                  <Text style={styles.actionText}>Visualizar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditingDocument(doc);
                    setEmployeeModalVisible(true);
                  }}
                >
                  <Edit3 size={16} color="#0A84FF" />
                  <Text style={styles.editText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(
                      'Remover documento',
                      'Tem certeza que deseja excluir este documento?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: () => handleDeleteDocument(doc.id) },
                      ]
                    )
                  }
                >
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={styles.deleteText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nenhum documento cadastrado para este equipamento.
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      <EmployeeDocumentModal
        visible={isEmployeeModalVisible}
        onClose={() => {
          setEmployeeModalVisible(false);
          setEditingDocument(null);
        }}
        onSubmit={(data) => {
          if (!selectedEquipment) return;
          setDocumentsByCenter((prev) => {
            const centerDocs = prev[selectedCenter] ?? {};
            const equipmentDocs = centerDocs[selectedEquipment.id] ?? [];
            const updatedDocs: EmployeeDocument[] = editingDocument
              ? equipmentDocs.map((doc) =>
                  doc.id === editingDocument.id
                    ? {
                        ...doc,
                        employee: data.employeeName,
                        documentName: data.documentName,
                        date: data.date,
                        fileName: data.fileName,
                        fileUri: data.fileUri,
                        mimeType: data.mimeType,
                      }
                    : doc
                )
              : [
                  {
                    id: `doc-${Date.now()}`,
                    employee: data.employeeName,
                    documentName: data.documentName,
                    date: data.date,
                    fileName: data.fileName,
                    fileUri: data.fileUri,
                    mimeType: data.mimeType,
                  },
                  ...equipmentDocs,
                ];

            return {
              ...prev,
              [selectedCenter]: {
                ...centerDocs,
                [selectedEquipment.id]: updatedDocs,
              },
            };
          });
          setEditingDocument(null);
        }}
        initialData={
          editingDocument
            ? {
                employeeName: editingDocument.employee,
                documentName: editingDocument.documentName,
                date: editingDocument.date,
                fileName: editingDocument.fileName,
                fileUri: editingDocument.fileUri,
                mimeType: editingDocument.mimeType,
              }
            : undefined
        }
      />
      <FilePreviewModal
        visible={previewVisible}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewFile(null);
        }}
        fileUri={previewFile?.uri}
        fileName={previewFile?.name}
        mimeType={previewFile?.mimeType}
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
  buttonWrapper: {
    alignItems: 'center',
    marginBottom: 12,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
  },
});
