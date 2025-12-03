import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Search, X, Tractor, Users, FileText, ChevronRight, DollarSign, ShoppingCart } from 'lucide-react-native';
import { useEquipment } from '../context/EquipmentContext';
import { useEmployees } from '../context/EmployeeContext';
import { useContracts } from '../context/ContractContext';
import { useFinancial } from '../context/FinancialContext';
import { useOrders } from '../context/OrderContext';
import { useCostCenter } from '../context/CostCenterContext';
import { useRouter } from 'expo-router';

interface SearchResult {
  type: 'equipment' | 'employee' | 'contract' | 'expense' | 'receipt' | 'order';
  id: string;
  name: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
}

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  const { documentsByCenter } = useEmployees();
  const { getContractsByCenter } = useContracts();
  const { getExpensesByCenter, getReceiptsByCenter } = useFinancial();
  const { getOrdersByCenter } = useOrders();
  const router = useRouter();

  // Debounce: aguarda 300ms após o usuário parar de digitar
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Busca nos dados
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const query = debouncedQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Buscar equipamentos
    const equipments = getEquipmentsByCenter(selectedCenter);
    equipments.forEach((eq) => {
      if (
        eq.name.toLowerCase().includes(query) ||
        eq.brand.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'equipment',
          id: eq.id,
          name: eq.name,
          subtitle: `${eq.brand} · Ano ${eq.year}`,
          icon: Tractor,
          onPress: () => {
            router.push({
              pathname: '/equipamentos/[id]' as any,
              params: {
                id: eq.id,
                name: eq.name,
                brand: eq.brand,
                year: String(eq.year),
                purchaseDate: eq.purchaseDate,
                nextReview: eq.nextReview,
                center: selectedCenter,
              },
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    // Buscar funcionários (através dos documentos)
    const centerDocs = documentsByCenter[selectedCenter] ?? {};
    Object.keys(centerDocs).forEach((equipmentId) => {
      const docs = centerDocs[equipmentId].filter((d) => !d.deletedAt);
      const uniqueEmployees = new Set(docs.map((d) => d.employee));
      
      uniqueEmployees.forEach((employeeName) => {
        if (employeeName.toLowerCase().includes(query)) {
          // Buscar o equipamento relacionado
          const equipment = equipments.find((e) => e.id === equipmentId);
          results.push({
            type: 'employee',
            id: `${equipmentId}-${employeeName}`,
            name: employeeName,
            subtitle: equipment ? `Equipamento: ${equipment.name}` : 'Funcionário',
            icon: Users,
            onPress: () => {
              router.push({
                pathname: '/funcionarios' as any,
              });
              setIsSearchVisible(false);
              setSearchQuery('');
            },
          });
        }
      });
    });

    // Buscar contratos
    const contracts = getContractsByCenter(selectedCenter);
    contracts.forEach((contract) => {
      if (contract.name.toLowerCase().includes(query)) {
        results.push({
          type: 'contract',
          id: contract.id,
          name: contract.name,
          subtitle: `Data: ${contract.date}${contract.value ? ` · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}` : ''}`,
          icon: FileText,
          onPress: () => {
            router.push({
              pathname: '/contratos' as any,
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    // Buscar despesas
    const expenses = getExpensesByCenter(selectedCenter);
    expenses.forEach((expense) => {
      if (
        expense.name.toLowerCase().includes(query) ||
        expense.observations?.toLowerCase().includes(query)
      ) {
        const categoryLabels: Record<string, string> = {
          manutencao: 'Manutenção',
          funcionario: 'Funcionário',
          gestor: 'Gestor',
          gestor: 'Gestor',
          terceirizados: 'Terceirizados',
          diversos: 'Diversos',
        };
        results.push({
          type: 'expense',
          id: expense.id,
          name: expense.name,
          subtitle: `${categoryLabels[expense.category] || expense.category} · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.value)} · ${expense.date}`,
          icon: DollarSign,
          onPress: () => {
            router.push({
              pathname: '/financeiro' as any,
              params: { tab: 'Despesas' },
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    // Buscar recebimentos
    const receipts = getReceiptsByCenter(selectedCenter);
    receipts.forEach((receipt) => {
      if (receipt.name.toLowerCase().includes(query)) {
        results.push({
          type: 'receipt',
          id: receipt.id,
          name: receipt.name,
          subtitle: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.value)} · ${receipt.date}`,
          icon: DollarSign,
          onPress: () => {
            router.push({
              pathname: '/financeiro' as any,
              params: { tab: 'Recebimentos' },
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    // Buscar pedidos
    const orders = getOrdersByCenter(selectedCenter);
    orders.forEach((order) => {
      if (
        order.name.toLowerCase().includes(query) ||
        order.description?.toLowerCase().includes(query)
      ) {
        const statusLabels: Record<string, string> = {
          orcamento_solicitado: 'Orçamento solicitado',
          orcamento_pendente: 'Orçamento pendente',
          orcamento_enviado: 'Orçamento enviado',
          orcamento_aprovado: 'Orçamento aprovado',
          orcamento_reprovado: 'Orçamento reprovado',
          em_execucao: 'Em execução',
          finalizado: 'Finalizado',
        };
        results.push({
          type: 'order',
          id: order.id,
          name: order.name,
          subtitle: `${statusLabels[order.status] || order.status} · ${order.orderDate || order.date}`,
          icon: ShoppingCart,
          onPress: () => {
            router.push({
              pathname: '/pedidos' as any,
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    return results;
  }, [debouncedQuery, selectedCenter, getEquipmentsByCenter, documentsByCenter, getContractsByCenter, getExpensesByCenter, getReceiptsByCenter, getOrdersByCenter, router]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, SearchResult[]> = {
      equipments: [],
      employees: [],
      contracts: [],
      expenses: [],
      receipts: [],
      orders: [],
    };

    searchResults.forEach((result) => {
      if (result.type === 'equipment') {
        grouped.equipments.push(result);
      } else if (result.type === 'employee') {
        grouped.employees.push(result);
      } else if (result.type === 'contract') {
        grouped.contracts.push(result);
      } else if (result.type === 'expense') {
        grouped.expenses.push(result);
      } else if (result.type === 'receipt') {
        grouped.receipts.push(result);
      } else if (result.type === 'order') {
        grouped.orders.push(result);
      }
    });

    return grouped;
  }, [searchResults]);

  const hasResults = searchResults.length > 0;
  const showResults = isSearchVisible && debouncedQuery.trim().length > 0;

  return (
    <>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => setIsSearchVisible(true)}
        activeOpacity={0.7}
      >
        <Search size={18} color="#6C6C70" />
                <Text style={styles.searchPlaceholder}>Buscar equipamentos, funcionários, contratos, despesas, recebimentos, pedidos...</Text>
      </TouchableOpacity>

      <Modal
        visible={isSearchVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsSearchVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.searchHeader}>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#6C6C70" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar..."
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                    }}
                    hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                  >
                    <X size={18} color="#6C6C70" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsSearchVisible(false);
                  setSearchQuery('');
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsContainer} keyboardShouldPersistTaps="handled">
              {showResults ? (
                hasResults ? (
                  <>
                    {groupedResults.equipments.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Equipamentos</Text>
                        {groupedResults.equipments.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#E5F1FF' }]}>
                              <result.icon size={18} color="#0A84FF" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {groupedResults.employees.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Funcionários</Text>
                        {groupedResults.employees.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#E5F1FF' }]}>
                              <result.icon size={18} color="#0A84FF" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {groupedResults.contracts.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Contratos</Text>
                        {groupedResults.contracts.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#E5F1FF' }]}>
                              <result.icon size={18} color="#0A84FF" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {groupedResults.expenses.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Despesas</Text>
                        {groupedResults.expenses.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#FFE5E5' }]}>
                              <result.icon size={18} color="#FF3B30" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {groupedResults.receipts.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Recebimentos</Text>
                        {groupedResults.receipts.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#E5F5E5' }]}>
                              <result.icon size={18} color="#34C759" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {groupedResults.orders.length > 0 && (
                      <View style={styles.resultSection}>
                        <Text style={styles.sectionTitle}>Pedidos</Text>
                        {groupedResults.orders.map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            style={styles.resultItem}
                            onPress={result.onPress}
                          >
                            <View style={[styles.resultIcon, { backgroundColor: '#FFF5E5' }]}>
                              <result.icon size={18} color="#FF9500" />
                            </View>
                            <View style={styles.resultContent}>
                              <Text style={styles.resultName}>{result.name}</Text>
                              {result.subtitle && (
                                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                              )}
                            </View>
                            <ChevronRight size={18} color="#C7C7CC" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhum resultado encontrado para "{debouncedQuery}"
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateHint}>
                    Digite para buscar equipamentos, funcionários ou contratos
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#0A84FF',
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultSection: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6C6C70',
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

