import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AchievementBadgeProps {
  icon: string;
  title: string;
  subtitle: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  icon,
  title,
  subtitle,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
});
