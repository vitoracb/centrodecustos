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
import { useEmployees, EmployeeDocument } from '../context/EmployeeContext';
import { UserPlus, Trash2, FileText, ChevronDown, Edit3, Plus } from 'lucide-react-native';
import { EmployeeDocumentModal } from '../components/EmployeeDocumentModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { CostCenter } from '../context/CostCenterContext';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};


export const FuncionariosScreen = () => {
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  const { 
    documentsByCenter, 
    addEmployeeDocument, 
    updateEmployeeDocument, 
    deleteEmployeeDocument,
    deleteEmployee
  } = useEmployees();
  
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
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [addingDocumentForEmployee, setAddingDocumentForEmployee] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
    files?: Array<{
      fileUri: string;
      fileName: string;
      mimeType: string | null;
    }>;
    initialIndex?: number;
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
    const allDocs = centerDocs[selectedEquipment.id] ?? [];
    // Filtra documentos deletados
    return allDocs.filter(doc => !doc.deletedAt);
  }, [documentsByCenter, selectedCenter, selectedEquipment]);

  // Agrupa documentos por funcionário
  const documentsByEmployee = useMemo(() => {
    const grouped: Record<string, EmployeeDocument[]> = {};
    documents.forEach(doc => {
      if (!grouped[doc.employee]) {
        grouped[doc.employee] = [];
      }
      grouped[doc.employee].push(doc);
    });
    return grouped;
  }, [documents]);

  const handleDeleteDocument = (docId: string) => {
    deleteEmployeeDocument(docId);
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
              (!selectedEquipment || equipments.length === 0) && { opacity: 0.5 },
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

          {Object.keys(documentsByEmployee).length > 0 ? (
            Object.entries(documentsByEmployee).map(([employeeName, employeeDocs]) => (
              <View key={employeeName} style={styles.employeeGroup}>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeHeaderLeft}>
                    <View style={styles.iconCircle}>
                      <FileText size={18} color="#0A84FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employeeName}>{employeeName}</Text>
                      <Text style={styles.employeeDocCount}>
                        {employeeDocs.length} {employeeDocs.length === 1 ? 'documento' : 'documentos'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.employeeHeaderActions}>
                    <TouchableOpacity
                      style={styles.addDocButton}
                      onPress={() => {
                        setAddingDocumentForEmployee(employeeName);
                        setEmployeeModalVisible(true);
                      }}
                    >
                      <Plus size={16} color="#0A84FF" />
                      <Text style={styles.addDocText}>Adicionar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteEmployeeButton}
                      onPress={() => {
                        if (!selectedEquipment) return;
                        Alert.alert(
                          'Excluir funcionário',
                          `Tem certeza que deseja excluir o funcionário "${employeeName}"? Todos os documentos deste funcionário serão excluídos.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: () => deleteEmployee(employeeName, selectedEquipment.id, selectedCenter),
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                      <Text style={styles.deleteEmployeeText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {employeeDocs.map((doc) => (
                  <View key={doc.id} style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.documentName}>{doc.documentName}</Text>
                        <Text style={styles.documentDate}>{doc.date}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionPill}
                        onPress={() => {
                          // Prepara todos os documentos do funcionário para navegação
                          const allFiles = employeeDocs.map((d) => ({
                            fileUri: d.fileUri,
                            fileName: d.fileName,
                            mimeType: d.mimeType || null,
                          }));
                          const currentIndex = employeeDocs.findIndex((d) => d.id === doc.id);
                          
                          // Só passa files se houver mais de 1 documento para navegação
                          if (allFiles.length > 1) {
                            setPreviewFile({
                              uri: doc.fileUri,
                              name: doc.fileName,
                              mimeType: doc.mimeType,
                              files: allFiles,
                              initialIndex: currentIndex >= 0 ? currentIndex : 0,
                            });
                          } else {
                            // Se houver apenas 1 documento, não passa files (sem navegação)
                            setPreviewFile({
                              uri: doc.fileUri,
                              name: doc.fileName,
                              mimeType: doc.mimeType,
                            });
                          }
                          setPreviewVisible(true);
                        }}
                      >
                        <Text style={styles.actionText}>Visualizar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingDocument(doc);
                          setAddingDocumentForEmployee(null);
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
                ))}
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
          setAddingDocumentForEmployee(null);
        }}
        onSubmit={(data) => {
          if (!selectedEquipment) return;
          
          if (editingDocument) {
            updateEmployeeDocument(editingDocument.id, {
              employee: data.employeeName,
              documentName: data.documentName,
              date: data.date,
              fileName: data.fileName,
              fileUri: data.fileUri,
              mimeType: data.mimeType,
            });
          } else {
            addEmployeeDocument({
              employee: data.employeeName,
              documentName: data.documentName,
              date: data.date,
              fileName: data.fileName,
              fileUri: data.fileUri,
              mimeType: data.mimeType,
              equipmentId: selectedEquipment.id,
              center: selectedCenter,
            });
          }
          
          setEditingDocument(null);
          setAddingDocumentForEmployee(null);
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
            : addingDocumentForEmployee
            ? {
                employeeName: addingDocumentForEmployee,
                documentName: '',
                date: '',
                fileName: '',
                fileUri: '',
                mimeType: null,
              }
            : undefined
        }
        disableEmployeeName={!!addingDocumentForEmployee}
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
        files={previewFile?.files}
        initialIndex={previewFile?.initialIndex}
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
  employeeGroup: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  employeeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  employeeDocCount: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 2,
  },
  addDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
  },
  addDocText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  employeeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  deleteEmployeeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  documentCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  documentDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
});
