import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

export const EquipmentListSkeleton = () => {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map(index => (
        <View key={index} style={styles.card}>
          <View style={styles.headerRow}>
            <SkeletonPlaceholder width="55%" height={18} />
            <SkeletonPlaceholder width={60} height={18} />
          </View>
          <SkeletonPlaceholder width="40%" height={14} style={styles.spacing} />
          <View style={styles.metaRow}>
            <SkeletonPlaceholder width="45%" height={12} />
            <SkeletonPlaceholder width="30%" height={12} />
          </View>
          <SkeletonPlaceholder width="80%" height={12} style={styles.spacing} />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacing: {
    marginTop: 6,
  },
});

