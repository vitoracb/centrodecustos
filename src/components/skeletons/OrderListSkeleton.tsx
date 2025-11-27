import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

export const OrderListSkeleton = () => {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map(index => (
        <View key={index} style={styles.card}>
          <SkeletonPlaceholder width="65%" height={18} />
          <SkeletonPlaceholder width="80%" height={14} style={styles.spacing} />
          <View style={styles.metaRow}>
            <SkeletonPlaceholder width="35%" height={12} />
            <SkeletonPlaceholder width="30%" height={12} />
          </View>
          <View style={styles.badgeRow}>
            <SkeletonPlaceholder width={90} height={20} borderRadius={10} />
            <SkeletonPlaceholder width={60} height={20} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  spacing: {
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

