import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface KPICardProps {
  value: string;
  trend: {
    value: number;
    isPositive: boolean;
  };
  label: string;
}

export const KPICard: React.FC<KPICardProps> = ({ value, trend, label }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.trendContainer}>
        <Text style={styles.trendIcon}>
          {trend.isPositive ? '↗' : '↘'}
        </Text>
        <Text style={[
          styles.trendValue,
          trend.isPositive ? styles.trendPositive : styles.trendNegative
        ]}>
          {trend.isPositive ? '+' : ''}{trend.value}%
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendPositive: {
    color: '#10B981',
  },
  trendNegative: {
    color: '#EF4444',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
});
