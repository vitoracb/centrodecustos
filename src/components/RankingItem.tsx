import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RankingItemProps {
  rank: number;
  name: string;
  value: string;
  percentage: number;
}

export const RankingItem: React.FC<RankingItemProps> = ({
  rank,
  name,
  value,
  percentage,
}) => {
  const getMedal = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}º`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.medal}>{getMedal(rank)}</Text>
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
  medal: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 44,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
});
