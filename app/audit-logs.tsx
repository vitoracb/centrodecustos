import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabaseClient';
import { usePermissions } from '@/src/context/PermissionsContext';

interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string | null;
  user_email?: string | null;
  old_data: any | null;
  new_data: any | null;
  created_at: string;
}

export default function AuditLogsScreen() {
  const { isAdmin } = usePermissions();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<'all' | 'INSERT' | 'UPDATE' | 'DELETE'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.back();
      return;
    }

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data as AuditLog[]);
      } catch (err: any) {
        console.error('Erro ao carregar auditoria:', err);
        setError(err.message ?? 'Erro inesperado ao carregar auditoria');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isAdmin, router]);

  const renderItem = ({ item }: { item: AuditLog }) => {
    const actionLabel =
      item.action === 'INSERT' ? 'Criação' : item.action === 'UPDATE' ? 'Atualização' : 'Exclusão';

    const createdAt = new Date(item.created_at).toLocaleString('pt-BR');

    const userLabel = item.user_email || item.user_id || 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.tableName}>{item.table_name}</Text>
          <Text style={styles.action}>{actionLabel}</Text>
        </View>
        <Text style={styles.recordId}>ID: {item.record_id}</Text>
        <Text style={styles.userId}>Usuário: {userLabel}</Text>
        <Text style={styles.date}>{createdAt}</Text>
      </View>
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedTable !== 'all' && log.table_name !== selectedTable) {
      return false;
    }

    if (selectedAction !== 'all' && log.action !== selectedAction) {
      return false;
    }

    if (selectedPeriod !== 'all') {
      const created = new Date(log.created_at).getTime();
      const now = Date.now();
      const diffMs = now - created;
      const days = diffMs / (1000 * 60 * 60 * 24);

      if (selectedPeriod === '7d' && days > 7) return false;
      if (selectedPeriod === '30d' && days > 30) return false;
    }

    return true;
  });

  const tableOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todas as tabelas' },
    { value: 'financial_transactions', label: 'Financeiro' },
    { value: 'equipments', label: 'Equipamentos' },
    { value: 'orders', label: 'Pedidos' },
    { value: 'contracts', label: 'Contratos' },
    { value: 'expense_documents', label: 'Docs Despesa' },
    { value: 'contract_documents', label: 'Docs Contrato' },
    { value: 'employee_documents', label: 'Docs Funcionário' },
  ];

  const actionOptions: { value: 'all' | 'INSERT' | 'UPDATE' | 'DELETE'; label: string }[] = [
    { value: 'all', label: 'Todas ações' },
    { value: 'INSERT', label: 'Criação' },
    { value: 'UPDATE', label: 'Atualização' },
    { value: 'DELETE', label: 'Exclusão' },
  ];

  const periodOptions: { value: 'all' | '7d' | '30d'; label: string }[] = [
    { value: 'all', label: 'Todo período' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
  ];

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>{'< Voltar'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Auditoria</Text>
          <TouchableOpacity
            style={styles.filterButtonHeader}
            onPress={() => setFiltersVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterButtonHeaderText}>Filtrar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Últimas ações registradas no sistema</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A84FF" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum registro de auditoria encontrado.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Modal
        visible={filtersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFiltersVisible(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtros de Auditoria</Text>

            <Text style={styles.optionGroupTitle}>Tabela</Text>
            <View style={styles.modalOptionsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                {tableOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.filterChip,
                      selectedTable === opt.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedTable(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedTable === opt.value && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.optionGroupTitle}>Ação</Text>
            <View style={styles.modalOptionsRow}>
              {actionOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterChip,
                    selectedAction === opt.value && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedAction(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedAction === opt.value && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.optionGroupTitle}>Período</Text>
            <View style={styles.modalOptionsRow}>
              {periodOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterChip,
                    selectedPeriod === opt.value && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedPeriod(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedPeriod === opt.value && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedTable('all');
                  setSelectedAction('all');
                  setSelectedPeriod('all');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFiltersVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: '#0A84FF',
    backgroundColor: '#E5F1FF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6C6C70',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#0A84FF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  optionGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C6C70',
    marginTop: 4,
  },
  modalOptionsRow: {
    marginTop: 4,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  clearButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C6C70',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '500',
  },
  filterButtonHeader: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5F1FF',
  },
  filterButtonHeaderText: {
    fontSize: 13,
    color: '#0A84FF',
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6C6C70',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
    gap: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  action: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A84FF',
  },
  recordId: {
    fontSize: 12,
    color: '#6C6C70',
  },
  userId: {
    fontSize: 12,
    color: '#6C6C70',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
