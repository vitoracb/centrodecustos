import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TopExpenseItemProps {
  rank: number;
  name: string;
  value: string;
  percentage: number;
}

export const TopExpenseItem: React.FC<TopExpenseItemProps> = ({
  rank,
  name,
  value,
  percentage,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rankContainer}>
          <Text style={styles.rank}>{rank}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  barContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 36,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
});
