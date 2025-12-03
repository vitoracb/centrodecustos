import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HeroCardProps {
  label: string;
  value: string;
  trend: string;
}

export const HeroCard: React.FC<HeroCardProps> = ({ label, value, trend }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.trend}>{trend}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
