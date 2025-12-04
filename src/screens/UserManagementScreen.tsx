import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions, UserProfile } from '@/src/context/PermissionsContext';
import { supabase } from '@/src/lib/supabaseClient';
import { Users, Shield, Eye, Edit, Trash2, UserPlus, X } from 'lucide-react-native';

export default function UserManagementScreen() {
  const { isAdmin } = usePermissions();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [creating, setCreating] = useState(false);

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
      const { error} = await supabase
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

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      Alert.alert('Erro', 'Preencha email e senha');
      return;
    }

    if (newUserPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: newUserEmail,
          role: newUserRole,
          is_active: true,
        });

      if (profileError) throw profileError;

      Alert.alert('Sucesso', 'Usuário criado com sucesso!');
      setIsCreateModalVisible(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('viewer');
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar usuário');
    } finally {
      setCreating(false);
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
        <View>
          <Text style={styles.title}>Gerenciar Usuários</Text>
          <Text style={styles.subtitle}>{users.length} usuários cadastrados</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <UserPlus size={20} color="#FFFFFF" />
        </TouchableOpacity>
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

      {/* Modal de Criar Usuário */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Usuário</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <X size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@email.com"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Senha Temporária</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                value={newUserPassword}
                onChangeText={setNewUserPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>Permissão</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, newUserRole === 'viewer' && styles.roleButtonActive]}
                  onPress={() => setNewUserRole('viewer')}
                >
                  <Eye size={16} color={newUserRole === 'viewer' ? '#0A84FF' : '#6C6C70'} />
                  <Text style={[styles.roleButtonText, newUserRole === 'viewer' && styles.roleButtonTextActive]}>
                    Visualizador
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, newUserRole === 'editor' && styles.roleButtonActive]}
                  onPress={() => setNewUserRole('editor')}
                >
                  <Edit size={16} color={newUserRole === 'editor' ? '#FF9500' : '#6C6C70'} />
                  <Text style={[styles.roleButtonText, newUserRole === 'editor' && styles.roleButtonTextActive]}>
                    Editor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, newUserRole === 'admin' && styles.roleButtonActive]}
                  onPress={() => setNewUserRole('admin')}
                >
                  <Shield size={16} color={newUserRole === 'admin' ? '#FF3B30' : '#6C6C70'} />
                  <Text style={[styles.roleButtonText, newUserRole === 'admin' && styles.roleButtonTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.createButton, creating && styles.createButtonDisabled]}
                onPress={handleCreateUser}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Criar Usuário</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  roleButtonActive: {
    backgroundColor: '#E5F1FF',
    borderColor: '#0A84FF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  roleButtonTextActive: {
    color: '#0A84FF',
  },
  createButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
