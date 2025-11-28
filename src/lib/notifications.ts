/**
 * Sistema de Push Notifications
 * 
 * Envia notificações push para eventos importantes do app
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from './logger';

// Verifica se está rodando no Expo Go
// Usa verificação segura caso ExecutionEnvironment não esteja disponível
const isExpoGo = (() => {
  try {
    if (!Constants.executionEnvironment) return false;
    if (Constants.ExecutionEnvironment && Constants.ExecutionEnvironment.StoreClient) {
      return Constants.executionEnvironment === Constants.ExecutionEnvironment.StoreClient;
    }
    // Fallback: verifica se está no Expo Go pela string
    return Constants.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
})();

// Configura o comportamento das notificações quando o app está em foreground
// Nota: No Expo Go (SDK 53+), algumas funcionalidades podem ter limitações
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  // Ignora erros de configuração no Expo Go
  if (isExpoGo) {
    logger.warn('Configuração de notificações limitada no Expo Go');
  } else {
    logger.error('Erro ao configurar handler de notificações:', error);
  }
}

/**
 * Solicita permissão para enviar notificações
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Permissão de notificação não concedida');
      return false;
    }

    // Configura o canal de notificação para Android
    // Nota: No Expo Go (SDK 53+), algumas funcionalidades podem não estar disponíveis
    if (Platform.OS === 'android' && !isExpoGo) {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificações Gerais',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        logger.warn('Erro ao configurar canal de notificação Android:', error);
      }
    }

    return true;
  } catch (error) {
    logger.error('Erro ao solicitar permissão de notificação:', error);
    return false;
  }
}

/**
 * Envia uma notificação local
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      logger.warn('Não foi possível enviar notificação: permissão negada');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // null = envia imediatamente
    });

    logger.debug('Notificação enviada:', { title, body });
  } catch (error) {
    logger.error('Erro ao enviar notificação:', error);
  }
}

/**
 * Notificações específicas para eventos do app
 */
export const notificationService = {
  /**
   * Notifica sobre novo pedido
   */
  async notifyNewOrder(orderName: string, costCenter: string): Promise<void> {
    await sendLocalNotification(
      'Novo Pedido de Orçamento',
      `${orderName} - ${costCenter}`,
      {
        type: 'new_order',
        orderName,
        costCenter,
      }
    );
  },

  /**
   * Notifica sobre orçamento enviado
   */
  async notifyBudgetSent(orderName: string, costCenter: string): Promise<void> {
    await sendLocalNotification(
      'Orçamento Enviado',
      `${orderName} - ${costCenter}`,
      {
        type: 'budget_sent',
        orderName,
        costCenter,
      }
    );
  },

  /**
   * Notifica sobre novo contrato
   */
  async notifyNewContract(contractName: string, costCenter: string): Promise<void> {
    await sendLocalNotification(
      'Novo Contrato Adicionado',
      `${contractName} - ${costCenter}`,
      {
        type: 'new_contract',
        contractName,
        costCenter,
      }
    );
  },

  /**
   * Notifica sobre revisão próxima
   */
  async notifyReviewUpcoming(
    equipmentName: string,
    daysUntil: number,
    reviewDate: string
  ): Promise<void> {
    let title: string;
    let body: string;

    if (daysUntil === 0) {
      title = 'Revisão Hoje!';
      body = `${equipmentName} - Revisão agendada para hoje (${reviewDate})`;
    } else if (daysUntil === 1) {
      title = 'Revisão Amanhã';
      body = `${equipmentName} - Revisão agendada para amanhã (${reviewDate})`;
    } else {
      title = 'Revisão Próxima';
      body = `${equipmentName} - Revisão em ${daysUntil} dias (${reviewDate})`;
    }

    await sendLocalNotification(title, body, {
      type: 'review_upcoming',
      equipmentName,
      daysUntil,
      reviewDate,
    });
  },
};

/**
 * Obtém o token de push notification (para notificações remotas futuras)
 * 
 * NOTA: Push notifications remotas não funcionam no Expo Go (SDK 53+).
 * Use um development build para testar notificações push remotas.
 */
export async function getPushToken(): Promise<string | null> {
  // Push notifications remotas não estão disponíveis no Expo Go
  if (isExpoGo) {
    logger.warn('Push notifications remotas não estão disponíveis no Expo Go. Use um development build.');
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Será necessário configurar no EAS
    });

    return tokenData.data;
  } catch (error) {
    logger.error('Erro ao obter push token:', error);
    return null;
  }
}

