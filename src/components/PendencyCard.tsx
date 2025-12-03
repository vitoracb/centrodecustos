import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PendencyCardProps {
  icon: string;
  count: number;
  label: string;
}

export const PendencyCard: React.FC<PendencyCardProps> = ({
  icon,
  count,
  label,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
  },
});
