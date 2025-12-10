/**
 * Componente OfflineBanner
 * 
 * Exibe um banner quando o dispositivo está offline.
 * Posicionado no topo da tela de forma não-intrusiva.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../lib/networkStatus';

export function OfflineBanner() {
    const { isOffline } = useNetworkStatus();
    const slideAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -60,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOffline, slideAnim]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                },
            ]}
            pointerEvents="none"
        >
            <WifiOff size={16} color="#FFFFFF" />
            <Text style={styles.text}>Sem conexão com a internet</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
        zIndex: 9999,
        backgroundColor: '#FF9500',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default OfflineBanner;
