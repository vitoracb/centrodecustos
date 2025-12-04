import React, { useState, useEffect } from 'react';
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
import { usePermissions, UserProfile } from '@/src/context/PermissionsContext';
import { supabase } from '@/src/lib/supabaseClient';
import { Users, Shield, Eye, Edit, Trash2 } from 'lucide-react-native';

export default function UserManagementScreen() {
  const { isAdmin } = usePermissions();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Sucesso', 'Permissão atualizada!');
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Sucesso', `Usuário ${!currentStatus ? 'ativado' : 'desativado'}!`);
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={20} color="#FF3B30" />;
      case 'editor':
        return <Edit size={20} color="#FF9500" />;
      case 'viewer':
        return <Eye size={20} color="#0A84FF" />;
      default:
        return <Users size={20} color="#8E8E93" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visualizador';
      default:
        return role;
    }
  };

  const showRoleOptions = (user: UserProfile) => {
    Alert.alert(
      'Alterar Permissão',
      `Usuário: ${user.email}`,
      [
        {
          text: 'Administrador',
          onPress: () => changeUserRole(user.id, 'admin'),
        },
        {
          text: 'Editor',
          onPress: () => changeUserRole(user.id, 'editor'),
        },
        {
          text: 'Visualizador',
          onPress: () => changeUserRole(user.id, 'viewer'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorized}>
          <Shield size={48} color="#8E8E93" />
          <Text style={styles.unauthorizedText}>
            Acesso restrito a administradores
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Usuários</Text>
        <Text style={styles.subtitle}>{users.length} usuários cadastrados</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.userCard, !item.is_active && styles.userCardInactive]}>
            <View style={styles.userInfo}>
              <View style={styles.roleIconContainer}>
                {getRoleIcon(item.role)}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>{getRoleLabel(item.role)}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => showRoleOptions(item)}
              >
                <Edit size={18} color="#0A84FF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleUserStatus(item.id, item.is_active)}
              >
                <Trash2 size={18} color={item.is_active ? '#FF3B30' : '#34C759'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C6C70',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userCardInactive: {
    opacity: 0.5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: '#6C6C70',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unauthorized: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  unauthorizedText: {
    fontSize: 16,
    color: '#6C6C70',
    textAlign: 'center',
  },
});
