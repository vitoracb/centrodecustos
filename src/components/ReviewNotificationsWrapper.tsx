/**
 * Wrapper component para verificar notificações de revisão
 * Precisa estar dentro do EquipmentProvider
 */

import { ReactNode } from 'react';
import { useReviewNotifications } from '@/src/hooks/useReviewNotifications';

interface ReviewNotificationsWrapperProps {
  children: ReactNode;
}

export function ReviewNotificationsWrapper({ children }: ReviewNotificationsWrapperProps) {
  // Hook verifica revisões automaticamente
  useReviewNotifications();
  
  return <>{children}</>;
}

