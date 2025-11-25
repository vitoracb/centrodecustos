/**
 * Hook para verificar e enviar notificações de revisão
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useEquipment } from '@/src/context/EquipmentContext';
import { checkReviewNotifications } from '@/src/lib/reviewNotifications';
import { logger } from '@/src/lib/logger';

/**
 * Verifica notificações de revisão periodicamente
 */
export function useReviewNotifications() {
  const { equipments, loading } = useEquipment();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Não verifica se ainda está carregando
    if (loading || equipments.length === 0) return;

    // Função para verificar revisões
    const checkReviews = async () => {
      try {
        await checkReviewNotifications(equipments);
      } catch (error) {
        logger.error('Erro ao verificar revisões:', error);
      }
    };

    // Verifica imediatamente ao montar
    checkReviews();

    // Verifica quando o app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App voltou ao foreground
        checkReviews();
      }
      appState.current = nextAppState;
    });

    // Verifica a cada hora (3600000 ms)
    intervalRef.current = setInterval(() => {
      checkReviews();
    }, 3600000); // 1 hora

    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [equipments, loading]);
}

