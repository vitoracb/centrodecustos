/**
 * Serviço de Push Tokens
 * 
 * Gerencia o registro e remoção de push tokens no Supabase
 * para envio de notificações remotas.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';
import { logger } from './logger';

// Project ID do Expo (de app.config.js)
const EXPO_PROJECT_ID = '612e9bb2-32a9-47b9-b56f-062c769ca5c2';

// Verifica se está no Expo Go
const isExpoGo = (() => {
    try {
        if (!Constants.executionEnvironment) return false;
        return Constants.executionEnvironment === 'storeClient';
    } catch {
        return false;
    }
})();

/**
 * Obtém o push token do Expo
 */
export async function getExpoPushToken(): Promise<string | null> {
    // Push não funciona no Expo Go
    if (isExpoGo) {
        logger.warn('[Push] Push notifications não disponíveis no Expo Go');
        return null;
    }

    // Verifica se é um dispositivo físico
    if (!Device.isDevice) {
        logger.warn('[Push] Push notifications só funcionam em dispositivos físicos');
        return null;
    }

    try {
        // Solicita permissão
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            logger.warn('[Push] Permissão de notificação não concedida');
            return null;
        }

        // Configura canal para Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Notificações Gerais',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0A84FF',
            });
        }

        // Obtém o token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: EXPO_PROJECT_ID,
        });

        logger.debug('[Push] Token obtido:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        logger.error('[Push] Erro ao obter push token:', error);
        return null;
    }
}

/**
 * Registra o push token no Supabase para o usuário atual
 */
export async function registerPushToken(userId: string): Promise<boolean> {
    try {
        const token = await getExpoPushToken();
        if (!token) {
            return false;
        }

        const platform = Platform.OS as 'ios' | 'android';
        const deviceName = Device.deviceName || Device.modelName || 'Unknown Device';

        // Upsert: insere ou atualiza se já existe
        const { error } = await supabase
            .from('user_push_tokens')
            .upsert(
                {
                    user_id: userId,
                    push_token: token,
                    platform,
                    device_name: deviceName,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,push_token',
                }
            );

        if (error) {
            // Se a tabela não existe, apenas loga e continua
            if (error.code === '42P01') {
                logger.warn('[Push] Tabela user_push_tokens não existe. Execute o SQL de migração.');
                return false;
            }
            throw error;
        }

        logger.debug('[Push] Token registrado com sucesso para usuário:', userId);
        return true;
    } catch (error) {
        logger.error('[Push] Erro ao registrar push token:', error);
        return false;
    }
}

/**
 * Remove o push token do Supabase (chamado no logout)
 */
export async function unregisterPushToken(userId: string): Promise<boolean> {
    try {
        const token = await getExpoPushToken();
        if (!token) {
            return true; // Sem token = nada para remover
        }

        const { error } = await supabase
            .from('user_push_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('push_token', token);

        if (error) {
            // Se a tabela não existe, ignora
            if (error.code === '42P01') {
                return true;
            }
            throw error;
        }

        logger.debug('[Push] Token removido para usuário:', userId);
        return true;
    } catch (error) {
        logger.error('[Push] Erro ao remover push token:', error);
        return false;
    }
}

/**
 * Envia notificação push via Supabase Edge Function
 * 
 * @param type - Tipo de notificação (new_expense, budget_approved, budget_rejected)
 * @param title - Título da notificação
 * @param body - Corpo da notificação
 * @param targetRoles - Roles que devem receber (admin, editor)
 * @param data - Dados extras para deep linking
 */
export async function sendPushNotification(
    type: 'new_expense' | 'budget_approved' | 'budget_rejected' | 'new_order',
    title: string,
    body: string,
    targetRoles: ('admin' | 'editor')[] = ['admin', 'editor'],
    data?: Record<string, any>
): Promise<boolean> {
    try {
        const { error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                type,
                title,
                body,
                targetRoles,
                data: data || {},
            },
        });

        if (error) {
            // Se a função não existe, apenas loga
            logger.warn('[Push] Edge Function não disponível:', error.message);
            return false;
        }

        logger.debug('[Push] Notificação enviada:', { type, title });
        return true;
    } catch (error) {
        logger.error('[Push] Erro ao enviar notificação:', error);
        return false;
    }
}
