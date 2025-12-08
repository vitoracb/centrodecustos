import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCostCenter } from '@/src/context/CostCenterContext';
import { usePermissions } from '@/src/context/PermissionsContext';
import { ArrowLeft, Trash2, PlusCircle, Factory } from 'lucide-react-native';
import { CostCenterFormModal } from '@/src/components/CostCenterFormModal';

export default function CostCenterManagementScreen() {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const { costCenters, loading, addCostCenter, removeCostCenter } = useCostCenter();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorized}>
          <Factory size={48} color="#8E8E93" />
          <Text style={styles.unauthorizedText}>
            Apenas administradores podem gerenciar centros de custo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteCenter = (id: string, name: string) => {
    Alert.alert(
      'Remover centro de custo',
      `Tem certeza que deseja remover o centro de custo "${name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(id);
              await removeCostCenter(id);
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível remover o centro de custo.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gerenciar Centros de Custo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.description}>
            Gerencie os centros de custo usados em todos os módulos do sistema.
          </Text>

          <TouchableOpacity
            style={styles.addPillButton}
            activeOpacity={0.8}
            onPress={() => setIsFormVisible(true)}
          >
            <PlusCircle size={22} color="#0A84FF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0A84FF" />
            <Text style={styles.loadingText}>Carregando centros de custo...</Text>
          </View>
        ) : (
          <FlatList
            data={costCenters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              costCenters.length === 0 ? styles.emptyListContent : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Nenhum centro de custo cadastrado</Text>
                <Text style={styles.emptySubtitle}>
                  Toque em "Adicionar centro de custo" para criar o primeiro.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.centerItem}>
                <View style={styles.centerInfo}>
                  <Text style={styles.centerName}>{item.name}</Text>
                  <Text style={styles.centerCode}>Código: {item.code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                  onPress={() => handleDeleteCenter(item.id, item.name)}
                  disabled={removingId === item.id}
                >
                  {removingId === item.id ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Trash2 size={18} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <CostCenterFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSubmit={addCostCenter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSpacer: {
    width: 30,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  description: {
    flex: 1,
    fontSize: 14,
    color: '#6C6C70',
  },
  addPillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0A84FF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6C6C70',
  },
  centerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  centerInfo: {
    flex: 1,
  },
  centerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  centerCode: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
  },
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  unauthorizedText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6C6C70',
    textAlign: 'center',
  },
});
