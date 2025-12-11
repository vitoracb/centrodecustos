import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import {
  LayoutDashboard,
  Tractor,
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
} from 'lucide-react-native';
import { useContext, useRef, useEffect } from 'react';
import { OrderContext } from '@/src/context/OrderContext';
import { EquipmentContext } from '@/src/context/EquipmentContext';
import { CostCenterContext } from '@/src/context/CostCenterContext';

// Componente de ícone animado para a tab bar
const AnimatedTabIcon = ({
  children,
  focused,
  badge,
}: {
  children: React.ReactNode;
  focused: boolean;
  badge?: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    if (focused) {
      // Animação de bounce quando selecionado
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        position: 'relative',
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export default function TabLayout() {
  // Usa useContext diretamente com fallback seguro para todos os contexts
  const orderContext = useContext(OrderContext);
  // Usa o length do orders para forçar re-render quando orders mudam
  const ordersLength = orderContext?.orders?.length ?? 0;
  const notificationCount = orderContext?.getUnreadNotificationsCount ? orderContext.getUnreadNotificationsCount() : 0;
  const equipmentContext = useContext(EquipmentContext);
  const costCenterContext = useContext(CostCenterContext);
  const selectedCenter = costCenterContext?.selectedCenter ?? 'valenca';

  const revisionCount = equipmentContext?.getPendingRevisionAlertsCount
    ? equipmentContext.getPendingRevisionAlertsCount(selectedCenter as any)
    : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        // Transição suave entre telas
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <LayoutDashboard size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="equipamentos"
        options={{
          title: 'Equipamentos',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused} badge={revisionCount}>
              <Tractor size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <DollarSign size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused} badge={notificationCount}>
              <ShoppingCart size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="funcionarios"
        options={{
          title: 'Funcionários',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Users size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="contratos"
        options={{
          title: 'Contratos',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <FileText size={size} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard-visual"
        options={{
          href: null, // Oculta da tab bar
          title: 'Dashboard Visual',
        }}
      />
      <Tabs.Screen
        name="dashboard-minimalista"
        options={{
          href: null, // Oculta da tab bar
          title: 'Dashboard Minimalista',
        }}
      />
      <Tabs.Screen
        name="dashboard-executivo"
        options={{
          href: null, // Oculta da tab bar
          title: 'Dashboard Executivo',
        }}
      />
      <Tabs.Screen
        name="dashboard-gamificado"
        options={{
          href: null, // Oculta da tab bar
          title: 'Dashboard Gamificado',
        }}
      />
      <Tabs.Screen
        name="dashboard-mobile"
        options={{
          href: null, // Oculta da tab bar
          title: 'Dashboard Mobile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

