import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComparisonRowProps {
  label: string;
  value: number;
  isPositive: boolean;
}

export const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  value,
  isPositive,
}) => {
  const arrows = isPositive 
    ? '▲'.repeat(Math.min(Math.abs(Math.floor(value / 5)), 4))
    : '▼'.repeat(Math.min(Math.abs(Math.floor(value / 5)), 4));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}:</Text>
      <View style={styles.valueContainer}>
        <Text style={[
          styles.value,
          isPositive ? styles.positive : styles.negative
        ]}>
          {isPositive ? '+' : ''}{value}%
        </Text>
        <Text style={[
          styles.arrows,
          isPositive ? styles.positive : styles.negative
        ]}>
          {arrows}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  arrows: {
    fontSize: 12,
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
});
