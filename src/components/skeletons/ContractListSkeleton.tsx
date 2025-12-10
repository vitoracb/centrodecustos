import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

/**
 * Skeleton para lista de contratos
 */
export const ContractListSkeleton = () => {
    return (
        <View style={styles.wrapper}>
            {[0, 1, 2, 3, 4].map(index => (
                <View key={index} style={styles.contractCard}>
                    {/* Header */}
                    <View style={styles.contractHeader}>
                        <View style={styles.headerLeft}>
                            <SkeletonPlaceholder width={40} height={40} borderRadius={12} />
                            <View style={styles.headerTexts}>
                                <SkeletonPlaceholder width="70%" height={18} />
                                <SkeletonPlaceholder width="50%" height={12} style={styles.spacing} />
                            </View>
                        </View>
                        <SkeletonPlaceholder width={70} height={28} borderRadius={14} />
                    </View>

                    {/* Info rows */}
                    <View style={styles.infoRow}>
                        <SkeletonPlaceholder width="30%" height={14} />
                        <SkeletonPlaceholder width="40%" height={14} />
                    </View>
                    <View style={styles.infoRow}>
                        <SkeletonPlaceholder width="25%" height={14} />
                        <SkeletonPlaceholder width="35%" height={14} />
                    </View>

                    {/* Footer */}
                    <View style={styles.contractFooter}>
                        <SkeletonPlaceholder width={100} height={12} />
                        <SkeletonPlaceholder width={80} height={24} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        gap: 12,
    },
    contractCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        gap: 12,
    },
    contractHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    headerTexts: {
        flex: 1,
        gap: 4,
    },
    spacing: {
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    contractFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
});
