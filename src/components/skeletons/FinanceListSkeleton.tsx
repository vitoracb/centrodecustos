import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonPlaceholder } from '../SkeletonPlaceholder';

/**
 * Skeleton para lista de transações financeiras (despesas/recebimentos)
 */
export const FinanceListSkeleton = () => {
    return (
        <View style={styles.wrapper}>
            {/* Cards de resumo */}
            <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                    <SkeletonPlaceholder width="50%" height={14} />
                    <SkeletonPlaceholder width="80%" height={28} style={styles.spacing} />
                </View>
                <View style={styles.summaryCard}>
                    <SkeletonPlaceholder width="50%" height={14} />
                    <SkeletonPlaceholder width="80%" height={28} style={styles.spacing} />
                </View>
            </View>

            {/* Lista de transações */}
            {[0, 1, 2, 3, 4].map(index => (
                <View key={index} style={styles.transactionCard}>
                    <View style={styles.transactionRow}>
                        <View style={styles.transactionLeft}>
                            <SkeletonPlaceholder width={40} height={40} borderRadius={12} />
                            <View style={styles.transactionTexts}>
                                <SkeletonPlaceholder width="70%" height={16} />
                                <SkeletonPlaceholder width="50%" height={12} style={styles.smallSpacing} />
                            </View>
                        </View>
                        <View style={styles.transactionRight}>
                            <SkeletonPlaceholder width={80} height={20} />
                            <SkeletonPlaceholder width={60} height={24} borderRadius={12} style={styles.smallSpacing} />
                        </View>
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
    summaryCards: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    spacing: {
        marginTop: 8,
    },
    smallSpacing: {
        marginTop: 4,
    },
    transactionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    transactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    transactionTexts: {
        flex: 1,
        gap: 4,
    },
    transactionRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
});
