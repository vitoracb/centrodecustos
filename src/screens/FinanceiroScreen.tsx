import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Plus,
  Filter,
  Edit3,
  Trash2,
  FileText,
  ChevronDown,
} from 'lucide-react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { useFinancial, Receipt, Expense, ExpenseCategory, ExpenseStatus } from '../context/FinancialContext';
import { ReceiptFormModal } from '../components/ReceiptFormModal';
import { ReceiptFilterModal, ReceiptFilters } from '../components/ReceiptFilterModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { ExpenseFilterModal, ExpenseFilters } from '../components/ExpenseFilterModal';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { ExpenseBarChart } from '../components/ExpenseBarChart';
import { ExpenseDocumentsModal } from '../components/ExpenseDocumentsModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ExpenseStatusModal } from '../components/ExpenseStatusModal';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
};

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_pagar: 'A Pagar',
  pago: 'Pago',
};

const STATUS_STYLES: Record<ExpenseStatus, { backgroundColor: string; color: string }> = {
  confirmar: { backgroundColor: '#FFF3D6', color: '#FF9500' },
  confirmado: { backgroundColor: '#E9FAF0', color: '#34C759' },
  a_pagar: { backgroundColor: '#FDECEC', color: '#FF3B30' },
  pago: { backgroundColor: '#E6FEEA', color: '#1B8A2F' },
};

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const TABS = ['Recebimentos', 'Despesas', 'Fechamento'] as const;

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};



export const FinanceiroScreen = () => {
  const params = useLocalSearchParams();
  const { selectedCenter } = useCostCenter();
  const { getReceiptsByCenter, getExpensesByCenter, addReceipt, updateReceipt, deleteReceipt, addExpense, updateExpense, deleteExpense } = useFinancial();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Recebimentos');
  const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
  const [isReceiptFilterVisible, setReceiptFilterVisible] = useState(false);
  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>({});
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isExpenseFilterVisible, setExpenseFilterVisible] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({});
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(dayjs());
  const [closureMode, setClosureMode] = useState<'mensal' | 'anual'>('mensal');
  const [expenseDocumentsModalVisible, setExpenseDocumentsModalVisible] = useState(false);
  const [selectedExpenseDocuments, setSelectedExpenseDocuments] = useState<Expense['documents']>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name?: string;
    mimeType?: string | null;
  } | null>(null);
  const [statusModalExpense, setStatusModalExpense] = useState<Expense | null>(null);

  // Ref para rastrear se já aplicamos os parâmetros
  const paramsAppliedRef = useRef(false);

  const handleStatusChange = (expense: Expense, newStatus: ExpenseStatus) => {
    // Validação: "pago" só pode ser selecionado se houver documentos
    if (newStatus === 'pago' && (!expense.documents || expense.documents.length === 0)) {
      Alert.alert(
        'Status não disponível',
        'O status "Pago" só pode ser aplicado quando há comprovante anexado à despesa.'
      );
      return;
    }

    updateExpense({
      ...expense,
      status: newStatus,
    });
  };

  // Aplica parâmetros da navegação (vindo do dashboard) - apenas uma vez
  useEffect(() => {
    if (paramsAppliedRef.current) return;
    
    const tabParam = params.tab as string | undefined;
    const monthParam = params.month as string | undefined;
    const yearParam = params.year as string | undefined;

    if (tabParam === 'Despesas') {
      setActiveTab('Despesas');
      paramsAppliedRef.current = true;
    }
    
    if (monthParam && yearParam) {
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      if (!isNaN(month) && !isNaN(year)) {
        setExpenseFilters({ month, year });
        paramsAppliedRef.current = true;
      }
    }
  }, [params.tab, params.month, params.year]);

  const allReceipts = useMemo(
    () => getReceiptsByCenter(selectedCenter),
    [getReceiptsByCenter, selectedCenter]
  );

  const allExpenses = useMemo(
    () => getExpensesByCenter(selectedCenter),
    [getExpensesByCenter, selectedCenter]
  );

  const filteredExpenses = useMemo(() => {
    let filtered = [...allExpenses];

    if (expenseFilters.month !== null && expenseFilters.month !== undefined && expenseFilters.year) {
      filtered = filtered.filter((expense) => {
        const [day, month, year] = expense.date.split('/').map(Number);
        if (!day || !month || !year) {
          const expenseDate = dayjs(expense.date, 'DD/MM/YYYY', true);
          if (!expenseDate.isValid()) return false;
          const expenseMonth = expenseDate.month();
          const expenseYear = expenseDate.year();
          return expenseMonth === expenseFilters.month && expenseYear === expenseFilters.year;
        }
        const expenseMonth = month - 1;
        return expenseMonth === expenseFilters.month && year === expenseFilters.year;
      });
    }

    return filtered.sort(
      (a, b) => {
        const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
        const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
        if (!dateA.isValid() || !dateB.isValid()) return 0;
        return dateB.valueOf() - dateA.valueOf();
      }
    );
  }, [allExpenses, expenseFilters]);

  const hasActiveExpenseFilters = useMemo(() => {
    return !!(
      expenseFilters.month !== null &&
      expenseFilters.month !== undefined &&
      expenseFilters.year
    );
  }, [expenseFilters]);

  const periodSummary = useMemo(() => {
    const selectedMonth = selectedPeriod.month();
    const selectedYear = selectedPeriod.year();

    const receiptsInPeriod = allReceipts.filter((receipt) => {
      const [day, month, year] = receipt.date.split('/').map(Number);
      if (!day || !month || !year) {
        const receiptDate = dayjs(receipt.date, 'DD/MM/YYYY', true);
        if (!receiptDate.isValid()) return false;
        if (closureMode === 'anual') {
          return receiptDate.year() === selectedYear;
        }
        return receiptDate.month() === selectedMonth && receiptDate.year() === selectedYear;
      }
      if (closureMode === 'anual') {
        return year === selectedYear;
      }
      return month - 1 === selectedMonth && year === selectedYear;
    });

    const expensesInPeriod = allExpenses.filter((expense) => {
      const [day, month, year] = expense.date.split('/').map(Number);
      if (!day || !month || !year) {
        const expenseDate = dayjs(expense.date, 'DD/MM/YYYY', true);
        if (!expenseDate.isValid()) return false;
        if (closureMode === 'anual') {
          return expenseDate.year() === selectedYear;
        }
        return expenseDate.month() === selectedMonth && expenseDate.year() === selectedYear;
      }
      if (closureMode === 'anual') {
        return year === selectedYear;
      }
      return month - 1 === selectedMonth && year === selectedYear;
    });

    const totalReceipts = receiptsInPeriod.reduce((sum, receipt) => sum + receipt.value, 0);
    const totalExpenses = expensesInPeriod.reduce((sum, expense) => sum + expense.value, 0);
    const balance = totalReceipts - totalExpenses;

    // Agrupa despesas por status
    const expensesByStatus = {
      confirmar: expensesInPeriod.filter((e) => e.status === 'confirmar' || !e.status),
      confirmado: expensesInPeriod.filter((e) => e.status === 'confirmado'),
      a_pagar: expensesInPeriod.filter((e) => e.status === 'a_pagar'),
      pago: expensesInPeriod.filter((e) => e.status === 'pago'),
    };

    const totalsByStatus = {
      confirmar: expensesByStatus.confirmar.reduce((sum, e) => sum + e.value, 0),
      confirmado: expensesByStatus.confirmado.reduce((sum, e) => sum + e.value, 0),
      a_pagar: expensesByStatus.a_pagar.reduce((sum, e) => sum + e.value, 0),
      pago: expensesByStatus.pago.reduce((sum, e) => sum + e.value, 0),
    };

    return {
      period: closureMode === 'anual' 
        ? selectedPeriod.format('YYYY')
        : selectedPeriod.format('MMMM [de] YYYY'),
      received: formatCurrency(totalReceipts),
      expenses: formatCurrency(totalExpenses),
      balance: formatCurrency(balance),
      balanceValue: balance, // Valor numérico para verificar se é positivo ou negativo
      receiptsCount: receiptsInPeriod.length,
      expensesCount: expensesInPeriod.length,
      expensesByStatus,
      totalsByStatus,
    };
  }, [allReceipts, allExpenses, selectedPeriod, closureMode]);

  const filteredReceipts = useMemo(() => {
    let filtered = [...allReceipts];

    if (receiptFilters.month !== null && receiptFilters.month !== undefined && receiptFilters.year) {
      filtered = filtered.filter((receipt) => {
        // Parse da data no formato DD/MM/YYYY
        const [day, month, year] = receipt.date.split('/').map(Number);
        if (!day || !month || !year) {
          // Fallback para dayjs se o split não funcionar
          const receiptDate = dayjs(receipt.date, 'DD/MM/YYYY', true);
          if (!receiptDate.isValid()) {
            return false;
          }
          // dayjs.month() retorna 0-11, então subtraímos 1 do mês do filtro
          // Mas espera, o filtro já está em 0-11, então comparamos diretamente
          return receiptDate.month() === receiptFilters.month && receiptDate.year() === receiptFilters.year;
        }
        // month vem como 1-12 do formato brasileiro, convertemos para 0-11
        const receiptMonth = month - 1;
        return receiptMonth === receiptFilters.month && year === receiptFilters.year;
      });
    }

    return filtered.sort(
      (a, b) => {
        const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
        const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
        if (!dateA.isValid() || !dateB.isValid()) return 0;
        return dateB.valueOf() - dateA.valueOf();
      }
    );
  }, [allReceipts, receiptFilters]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      receiptFilters.month !== null &&
      receiptFilters.month !== undefined &&
      receiptFilters.year
    );
  }, [receiptFilters]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Recebimentos':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recebimentos</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                  onPress={() => setReceiptFilterVisible(true)}
                >
                  <Filter size={16} color={hasActiveFilters ? "#FFFFFF" : "#0A84FF"} />
                </TouchableOpacity>
              </View>
            </View>
            {hasActiveFilters && (
              <Text style={styles.filterInfo}>
                {filteredReceipts.length} recebimento(s) encontrado(s)
              </Text>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEditingReceipt(null);
                setReceiptModalVisible(true);
              }}
            >
              <Plus size={18} color="#0A84FF" />
              <Text style={styles.secondaryButtonText}>Novo Recebimento</Text>
            </TouchableOpacity>
            {filteredReceipts.length > 0 ? (
              filteredReceipts.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>
                      <ArrowDownCircle size={18} color="#34C759" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{formatCurrency(item.value)}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardDate}>{item.date}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingReceipt(item);
                          setReceiptModalVisible(true);
                        }}
                      >
                        <Edit3 size={16} color="#0A84FF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Excluir recebimento',
                            'Tem certeza que deseja excluir este recebimento?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => deleteReceipt(item.id),
                              },
                            ]
                          );
                        }}
                      >
                        <Trash2 size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {item.status && (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum recebimento encontrado para os filtros aplicados.
                </Text>
              </View>
            )}
          </View>
        );
      case 'Despesas':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Despesas</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.filterButton, hasActiveExpenseFilters && styles.filterButtonActive]}
                  onPress={() => setExpenseFilterVisible(true)}
                >
                  <Filter size={16} color={hasActiveExpenseFilters ? "#FFFFFF" : "#0A84FF"} />
                </TouchableOpacity>
              </View>
            </View>
            {hasActiveExpenseFilters && (
              <Text style={styles.filterInfo}>
                {filteredExpenses.length} despesa(s) encontrada(s)
              </Text>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEditingExpense(null);
                setExpenseModalVisible(true);
              }}
            >
              <Plus size={18} color="#0A84FF" />
              <Text style={styles.secondaryButtonText}>Nova Despesa</Text>
            </TouchableOpacity>
            <ExpensePieChart expenses={filteredExpenses} />
            <ExpenseBarChart expenses={filteredExpenses} />
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => {
                    if (item.documents && item.documents.length > 0) {
                      setSelectedExpenseDocuments(item.documents);
                      setExpenseDocumentsModalVisible(true);
                    }
                  }}
                  disabled={!item.documents || item.documents.length === 0}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FDECEC' }]}>
                      <ArrowUpCircle size={18} color="#FF3B30" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{formatCurrency(item.value)}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.name}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardDate}>{item.date}</Text>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>
                            {CATEGORY_LABELS[item.category]}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingExpense(item);
                          setExpenseModalVisible(true);
                        }}
                      >
                        <Edit3 size={16} color="#0A84FF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Excluir despesa',
                            'Tem certeza que deseja excluir esta despesa?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => deleteExpense(item.id),
                              },
                            ]
                          );
                        }}
                      >
                        <Trash2 size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Status da despesa com botão para abrir modal */}
                  <View style={styles.statusContainer}>
                    <TouchableOpacity
                      style={[
                        styles.statusPill,
                        item.status && STATUS_STYLES[item.status] 
                          ? { backgroundColor: STATUS_STYLES[item.status].backgroundColor }
                          : { backgroundColor: '#FFF3D6' }
                      ]}
                      onPress={() => setStatusModalExpense(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.statusText,
                        item.status && STATUS_STYLES[item.status]
                          ? { color: STATUS_STYLES[item.status].color }
                          : { color: '#FF9500' }
                      ]}>
                        {item.status ? STATUS_LABELS[item.status] : 'A Confirmar'}
                      </Text>
                      <ChevronDown size={14} color={item.status && STATUS_STYLES[item.status] ? STATUS_STYLES[item.status].color : '#FF9500'} />
                    </TouchableOpacity>
                  </View>

                  {item.documents && item.documents.length > 0 && (
                    <View style={styles.documentsIndicator}>
                      <FileText size={14} color="#0A84FF" />
                      <Text style={styles.documentsIndicatorText}>
                        {item.documents.length} documento(s) anexado(s)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhuma despesa encontrada para os filtros aplicados.
                </Text>
              </View>
            )}
          </View>
        );
      case 'Fechamento':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fechamento de Contas</Text>
            </View>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  closureMode === 'mensal' && styles.modeButtonActive,
                ]}
                onPress={() => setClosureMode('mensal')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    closureMode === 'mensal' && styles.modeButtonTextActive,
                  ]}
                >
                  Mensal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  closureMode === 'anual' && styles.modeButtonActive,
                ]}
                onPress={() => setClosureMode('anual')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    closureMode === 'anual' && styles.modeButtonTextActive,
                  ]}
                >
                  Anual
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodNavigatorContainer}>
              {closureMode === 'mensal' ? (
                <>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Mês</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>
                        {selectedPeriod.format('MMMM')}
                      </Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.add(1, 'month'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.periodNavigatorRow}>
                    <Text style={styles.periodNavigatorLabel}>Ano</Text>
                    <View style={styles.periodNavigator}>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>←</Text>
                      </TouchableOpacity>
                      <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                      <TouchableOpacity
                        style={styles.periodNavButton}
                        onPress={() => setSelectedPeriod((prev) => prev.add(1, 'year'))}
                      >
                        <Text style={styles.periodNavButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <View style={[styles.periodNavigatorRow, { flex: 1 }]}>
                  <Text style={styles.periodNavigatorLabel}>Ano</Text>
                  <View style={styles.periodNavigator}>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedPeriod((prev) => prev.subtract(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                    <TouchableOpacity
                      style={styles.periodNavButton}
                      onPress={() => setSelectedPeriod((prev) => prev.add(1, 'year'))}
                    >
                      <Text style={styles.periodNavButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.periodInfo}>
              <Text style={styles.periodInfoText}>
                Período: {periodSummary.period}
              </Text>
              <Text style={styles.periodInfoSubtext}>
                {periodSummary.receiptsCount} recebimento(s) • {periodSummary.expensesCount} despesa(s)
              </Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Recebimentos</Text>
                <Text style={styles.summaryValue}>{periodSummary.received}</Text>
                <Text style={styles.summaryCount}>
                  {periodSummary.receiptsCount} {periodSummary.receiptsCount === 1 ? 'item' : 'itens'}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Despesas Total</Text>
                <Text style={styles.summaryValue}>{periodSummary.expenses}</Text>
                <Text style={styles.summaryCount}>
                  {periodSummary.expensesCount} {periodSummary.expensesCount === 1 ? 'item' : 'itens'}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  periodSummary.balanceValue >= 0
                    ? styles.balanceCardPositive
                    : styles.balanceCardNegative,
                ]}
              >
                <Calculator size={20} color="#FFFFFF" />
                <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>
                  {periodSummary.balance}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#E5E5EA' }]}>
                  Saldo do período
                </Text>
              </View>
            </View>

            {/* Despesas agrupadas por status */}
            <View style={styles.expensesByStatusContainer}>
              <Text style={styles.expensesByStatusTitle}>Despesas por Status</Text>
              
              {/* Confirmar */}
              {periodSummary.totalsByStatus.confirmar > 0 && (
                <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.confirmar.backgroundColor }]}>
                  <View style={styles.statusExpenseHeader}>
                    <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.confirmar.color }]}>
                      {STATUS_LABELS.confirmar}
                    </Text>
                    <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.confirmar.color }]}>
                      {formatCurrency(periodSummary.totalsByStatus.confirmar)}
                    </Text>
                  </View>
                  <Text style={styles.statusExpenseCount}>
                    {periodSummary.expensesByStatus.confirmar.length} {periodSummary.expensesByStatus.confirmar.length === 1 ? 'despesa' : 'despesas'}
                  </Text>
                </View>
              )}

              {/* Confirmado */}
              {periodSummary.totalsByStatus.confirmado > 0 && (
                <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.confirmado.backgroundColor }]}>
                  <View style={styles.statusExpenseHeader}>
                    <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.confirmado.color }]}>
                      {STATUS_LABELS.confirmado}
                    </Text>
                    <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.confirmado.color }]}>
                      {formatCurrency(periodSummary.totalsByStatus.confirmado)}
                    </Text>
                  </View>
                  <Text style={styles.statusExpenseCount}>
                    {periodSummary.expensesByStatus.confirmado.length} {periodSummary.expensesByStatus.confirmado.length === 1 ? 'despesa' : 'despesas'}
                  </Text>
                </View>
              )}

              {/* A Pagar */}
              {periodSummary.totalsByStatus.a_pagar > 0 && (
                <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.a_pagar.backgroundColor }]}>
                  <View style={styles.statusExpenseHeader}>
                    <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.a_pagar.color }]}>
                      {STATUS_LABELS.a_pagar}
                    </Text>
                    <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.a_pagar.color }]}>
                      {formatCurrency(periodSummary.totalsByStatus.a_pagar)}
                    </Text>
                  </View>
                  <Text style={styles.statusExpenseCount}>
                    {periodSummary.expensesByStatus.a_pagar.length} {periodSummary.expensesByStatus.a_pagar.length === 1 ? 'despesa' : 'despesas'}
                  </Text>
                </View>
              )}

              {/* Pago */}
              {periodSummary.totalsByStatus.pago > 0 && (
                <View style={[styles.statusExpenseCard, { backgroundColor: STATUS_STYLES.pago.backgroundColor }]}>
                  <View style={styles.statusExpenseHeader}>
                    <Text style={[styles.statusExpenseLabel, { color: STATUS_STYLES.pago.color }]}>
                      {STATUS_LABELS.pago}
                    </Text>
                    <Text style={[styles.statusExpenseValue, { color: STATUS_STYLES.pago.color }]}>
                      {formatCurrency(periodSummary.totalsByStatus.pago)}
                    </Text>
                  </View>
                  <Text style={styles.statusExpenseCount}>
                    {periodSummary.expensesByStatus.pago.length} {periodSummary.expensesByStatus.pago.length === 1 ? 'despesa' : 'despesas'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
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
            <Text style={styles.title}>Financeiro</Text>
            <Text style={styles.subtitle}>
              Controle financeiro do centro {centerLabels[selectedCenter]}
            </Text>
          </View>

          <View style={styles.tabContainer}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {renderContent()}
        </ScrollView>
      </View>
      <ReceiptFormModal
        visible={isReceiptModalVisible}
        onClose={() => {
          setReceiptModalVisible(false);
          setEditingReceipt(null);
        }}
        onSubmit={(data) => {
          if (editingReceipt) {
            updateReceipt({
              ...editingReceipt,
              name: data.name,
              date: data.date,
              value: data.value,
            });
          } else {
            addReceipt({
              name: data.name,
              date: data.date,
              value: data.value,
              center: selectedCenter,
            });
          }
          setEditingReceipt(null);
        }}
        initialData={
          editingReceipt
            ? {
                name: editingReceipt.name,
                date: editingReceipt.date,
                value: editingReceipt.value,
                id: editingReceipt.id,
              }
            : undefined
        }
      />
      <ReceiptFilterModal
        visible={isReceiptFilterVisible}
        onClose={() => setReceiptFilterVisible(false)}
        onApply={setReceiptFilters}
        initialFilters={receiptFilters}
      />
      <ExpenseFormModal
        visible={isExpenseModalVisible}
        onClose={() => {
          setExpenseModalVisible(false);
          setEditingExpense(null);
        }}
        onSubmit={(data) => {
          if (editingExpense) {
            updateExpense({
              ...editingExpense,
              name: data.name,
              category: data.category,
              date: data.date,
              value: data.value,
              documents: data.documents,
              equipmentId: data.equipmentId,
              gestaoSubcategory: data.gestaoSubcategory,
              observations: data.observations,
            });
          } else {
            addExpense({
              name: data.name,
              category: data.category,
              date: data.date,
              value: data.value,
              center: selectedCenter,
              documents: data.documents,
              equipmentId: data.equipmentId,
              gestaoSubcategory: data.gestaoSubcategory,
              observations: data.observations,
              status: 'confirmar', // Status padrão para novas despesas
            });
          }
          setEditingExpense(null);
        }}
        initialData={
          editingExpense
            ? {
                name: editingExpense.name,
                category: editingExpense.category,
                date: editingExpense.date,
                value: editingExpense.value,
                documents: editingExpense.documents || [],
                equipmentId: editingExpense.equipmentId,
                gestaoSubcategory: editingExpense.gestaoSubcategory,
                observations: editingExpense.observations,
                id: editingExpense.id,
              }
            : undefined
        }
      />
      <ExpenseFilterModal
        visible={isExpenseFilterVisible}
        onClose={() => setExpenseFilterVisible(false)}
        onApply={setExpenseFilters}
        initialFilters={expenseFilters}
      />
      <ExpenseDocumentsModal
        visible={expenseDocumentsModalVisible}
        onClose={() => {
          setExpenseDocumentsModalVisible(false);
          setSelectedExpenseDocuments([]);
        }}
        documents={selectedExpenseDocuments || []}
        onDocumentPress={(document) => {
          setExpenseDocumentsModalVisible(false);
          setPreviewFile({
            uri: document.fileUri,
            name: document.fileName,
            mimeType: document.mimeType,
          });
          setPreviewVisible(true);
        }}
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
      <ExpenseStatusModal
        visible={statusModalExpense !== null}
        onClose={() => setStatusModalExpense(null)}
        expense={statusModalExpense}
        onStatusChange={handleStatusChange}
      />
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  tabLabelActive: {
    color: '#0A84FF',
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A84FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A84FF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  filterInfo: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: -8,
    marginBottom: 8,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F9F9FB',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6C6C70',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9FAF0',
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
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  modeButtonTextActive: {
    color: '#0A84FF',
  },
  periodNavigatorContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  periodNavigatorRow: {
    flex: 1,
    gap: 8,
  },
  periodNavigatorLabel: {
    fontSize: 12,
    color: '#6C6C70',
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  periodNavButton: {
    padding: 5,
  },
  periodNavButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  periodNavValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  periodInfo: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  periodInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  periodInfoSubtext: {
    fontSize: 12,
    color: '#6C6C70',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6C6C70',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  summaryCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  balanceCardPositive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  balanceCardNegative: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  expensesByStatusContainer: {
    marginTop: 20,
    gap: 12,
  },
  expensesByStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  statusExpenseCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusExpenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusExpenseLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusExpenseValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusExpenseCount: {
    fontSize: 12,
    color: '#6C6C70',
    marginTop: 4,
  },
  documentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  documentsIndicatorText: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '600',
  },
});
