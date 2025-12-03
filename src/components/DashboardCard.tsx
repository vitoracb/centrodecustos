import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface DashboardCardProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  gradientColors: [string, string];
  onPress?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  gradientColors,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon size={24} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.value}>{value}</Text>

        {trend && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendIcon}>
              {trend.isPositive ? '↗️' : '↘️'}
            </Text>
            <Text style={[
              styles.trendText,
              trend.isPositive ? styles.trendPositive : styles.trendNegative
            ]}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Text>
          </View>
        )}

        {/* Sparkline placeholder - pode adicionar gráfico aqui */}
        <View style={styles.sparklineContainer}>
          <View style={styles.sparklinePlaceholder} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 160,
    marginHorizontal: 6,
    marginVertical: 8,
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendPositive: {
    color: '#D1FAE5',
  },
  trendNegative: {
    color: '#FEE2E2',
  },
  sparklineContainer: {
    marginTop: 12,
    height: 30,
  },
  sparklinePlaceholder: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
});
