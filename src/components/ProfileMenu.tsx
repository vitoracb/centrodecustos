import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { usePermissions } from '@/src/context/PermissionsContext';
import { User, LogOut, Shield, Eye, Edit } from 'lucide-react-native';

export function ProfileMenu() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, signOut } = useAuth();
  const { profile, isAdmin, isEditor, isViewer } = usePermissions();

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
            setMenuVisible(false);
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
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.profileIcon}>
          <User size={20} color="#0A84FF" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
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
}

const styles = StyleSheet.create({
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
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
  menuItemTextLogout: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
});
