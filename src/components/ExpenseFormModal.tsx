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
  Alert,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ExpenseCategory, ExpenseDocument, GestaoSubcategory } from '../context/FinancialContext';
import { useEquipment } from '../context/EquipmentContext';
import { useCostCenter } from '../context/CostCenterContext';
import { FileText, Camera, XCircle, ChevronDown } from 'lucide-react-native';
import { validateDate, validateFile, checkFileSizeAndAlert } from '../lib/validations';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
};

const GESTAO_SUBCATEGORY_LABELS: Record<GestaoSubcategory, string> = {
  aluguel: 'Aluguel',
  carro: 'Carro',
  salario: 'Salário',
  combustivel: 'Combustível',
  diversos: 'Diversos',
};

interface ExpenseFormData {
  name: string;
  category: ExpenseCategory;
  date: string;
  value: number;
  documents: ExpenseDocument[];
  equipmentId?: string;
  gestaoSubcategory?: GestaoSubcategory;
  observations?: string;
}

interface ExpenseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: ExpenseFormData & { id?: string };
}

export const ExpenseFormModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}: ExpenseFormModalProps) => {
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  const equipments = getEquipmentsByCenter(selectedCenter);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('manutencao');
  const [date, setDate] = useState(new Date());
  const [value, setValue] = useState('');
  const [documents, setDocuments] = useState<ExpenseDocument[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [equipmentDropdownVisible, setEquipmentDropdownVisible] = useState(false);
  const [gestaoSubcategoryDropdownVisible, setGestaoSubcategoryDropdownVisible] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [gestaoSubcategory, setGestaoSubcategory] = useState<GestaoSubcategory>('aluguel');
  const [observations, setObservations] = useState('');

  const formatCurrency = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (!numbers) return '';
    
    const amount = Number(numbers) / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleValueChange = (text: string) => {
    const formatted = formatCurrency(text);
    setValue(formatted);
  };

  const parseCurrency = (formattedValue: string): number => {
    const numbers = formattedValue.replace(/\D/g, '');
    return Number(numbers) / 100;
  };

  useEffect(() => {
    if (!visible) {
      setName('');
      setCategory('manutencao');
      setDate(new Date());
      setValue('');
      setDocuments([]);
      setPickerVisible(false);
      setCategoryDropdownVisible(false);
      setEquipmentDropdownVisible(false);
      setGestaoSubcategoryDropdownVisible(false);
      setSelectedEquipmentId('');
      setGestaoSubcategory('aluguel');
      setObservations('');
    } else {
      // Sempre inicializa com initialData se fornecido, senão usa valores padrão
      if (initialData) {
        setName(initialData.name || '');
        setCategory(initialData.category || 'manutencao');
        const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
        setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
        if (initialData.value > 0) {
          const formattedValue = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(initialData.value);
          setValue(formattedValue);
        } else {
          setValue('');
        }
        setDocuments(initialData.documents || []);
        setSelectedEquipmentId(initialData.equipmentId || '');
        setGestaoSubcategory(initialData.gestaoSubcategory || 'aluguel');
        setObservations(initialData.observations || '');
      } else {
        // Valores padrão quando não há initialData
        setName('');
        setCategory('manutencao');
        setDate(new Date());
        setValue('');
        setDocuments([]);
        setSelectedEquipmentId('');
        setGestaoSubcategory('aluguel');
        setObservations('');
      }
    }
  }, [visible, initialData]);

  const handlePickDocument = async (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      
      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType,
        asset.name,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Tipo de arquivo não permitido');
        return;
      }

      setDocuments((prev) => [
        ...prev,
        {
          type,
          fileName: asset.name ?? 'Documento',
          fileUri: asset.uri,
          mimeType: asset.mimeType,
        },
      ]);
    }
  };

  const handlePickPhoto = async (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Por favor, conceda acesso à galeria de fotos para selecionar uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length) {
      const asset = result.assets[0];
      
      // Valida tamanho do arquivo (80MB)
      const isValidSize = await checkFileSizeAndAlert(asset.uri, 80);
      if (!isValidSize) {
        return;
      }

      // Valida tipo do arquivo (imagens)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/*'];
      const fileValidation = await validateFile(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.fileName,
        allowedTypes,
        80
      );

      if (!fileValidation.isValid) {
        Alert.alert('Tipo de arquivo inválido', fileValidation.errorMessage || 'Apenas imagens são permitidas');
        return;
      }

      setDocuments((prev) => [
        ...prev,
        {
          type,
          fileName: asset.fileName ?? 'Foto',
          fileUri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      ]);
    }
  };

  const handleRemoveDocument = (index: number) => {
    const document = documents[index];
    Alert.alert(
      'Excluir documento',
      `Tem certeza que deseja excluir "${document.fileName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setDocuments((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o nome da despesa.');
      return;
    }
    if (!value || parseCurrency(value) <= 0) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o valor da despesa.');
      return;
    }
    
    // Validações específicas por categoria
    if ((category === 'manutencao' || category === 'funcionario' || category === 'terceirizados') && !selectedEquipmentId) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione um equipamento.');
      return;
    }
    if (category === 'gestao' && !gestaoSubcategory) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione uma subcategoria de gestão.');
      return;
    }

    onSubmit({
      name: name.trim(),
      category,
      date: dayjs(date).format('DD/MM/YYYY'),
      value: parseCurrency(value),
      documents,
      equipmentId: (category === 'manutencao' || category === 'funcionario' || category === 'terceirizados') ? selectedEquipmentId : undefined,
      gestaoSubcategory: category === 'gestao' ? gestaoSubcategory : undefined,
      observations: (category === 'diversos' || (category === 'gestao' && gestaoSubcategory === 'diversos')) ? observations.trim() : undefined,
    });
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            setCategoryDropdownVisible(false);
            setEquipmentDropdownVisible(false);
            setGestaoSubcategoryDropdownVisible(false);
          }}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {initialData ? 'Editar Despesa' : 'Nova Despesa'}
          </Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Manutenção de equipamentos"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Categoria *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
              >
                <Text style={styles.inputText}>{CATEGORY_LABELS[category]}</Text>
                <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
              </TouchableOpacity>
              {categoryDropdownVisible && (
                <View style={styles.dropdownList}>
                  {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat, index, array) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.dropdownItem,
                        category === cat && styles.dropdownItemSelected,
                        index === array.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setCategoryDropdownVisible(false);
                        // Limpar campos condicionais ao mudar categoria
                        setSelectedEquipmentId('');
                        setGestaoSubcategory('aluguel');
                        setObservations('');
                        setEquipmentDropdownVisible(false);
                        setGestaoSubcategoryDropdownVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          category === cat && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Dropdown de Equipamento para Manutenção, Funcionário e Terceirizados */}
            {(category === 'manutencao' || category === 'funcionario' || category === 'terceirizados') && (
              <View style={styles.field}>
                <Text style={styles.label}>Equipamento *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setEquipmentDropdownVisible(!equipmentDropdownVisible)}
                >
                  <Text style={styles.inputText}>
                    {selectedEquipmentId
                      ? equipments.find((eq) => eq.id === selectedEquipmentId)?.name || 'Selecione um equipamento'
                      : 'Selecione um equipamento'}
                  </Text>
                  <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
                </TouchableOpacity>
                {equipmentDropdownVisible && (
                  <View style={styles.dropdownList}>
                    {equipments.length > 0 ? (
                      equipments.map((equipment, index, array) => (
                        <TouchableOpacity
                          key={equipment.id}
                          style={[
                            styles.dropdownItem,
                            selectedEquipmentId === equipment.id && styles.dropdownItemSelected,
                            index === array.length - 1 && styles.dropdownItemLast,
                          ]}
                          onPress={() => {
                            setSelectedEquipmentId(equipment.id);
                            setEquipmentDropdownVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedEquipmentId === equipment.id && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {equipment.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <Text style={styles.dropdownItemText}>
                          Nenhum equipamento cadastrado
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Dropdown de Subcategoria para Gestão */}
            {category === 'gestao' && (
              <View style={styles.field}>
                <Text style={styles.label}>Subcategoria *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setGestaoSubcategoryDropdownVisible(!gestaoSubcategoryDropdownVisible)}
                >
                  <Text style={styles.inputText}>{GESTAO_SUBCATEGORY_LABELS[gestaoSubcategory]}</Text>
                  <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
                </TouchableOpacity>
                {gestaoSubcategoryDropdownVisible && (
                  <View style={styles.dropdownList}>
                    {(Object.keys(GESTAO_SUBCATEGORY_LABELS) as GestaoSubcategory[]).map((subcat, index, array) => (
                      <TouchableOpacity
                        key={subcat}
                        style={[
                          styles.dropdownItem,
                          gestaoSubcategory === subcat && styles.dropdownItemSelected,
                          index === array.length - 1 && styles.dropdownItemLast,
                        ]}
                        onPress={() => {
                          setGestaoSubcategory(subcat);
                          setGestaoSubcategoryDropdownVisible(false);
                          // Limpar observações se não for "diversos"
                          if (subcat !== 'diversos') {
                            setObservations('');
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            gestaoSubcategory === subcat && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {GESTAO_SUBCATEGORY_LABELS[subcat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Campo de Observações para Gestão > Diversos */}
            {category === 'gestao' && gestaoSubcategory === 'diversos' && (
              <View style={styles.field}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={observations}
                  onChangeText={setObservations}
                  placeholder="Descreva a despesa..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Campo de Observações para Diversos */}
            {category === 'diversos' && (
              <View style={styles.field}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={observations}
                  onChangeText={setObservations}
                  placeholder="Descreva a despesa..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

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
              <Text style={styles.label}>Valor *</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={handleValueChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Documentos</Text>
              <View style={styles.documentButtonsGrid}>
                {/* Coluna Esquerda - Documentos */}
                <View style={styles.documentButtonsColumn}>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickDocument('nota_fiscal')}
                  >
                    <FileText size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Nota Fiscal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickDocument('recibo')}
                  >
                    <FileText size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Recibo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickDocument('comprovante_pagamento')}
                  >
                    <FileText size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Comprovante</Text>
                  </TouchableOpacity>
                </View>

                {/* Coluna Direita - Fotos */}
                <View style={styles.documentButtonsColumn}>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickPhoto('nota_fiscal')}
                  >
                    <Camera size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Nota Fiscal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickPhoto('recibo')}
                  >
                    <Camera size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Recibo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => handlePickPhoto('comprovante_pagamento')}
                  >
                    <Camera size={18} color="#0A84FF" />
                    <Text style={styles.documentButtonText}>Comprovante</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {documents.length > 0 && (
                <View style={styles.documentsList}>
                  {documents.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <View style={styles.documentItemContent}>
                        <FileText size={16} color="#0A84FF" />
                        <View style={styles.documentItemText}>
                          <Text style={styles.documentItemName} numberOfLines={1}>
                            {doc.fileName}
                          </Text>
                          <Text style={styles.documentItemType}>
                            {doc.type === 'nota_fiscal' 
                              ? 'Nota Fiscal' 
                              : doc.type === 'recibo' 
                              ? 'Recibo' 
                              : 'Comprovante de Pagamento'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                        <XCircle size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!name.trim() ||
                  !value ||
                  parseCurrency(value) <= 0 ||
                  ((category === 'manutencao' || category === 'funcionario' || category === 'terceirizados') && !selectedEquipmentId) ||
                  (category === 'gestao' && !gestaoSubcategory)) &&
                  styles.disabledButton,
              ]}
              disabled={
                !name.trim() ||
                !value ||
                parseCurrency(value) <= 0 ||
                ((category === 'manutencao' || category === 'funcionario' || category === 'terceirizados') && !selectedEquipmentId) ||
                (category === 'gestao' && !gestaoSubcategory)
              }
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                {initialData ? 'Salvar alterações' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>
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
  formScroll: {
    flexGrow: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  dropdownItemTextSelected: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  documentButtonsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  documentButtonsColumn: {
    flex: 1,
    gap: 10,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A84FF',
  },
  documentsList: {
    marginTop: 8,
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  documentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  documentItemText: {
    flex: 1,
  },
  documentItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  documentItemType: {
    fontSize: 11,
    color: '#6C6C70',
    marginTop: 2,
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
});
