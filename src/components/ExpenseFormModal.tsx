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
  ActionSheetIOS,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ExpenseCategory, ExpenseDocument, GestaoSubcategory, ExpenseSector, ExpenseDebitAdjustment } from '../context/FinancialContext';
import { useEquipment } from '../context/EquipmentContext';
import { useCostCenter } from '../context/CostCenterContext';
import { FileText, Camera, XCircle, ChevronDown, Minus } from 'lucide-react-native';
import { validateDate, validateFile, checkFileSizeAndAlert } from '../lib/validations';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
  equipamentos: 'Equipamentos',
  impostos: 'Impostos',
};

const GESTAO_SUBCATEGORY_LABELS: Record<GestaoSubcategory, string> = {
  aluguel: 'Aluguel',
  carro: 'Carro',
  salario: 'Salário',
  combustivel: 'Combustível',
  diversos: 'Diversos',
};

const SECTOR_LABELS: Record<ExpenseSector, string> = {
  now: 'Now',
  felipe_viatransportes: 'Felipe Viatransportes',
  terceirizados: 'Terceirizados',
  gestao: 'Gestão',
  ronaldo: 'Ronaldo',
  variavel: 'Variável',
  parcela_patrol_ronaldo: 'Parcela Patrol Ronaldo',
  particular: 'Particular',
  imposto: 'Impostos',
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
  isFixed?: boolean;
  sector?: ExpenseSector;
  fixedDurationMonths?: number;
  debitAdjustment?: ExpenseDebitAdjustment;
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
  const [isFixed, setIsFixed] = useState(false);
  const [sector, setSector] = useState<ExpenseSector | ''>('');
  const [sectorDropdownVisible, setSectorDropdownVisible] = useState(false);
  const [fixedDurationMonths, setFixedDurationMonths] = useState<string>('');
  const [addDebit, setAddDebit] = useState(false);
  const [debitValue, setDebitValue] = useState('');
  const [debitDescription, setDebitDescription] = useState('');
  const [isNegative, setIsNegative] = useState(false);

  const formatCurrency = (text: string, negative: boolean = false): string => {
    const numbers = text.replace(/\D/g, '');
    if (!numbers) return '';
    
    const amount = Number(numbers) / 100;
    const finalAmount = negative ? -Math.abs(amount) : Math.abs(amount);
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(finalAmount);
  };

  const handleValueChange = (text: string) => {
    const formatted = formatCurrency(text, isNegative);
    setValue(formatted);
  };

  const handleToggleNegative = () => {
    const newIsNegative = !isNegative;
    setIsNegative(newIsNegative);
    // Atualiza o valor formatado com o novo sinal
    if (value) {
      const numbers = value.replace(/\D/g, '');
      if (numbers) {
        const formatted = formatCurrency(numbers, newIsNegative);
        setValue(formatted);
      }
    }
  };

  const handleDebitValueChange = (text: string) => {
    const formatted = formatCurrency(text);
    setDebitValue(formatted);
  };

  const parseCurrency = (formattedValue: string, useNegativeState: boolean = false): number => {
    if (!formattedValue) return 0;
    const numbers = formattedValue.replace(/\D/g, '');
    if (!numbers) return 0;
    const amount = Number(numbers) / 100;
    // Detecta se o valor formatado é negativo
    // No formato brasileiro pode ser: "R$ -100,00" ou "-R$ 100,00" ou contém "−"
    const trimmed = formattedValue.trim();
    const hasNegativeSign = 
      trimmed.startsWith('-') || 
      trimmed.includes('−') || 
      trimmed.includes('R$ -') ||
      trimmed.includes('-R$');
    
    // Se o parâmetro useNegativeState for true, usa o estado isNegative
    if (useNegativeState) {
      return isNegative ? -Math.abs(amount) : Math.abs(amount);
    }
    
    return hasNegativeSign ? -Math.abs(amount) : Math.abs(amount);
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
      setIsFixed(false);
      setSector('');
      setSectorDropdownVisible(false);
      setFixedDurationMonths('');
      setIsNegative(false);
    } else {
      // Sempre inicializa com initialData se fornecido, senão usa valores padrão
      if (initialData) {
        setName(initialData.name || '');
        setCategory(initialData.category || 'manutencao');
        const parsedDate = dayjs(initialData.date, 'DD/MM/YYYY');
        setDate(parsedDate.isValid() ? parsedDate.toDate() : new Date());
        if (initialData.value !== 0) {
          // Se houver débito, o valor salvo é o valor final (base - débito)
          // Precisamos calcular o valor base para exibir no campo
          let baseValue = initialData.value;
          if (initialData.debitAdjustment && initialData.debitAdjustment.amount > 0) {
            baseValue = initialData.value + initialData.debitAdjustment.amount;
          }
          
          const formattedValue = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(baseValue);
          setValue(formattedValue);
          setIsNegative(baseValue < 0);
        } else {
          setValue('');
          setIsNegative(false);
        }
        setDocuments(initialData.documents || []);
        setSelectedEquipmentId(initialData.equipmentId || '');
        setGestaoSubcategory(initialData.gestaoSubcategory || 'aluguel');
        setObservations(initialData.observations || '');
        setIsFixed(initialData.isFixed || false);
        setSector(initialData.sector || '');
        setFixedDurationMonths(initialData.fixedDurationMonths ? String(initialData.fixedDurationMonths) : '');
        
        // Inicializa débito se houver
        if (initialData.debitAdjustment && initialData.debitAdjustment.amount > 0) {
          setAddDebit(true);
          const formattedDebit = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(initialData.debitAdjustment.amount);
          setDebitValue(formattedDebit);
          setDebitDescription(initialData.debitAdjustment.description || '');
        } else {
          setAddDebit(false);
          setDebitValue('');
          setDebitDescription('');
        }
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
        setIsFixed(false);
        setSector('');
        setAddDebit(false);
        setDebitValue('');
        setDebitDescription('');
        setIsNegative(false);
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

  const handleAddDocument = () => {
    // Mostra menu para selecionar tipo de documento
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Nota Fiscal', 'Recibo', 'Comprovante'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handlePickDocument('nota_fiscal');
          } else if (buttonIndex === 2) {
            handlePickDocument('recibo');
          } else if (buttonIndex === 3) {
            handlePickDocument('comprovante_pagamento');
          }
        }
      );
    } else {
      Alert.alert(
        'Tipo de documento',
        'Selecione o tipo de documento',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Nota Fiscal', onPress: () => handlePickDocument('nota_fiscal') },
          { text: 'Recibo', onPress: () => handlePickDocument('recibo') },
          { text: 'Comprovante', onPress: () => handlePickDocument('comprovante_pagamento') },
        ],
        { cancelable: true }
      );
    }
  };

  const handlePickPhotoFromCamera = async (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) {
      return;
    }

    if (result.assets && result.assets.length > 0) {
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

      const newDocument = {
        type,
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };

      setDocuments((prev) => [...prev, newDocument]);
    }
  };

  const handlePickPhotoFromLibrary = async (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar fotos.');
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

      const newDocument = {
        type,
        fileName: asset.fileName ?? 'Foto',
        fileUri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };

      setDocuments((prev) => [...prev, newDocument]);
    }
  };

  const handleSelectPhotoType = (type: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
    // Depois de selecionar o tipo, pergunta se é câmera ou álbum
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tirar foto', 'Escolher do álbum'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handlePickPhotoFromCamera(type);
          } else if (buttonIndex === 2) {
            handlePickPhotoFromLibrary(type);
          }
        }
      );
    } else {
      Alert.alert(
        'Selecionar foto',
        'Escolha uma opção',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tirar foto', onPress: () => handlePickPhotoFromCamera(type) },
          { text: 'Escolher do álbum', onPress: () => handlePickPhotoFromLibrary(type) },
        ],
        { cancelable: true }
      );
    }
  };

  const handleAddPhoto = () => {
    // Primeiro pergunta o tipo de documento
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Nota Fiscal', 'Recibo', 'Comprovante'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleSelectPhotoType('nota_fiscal');
          } else if (buttonIndex === 2) {
            handleSelectPhotoType('recibo');
          } else if (buttonIndex === 3) {
            handleSelectPhotoType('comprovante_pagamento');
          }
        }
      );
    } else {
      Alert.alert(
        'Tipo de documento',
        'Selecione o tipo de documento',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Nota Fiscal', onPress: () => handleSelectPhotoType('nota_fiscal') },
          { text: 'Recibo', onPress: () => handleSelectPhotoType('recibo') },
          { text: 'Comprovante', onPress: () => handleSelectPhotoType('comprovante_pagamento') },
        ],
        { cancelable: true }
      );
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
    // Permite valor zero se:
    // 1. For um valor negativo (isNegative marcado) OU
    // 2. Houver um débito/abatimento preenchido (addDebit marcado e debitValue > 0)
    const parsedValue = parseCurrency(value);
    const parsedDebit = parseCurrency(debitValue);
    const hasValidDebit = addDebit && parsedDebit > 0;
    
    if (!value || (parsedValue === 0 && !isNegative && !hasValidDebit)) {
      Alert.alert('Campo obrigatório', 'Por favor, preencha o valor da despesa (pode ser negativo ou zero se houver abatimento).');
      return;
    }
    
    // Validações específicas por categoria
    // Equipamento é obrigatório para "manutenção", "funcionário" e "equipamentos"
    // Permite "all" (Todos os equipamentos) como valor válido
    if ((category === 'manutencao' || category === 'funcionario' || category === 'equipamentos') && (!selectedEquipmentId || (selectedEquipmentId !== 'all' && selectedEquipmentId === ''))) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione um equipamento ou "Todos os equipamentos".');
      return;
    }
    // Para "terceirizados" e "diversos", o equipamento é opcional
    if (category === 'gestao' && !gestaoSubcategory) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione uma subcategoria de gestão.');
      return;
    }
    
    // Validação: se for despesa fixa, setor é obrigatório
    if (isFixed && !sector) {
      Alert.alert('Campo obrigatório', 'Por favor, selecione um setor para a despesa fixa.');
      return;
    }

    // Validação: se for despesa fixa, duração é obrigatória
    if (isFixed && !fixedDurationMonths) {
      Alert.alert('Campo obrigatório', 'Por favor, informe a duração em meses para a despesa fixa.');
      return;
    }

    // Validação: duração deve ser um número válido maior que 0
    if (isFixed && fixedDurationMonths) {
      const duration = parseInt(fixedDurationMonths, 10);
      if (isNaN(duration) || duration <= 0) {
        Alert.alert('Valor inválido', 'A duração deve ser um número maior que zero.');
        return;
      }
    }

    // Validação: se débito está marcado, valor do débito é obrigatório
    if (addDebit && !debitValue) {
      Alert.alert('Campo obrigatório', 'Por favor, informe o valor do débito.');
      return;
    }

    // Calcula valor final (valor base - débito)
    // Usa o estado isNegative para garantir que valores negativos sejam preservados
    let baseValue = parseCurrency(value, true); // Usa o estado isNegative para interpretar o valor
    
    // Se o checkbox de débito está desmarcado, garante que não há débito
    let debitAmount = 0;
    if (addDebit && debitValue) {
      debitAmount = parseCurrency(debitValue, false); // Débito sempre positivo
    }
    
    const finalValue = baseValue - debitAmount;

    // Validação: se não for negativo e tiver débito, valor final não pode ser negativo
    // EXCETO quando o valor base for zero (permite débito maior que zero para criar abatimentos)
    if (!isNegative && addDebit && finalValue < 0 && baseValue !== 0) {
      Alert.alert('Valor inválido', 'O valor do débito não pode ser maior que o valor da despesa.');
      return;
    }

    // Prepara debitAdjustment se houver débito
    // Se o checkbox está desmarcado, não deve haver debitAdjustment
    const debitAdjustment: ExpenseDebitAdjustment | undefined = addDebit && debitAmount > 0
      ? {
          amount: debitAmount,
          description: debitDescription.trim() || undefined,
        }
      : undefined;

    onSubmit({
      name: name.trim(),
      category,
      date: dayjs(date).format('DD/MM/YYYY'),
      value: finalValue, // Valor final após abatimento
      documents,
      equipmentId: (category === 'manutencao' || category === 'funcionario' || category === 'equipamentos' || (category === 'terceirizados' && selectedEquipmentId) || (category === 'diversos' && selectedEquipmentId)) 
        ? (selectedEquipmentId === 'all' ? undefined : selectedEquipmentId) 
        : undefined,
      gestaoSubcategory: category === 'gestao' ? gestaoSubcategory : undefined,
      observations: (category === 'diversos' || (category === 'gestao' && gestaoSubcategory === 'diversos')) ? observations.trim() : undefined,
      isFixed,
      sector: isFixed && sector ? sector : undefined,
      fixedDurationMonths: isFixed && fixedDurationMonths ? parseInt(fixedDurationMonths, 10) : undefined,
      debitAdjustment,
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

            {/* Dropdown de Equipamento para Manutenção, Funcionário, Terceirizados, Diversos e Equipamentos */}
            {(category === 'manutencao' || category === 'funcionario' || category === 'terceirizados' || category === 'diversos' || category === 'equipamentos') && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  Equipamento {(category === 'manutencao' || category === 'funcionario' || category === 'equipamentos') ? '*' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setEquipmentDropdownVisible(!equipmentDropdownVisible)}
                >
                  <Text style={styles.inputText}>
                    {selectedEquipmentId === 'all'
                      ? 'Todos os equipamentos'
                      : selectedEquipmentId
                      ? equipments.find((eq) => eq.id === selectedEquipmentId)?.name || 'Selecione um equipamento'
                      : 'Selecione um equipamento'}
                  </Text>
                  <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
                </TouchableOpacity>
                {equipmentDropdownVisible && (
                  <View style={styles.dropdownList}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        selectedEquipmentId === 'all' && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedEquipmentId('all');
                        setEquipmentDropdownVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedEquipmentId === 'all' && styles.dropdownItemTextSelected,
                        ]}
                      >
                        Todos os equipamentos
                      </Text>
                    </TouchableOpacity>
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
              <View style={styles.valueInputContainer}>
                <TouchableOpacity
                  style={[styles.negativeButton, isNegative && styles.negativeButtonActive]}
                  onPress={handleToggleNegative}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color={isNegative ? '#FFFFFF' : '#FF3B30'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.valueInput]}
                  value={value}
                  onChangeText={handleValueChange}
                  placeholder="R$ 0,00"
                  keyboardType="numeric"
                />
              </View>
              {isNegative && (
                <Text style={styles.negativeHint}>Valor negativo (abatimento)</Text>
              )}
            </View>

            {/* Checkbox e campos de débito */}
            <View style={styles.field}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  const newAddDebit = !addDebit;
                  setAddDebit(newAddDebit);
                  // Se desmarcar o checkbox, limpa os campos de débito
                  if (!newAddDebit) {
                    setDebitValue('');
                    setDebitDescription('');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, addDebit && styles.checkboxChecked]}>
                  {addDebit && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>Adicionar débito</Text>
                  <Text style={styles.checkboxHint}>
                    Abatimento aplicado à despesa (ex: abatimento de imposto)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Campos de débito (aparecem quando checkbox está marcado) */}
            {addDebit && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Valor do débito *</Text>
                  <TextInput
                    style={styles.input}
                    value={debitValue}
                    onChangeText={handleDebitValueChange}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Descrição do débito</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={debitDescription}
                    onChangeText={setDebitDescription}
                    placeholder="Ex: Abatimento de imposto, desconto aplicado..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            <View style={styles.field}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsFixed(!isFixed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isFixed && styles.checkboxChecked]}>
                  {isFixed && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>Despesa fixa</Text>
                  <Text style={styles.checkboxHint}>
                    Esta despesa será gerada automaticamente todo mês
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Dropdown de Setor para Despesas Fixas */}
            {isFixed && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Setor *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setSectorDropdownVisible(!sectorDropdownVisible)}
                  >
                    <Text style={styles.inputText}>
                      {sector ? SECTOR_LABELS[sector] : 'Selecione um setor'}
                    </Text>
                    <ChevronDown size={18} color="#6C6C70" style={styles.dropdownIcon} />
                  </TouchableOpacity>
                  {sectorDropdownVisible && (
                    <View style={styles.dropdownList}>
                      {(Object.keys(SECTOR_LABELS) as ExpenseSector[]).map((sec, index, array) => (
                        <TouchableOpacity
                          key={sec}
                          style={[
                            styles.dropdownItem,
                            sector === sec && styles.dropdownItemSelected,
                            index === array.length - 1 && styles.dropdownItemLast,
                          ]}
                          onPress={() => {
                            setSector(sec);
                            setSectorDropdownVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              sector === sec && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {SECTOR_LABELS[sec]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Duração (meses) *</Text>
                  <Text style={styles.hint}>
                    Número de meses que a despesa será gerada (obrigatório para despesas fixas).
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={fixedDurationMonths}
                    onChangeText={(text) => {
                      const numbers = text.replace(/\D/g, '');
                      setFixedDurationMonths(numbers);
                    }}
                    placeholder="Ex: 3, 6, 12, 24..."
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Documentos</Text>
              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleAddDocument}
                >
                  <FileText size={18} color="#0A84FF" />
                  <Text style={styles.uploadText}>Adicionar documento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleAddPhoto}
                >
                  <Camera size={18} color="#0A84FF" />
                  <Text style={styles.uploadText}>Adicionar foto</Text>
                </TouchableOpacity>
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
                  (parseCurrency(value) === 0 && !isNegative && !(addDebit && parseCurrency(debitValue) > 0)) ||
                  ((category === 'manutencao' || category === 'funcionario' || category === 'equipamentos') && (!selectedEquipmentId || (selectedEquipmentId !== 'all' && selectedEquipmentId === ''))) ||
                  (category === 'gestao' && !gestaoSubcategory) ||
                  (isFixed && !sector)) &&
                  styles.disabledButton,
              ]}
              disabled={
                !name.trim() ||
                !value ||
                (parseCurrency(value) === 0 && !isNegative && !(addDebit && parseCurrency(debitValue) > 0)) ||
                ((category === 'manutencao' || category === 'funcionario' || category === 'equipamentos') && (!selectedEquipmentId || (selectedEquipmentId !== 'all' && selectedEquipmentId === ''))) ||
                (category === 'gestao' && !gestaoSubcategory) ||
                (isFixed && !sector) ||
                (isFixed && !fixedDurationMonths)
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
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: 4,
    marginBottom: 8,
  },
  checkboxLabelContainer: {
    flex: 1,
    gap: 4,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  checkboxHint: {
    fontSize: 12,
    color: '#6C6C70',
    lineHeight: 16,
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  negativeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  negativeButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  valueInput: {
    flex: 1,
  },
  negativeHint: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
