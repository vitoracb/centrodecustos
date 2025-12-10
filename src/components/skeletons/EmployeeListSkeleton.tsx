import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

/**
 * Skeleton para lista de funcionários
 */
export const EmployeeListSkeleton = () => {
    return (
        <View style={styles.wrapper}>
            {[0, 1, 2, 3, 4, 5].map(index => (
                <View key={index} style={styles.employeeCard}>
                    {/* Avatar */}
                    <SkeletonPlaceholder width={56} height={56} borderRadius={28} />

                    {/* Info */}
                    <View style={styles.employeeInfo}>
                        <SkeletonPlaceholder width="60%" height={18} />
                        <SkeletonPlaceholder width="40%" height={14} style={styles.spacing} />
                        <SkeletonPlaceholder width="50%" height={12} style={styles.smallSpacing} />
                    </View>

                    {/* Badge/Action */}
                    <SkeletonPlaceholder width={80} height={32} borderRadius={16} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        gap: 12,
    },
    employeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        gap: 12,
    },
    employeeInfo: {
        flex: 1,
        gap: 4,
    },
    spacing: {
        marginTop: 4,
    },
    smallSpacing: {
        marginTop: 2,
    },
});
