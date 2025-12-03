import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface GoalProgressProps {
  title: string;
  progress: number; // 0 a 100
  color: string;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({
  title,
  progress,
  color,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.percentage, { color }]}>{clampedProgress}%</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${clampedProgress}%`, backgroundColor: color }]} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  barContainer: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});
