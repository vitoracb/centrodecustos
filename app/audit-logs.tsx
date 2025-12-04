import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
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
            data={logs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
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
