import * as Notifications from 'expo-notifications';
import { Equipment } from '../context/EquipmentContext';
import { logger } from './logger';

/**
 * Agenda uma notificação de revisão para um equipamento
 */
export const scheduleRevisionNotification = async (equipment: Equipment) => {
  try {
    // Notifica se faltar 50h ou menos
    if (equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔧 Revisão Próxima',
          body: `${equipment.name} precisa de revisão em ${equipment.hoursUntilRevision.toFixed(0)}h de trabalho`,
          data: { 
            equipmentId: equipment.id,
            type: 'revision',
            hoursUntilRevision: equipment.hoursUntilRevision
          },
        },
        trigger: null, // Notificação imediata
      });
      
      logger.info(`🔔 Notificação agendada: ${equipment.name} - ${equipment.hoursUntilRevision.toFixed(0)}h até revisão`);
    }
    
    // Alerta se já passou da revisão
    if (equipment.hoursUntilRevision <= 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ REVISÃO ATRASADA',
          body: `${equipment.name} precisa de revisão urgente!`,
          data: { 
            equipmentId: equipment.id,
            type: 'revision_overdue',
            hoursPastDue: Math.abs(equipment.hoursUntilRevision)
          },
        },
        trigger: null,
      });
      
      logger.warn(`⚠️ Notificação de atraso: ${equipment.name} - REVISÃO URGENTE!`);
    }
  } catch (error: any) {
    logger.error('Erro ao agendar notificação de revisão:', error);
  }
};

/**
 * Verifica todos os equipamentos e agenda notificações se necessário
 */
export const checkAllEquipmentsForRevision = async (equipments: Equipment[]) => {
  for (const equipment of equipments) {
    await scheduleRevisionNotification(equipment);
  }
};

