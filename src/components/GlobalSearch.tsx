import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Search, X, Tractor, Users, FileText, ChevronRight, DollarSign, ShoppingCart, Clock, TrendingUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEquipment } from '../context/EquipmentContext';
import { useEmployees } from '../context/EmployeeContext';
import { useContracts } from '../context/ContractContext';
import { useFinancial } from '../context/FinancialContext';
import { useOrders } from '../context/OrderContext';
import { useCostCenter } from '../context/CostCenterContext';
import { useRouter } from 'expo-router';

const RECENT_SEARCHES_KEY = '@global_search_recent';
const MAX_RECENT_SEARCHES = 5;
const MIN_SEARCH_CHARS = 2;

interface SearchResult {
  type: 'equipment' | 'employee' | 'contract' | 'expense' | 'receipt' | 'order';
  id: string;
  name: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  relevanceScore: number;
  matchedField: string;
}

// Função para calcular score de relevância
const calculateRelevance = (text: string, query: string): { score: number; isExact: boolean } => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) {
    return { score: 100, isExact: true }; // Match exato
  }
  if (lowerText.startsWith(lowerQuery)) {
    return { score: 80, isExact: false }; // Começa com a query
  }
  if (lowerText.includes(lowerQuery)) {
    return { score: 60, isExact: false }; // Contém a query
  }
  return { score: 0, isExact: false };
};

// Componente para destacar texto buscado
const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query || query.length < MIN_SEARCH_CHARS) {
    return <Text style={styles.resultName}>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <Text style={styles.resultName}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={index} style={styles.highlightedText}>{part}</Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
};

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { selectedCenter } = useCostCenter();
  const { getEquipmentsByCenter } = useEquipment();
  const { documentsByCenter } = useEmployees();
  const { getContractsByCenter } = useContracts();
  const { getExpensesByCenter, getReceiptsByCenter } = useFinancial();
  const { getOrdersByCenter } = useOrders();
  const router = useRouter();

  // Carregar buscas recentes
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Animação de fade nos resultados
  useEffect(() => {
    if (isSearchVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isSearchVisible]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar buscas recentes:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    if (query.length < MIN_SEARCH_CHARS) return;

    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Erro ao salvar busca recente:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Erro ao limpar buscas recentes:', error);
    }
  };

  // Debounce: aguarda 300ms após o usuário parar de digitar
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Busca nos dados
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < MIN_SEARCH_CHARS) return [];

    const query = debouncedQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Buscar equipamentos
    const equipments = getEquipmentsByCenter(selectedCenter);
    equipments.forEach((eq) => {
      const nameRelevance = calculateRelevance(eq.name, query);
      const brandRelevance = calculateRelevance(eq.brand, query);
      const maxRelevance = Math.max(nameRelevance.score, brandRelevance.score);

      if (maxRelevance > 0) {
        results.push({
          type: 'equipment',
          id: eq.id,
          name: eq.name,
          subtitle: `${eq.brand} · Ano ${eq.year}`,
          icon: Tractor,
          relevanceScore: maxRelevance,
          matchedField: nameRelevance.score >= brandRelevance.score ? 'name' : 'brand',
          onPress: () => {
            saveRecentSearch(debouncedQuery.trim());
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
        const relevance = calculateRelevance(employeeName, query);
        if (relevance.score > 0) {
          // Buscar o equipamento relacionado
          const equipment = equipments.find((e) => e.id === equipmentId);
          results.push({
            type: 'employee',
            id: `${equipmentId}-${employeeName}`,
            name: employeeName,
            subtitle: equipment ? `Equipamento: ${equipment.name}` : 'Funcionário',
            icon: Users,
            relevanceScore: relevance.score,
            matchedField: 'name',
            onPress: () => {
              saveRecentSearch(debouncedQuery.trim());
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
      const relevance = calculateRelevance(contract.name, query);
      if (relevance.score > 0) {
        results.push({
          type: 'contract',
          id: contract.id,
          name: contract.name,
          subtitle: `Data: ${contract.date}${contract.value ? ` · ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}` : ''}`,
          icon: FileText,
          relevanceScore: relevance.score,
          matchedField: 'name',
          onPress: () => {
            saveRecentSearch(debouncedQuery.trim());
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
      const nameRelevance = calculateRelevance(expense.name, query);
      const obsRelevance = expense.observations ? calculateRelevance(expense.observations, query) : { score: 0, isExact: false };
      const maxRelevance = Math.max(nameRelevance.score, obsRelevance.score);

      if (maxRelevance > 0) {
        const categoryLabels: Record<string, string> = {
          manutencao: 'Manutenção',
          funcionario: 'Funcionário',
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
          relevanceScore: maxRelevance,
          matchedField: nameRelevance.score >= obsRelevance.score ? 'name' : 'observations',
          onPress: () => {
            saveRecentSearch(debouncedQuery.trim());
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
      const relevance = calculateRelevance(receipt.name, query);
      if (relevance.score > 0) {
        results.push({
          type: 'receipt',
          id: receipt.id,
          name: receipt.name,
          subtitle: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.value)} · ${receipt.date}`,
          icon: DollarSign,
          relevanceScore: relevance.score,
          matchedField: 'name',
          onPress: () => {
            saveRecentSearch(debouncedQuery.trim());
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
      const nameRelevance = calculateRelevance(order.name, query);
      const descRelevance = order.description ? calculateRelevance(order.description, query) : { score: 0, isExact: false };
      const maxRelevance = Math.max(nameRelevance.score, descRelevance.score);

      if (maxRelevance > 0) {
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
          relevanceScore: maxRelevance,
          matchedField: nameRelevance.score >= descRelevance.score ? 'name' : 'description',
          onPress: () => {
            saveRecentSearch(debouncedQuery.trim());
            router.push({
              pathname: '/pedidos' as any,
            });
            setIsSearchVisible(false);
            setSearchQuery('');
          },
        });
      }
    });

    // Ordenar por relevância (maior score primeiro)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
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

            <Animated.ScrollView
              style={[styles.resultsContainer, { opacity: fadeAnim }]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Buscas recentes - mostrar quando não há query */}
              {!searchQuery.trim() && recentSearches.length > 0 && (
                <View style={styles.resultSection}>
                  <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>Buscas Recentes</Text>
                    <TouchableOpacity onPress={clearRecentSearches}>
                      <Text style={styles.clearRecentText}>Limpar</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((recentQuery, index) => (
                    <TouchableOpacity
                      key={`recent-${index}`}
                      style={styles.recentItem}
                      onPress={() => {
                        setSearchQuery(recentQuery);
                        setDebouncedQuery(recentQuery);
                      }}
                    >
                      <Clock size={16} color="#8E8E93" />
                      <Text style={styles.recentText}>{recentQuery}</Text>
                      <ChevronRight size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Mensagem quando está digitando menos de 2 caracteres */}
              {searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_CHARS && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateHint}>
                    Digite pelo menos {MIN_SEARCH_CHARS} caracteres para buscar
                  </Text>
                </View>
              )}

              {/* Resultados da busca */}
              {showResults && debouncedQuery.trim().length >= MIN_SEARCH_CHARS ? (
                hasResults ? (
                  <>
                    {/* Contagem de resultados */}
                    <View style={styles.resultsCount}>
                      <TrendingUp size={14} color="#8E8E93" />
                      <Text style={styles.resultsCountText}>
                        {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                      </Text>
                    </View>

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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                              <HighlightedText text={result.name} query={debouncedQuery} />
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
                    <Search size={48} color="#C7C7CC" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyStateText}>
                      Nenhum resultado encontrado para &quot;{debouncedQuery}&quot;
                    </Text>
                    <Text style={styles.emptyStateHint}>
                      Tente buscar por outro termo
                    </Text>
                  </View>
                )
              ) : (
                !searchQuery.trim() && recentSearches.length === 0 && (
                  <View style={styles.emptyState}>
                    <Search size={48} color="#C7C7CC" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyStateHint}>
                      Digite para buscar equipamentos, funcionários, contratos, despesas, recebimentos ou pedidos
                    </Text>
                  </View>
                )
              )}
            </Animated.ScrollView>
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginVertical: 8,
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
  highlightedText: {
    backgroundColor: '#FFEB3B',
    color: '#1C1C1E',
    fontWeight: '700',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#6C6C70',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
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
    marginTop: 8,
    paddingHorizontal: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
  },
  clearRecentText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  resultsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultsCountText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

