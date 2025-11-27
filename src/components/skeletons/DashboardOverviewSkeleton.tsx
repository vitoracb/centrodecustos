import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

export const DashboardOverviewSkeleton = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.cardsGrid}>
        {[0, 1, 2, 3].map(index => (
          <View key={index} style={styles.card}>
            <SkeletonPlaceholder width={36} height={36} borderRadius={10} />
            <SkeletonPlaceholder width="80%" height={14} style={styles.spacing} />
            <SkeletonPlaceholder width="50%" height={22} />
            <SkeletonPlaceholder width="60%" height={12} style={styles.spacing} />
          </View>
        ))}
      </View>

      <View style={styles.sectionsRow}>
        <View style={styles.sectionCard}>
          <SkeletonPlaceholder width="40%" height={18} />
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.activityRow}>
              <SkeletonPlaceholder width={36} height={36} borderRadius={18} />
              <View style={styles.activityTexts}>
                <SkeletonPlaceholder width="70%" height={14} />
                <SkeletonPlaceholder width="50%" height={12} style={styles.spacing} />
              </View>
              <SkeletonPlaceholder width={50} height={12} />
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <SkeletonPlaceholder width="40%" height={18} />
          <View style={styles.quickGrid}>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.quickButton}>
                <SkeletonPlaceholder width={32} height={32} borderRadius={16} />
                <SkeletonPlaceholder width="60%" height={12} style={styles.spacing} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 24,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
  },
  spacing: {
    marginTop: 6,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  sectionCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityTexts: {
    flex: 1,
    gap: 6,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickButton: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
});

