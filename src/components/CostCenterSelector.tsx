import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { ChevronDown, Plus, User, LogOut, Shield, Eye, Edit, Key, Users } from 'lucide-react-native';
import { useCostCenter } from '../context/CostCenterContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { CostCenterFormModal } from './CostCenterFormModal';
import { useRouter } from 'expo-router';

export const CostCenterSelector = () => {
  const router = useRouter();
  const { selectedCenter, setSelectedCenter, costCenters, addCostCenter } = useCostCenter();
  const { user, signOut } = useAuth();
  const { profile, isAdmin, isEditor, isViewer } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const currentOption =
    costCenters.find((option) => option.code === selectedCenter) ??
    costCenters[0];

  const handleSelect = (code: string) => {
    setSelectedCenter(code);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    setIsOpen(false);
    setIsFormModalVisible(true);
  };

  const handleFormSubmit = async (name: string, code: string) => {
    try {
      await addCostCenter(name, code);
      setIsFormModalVisible(false);
    } catch (error) {
      // O erro já foi tratado no modal
      throw error;
    }
  };

  const handleProfilePress = () => {
    setIsProfileMenuOpen(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsProfileMenuOpen(false);
            await signOut();
          },
        },
      ]
    );
  };

  const getRoleIcon = () => {
    if (isAdmin) return <Shield size={16} color="#FF3B30" />;
    if (isEditor) return <Edit size={16} color="#FF9500" />;
    if (isViewer) return <Eye size={16} color="#0A84FF" />;
    return null;
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrador';
    if (isEditor) return 'Editor';
    if (isViewer) return 'Visualizador';
    return 'Usuário';
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.selectorWrapper}>
            <Text style={styles.label}>Centro de Custo</Text>
            <TouchableOpacity
              style={styles.dropdown}
              activeOpacity={0.8}
              onPress={() => setIsOpen(true)}
            >
              <Text style={styles.dropdownLabel}>
                {currentOption?.name || 'Selecione'}
              </Text>
              <ChevronDown size={18} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={handleProfilePress}
          >
            <User size={24} color="#1C1C1E" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {costCenters.map((option) => {
                const isSelected = option.code === selectedCenter;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelect(option.code)}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Botão para adicionar novo centro de custo */}
              <TouchableOpacity
                style={styles.addOption}
                activeOpacity={0.8}
                onPress={handleAddNew}
              >
                <View style={styles.addOptionContent}>
                  <Plus size={18} color="#0A84FF" />
                  <Text style={styles.addOptionLabel}>
                    Adicionar novo centro de custo
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <CostCenterFormModal
        visible={isFormModalVisible}
        onClose={() => setIsFormModalVisible(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Modal de Perfil */}
      <Modal
        visible={isProfileMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.profileOverlay}
          activeOpacity={1}
          onPress={() => setIsProfileMenuOpen(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.userInfo}>
              <View style={styles.userIconLarge}>
                <User size={24} color="#0A84FF" />
              </View>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleContainer}>
                {getRoleIcon()}
                <Text style={styles.roleText}>{getRoleLabel()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {isAdmin && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsProfileMenuOpen(false);
                  setTimeout(() => {
                    router.push('/user-management' as any);
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Users size={20} color="#0A84FF" />
                <Text style={styles.menuItemText}>Gerenciar Usuários</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsProfileMenuOpen(false);
                setTimeout(() => {
                  router.push('/change-password' as any);
                }, 100);
              }}
              activeOpacity={0.7}
            >
              <Key size={20} color="#0A84FF" />
              <Text style={styles.menuItemText}>Alterar Senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={20} color="#FF3B30" />
              <Text style={styles.menuItemTextLogout}>Sair</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  selectorWrapper: {
    flex: 1,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  label: {
    fontSize: 13,
    color: '#6C6C70',
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F7',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    maxHeight: '70%',
  },
  scrollView: {
    maxHeight: 400,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: '#E5F1FF',
  },
  optionLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: '#0A84FF',
  },
  addOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 4,
  },
  addOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A84FF',
  },
  profileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  profileMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  userInfo: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  userIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: '#6C6C70',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  menuItemTextLogout: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
});
