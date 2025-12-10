/**
 * Hook para monitorar status de conexão de rede
 * 
 * Usa @react-native-community/netinfo para detectar conexão
 * e fornecer estado reativo para a UI.
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from './logger';

export interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string;
}

/**
 * Hook para monitorar status de rede
 */
export function useNetworkStatus() {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
    });

    useEffect(() => {
        // Callback para mudanças de rede
        const handleNetworkChange = (state: NetInfoState) => {
            const newStatus: NetworkStatus = {
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            };

            setStatus(newStatus);

            if (!newStatus.isConnected) {
                logger.warn('📡 Dispositivo offline');
            } else {
                logger.info('📡 Dispositivo online:', state.type);
            }
        };

        // Verifica status inicial
        NetInfo.fetch().then(handleNetworkChange);

        // Inscreve para mudanças
        const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

        return () => {
            unsubscribe();
        };
    }, []);

    const checkConnection = useCallback(async (): Promise<boolean> => {
        const state = await NetInfo.fetch();
        return state.isConnected ?? false;
    }, []);

    return {
        ...status,
        isOffline: !status.isConnected,
        checkConnection,
    };
}

/**
 * Verifica se está online (função standalone)
 */
export async function isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
}

export default useNetworkStatus;
