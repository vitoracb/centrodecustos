/**
 * Serviço de Haptics (Feedback Tátil)
 * 
 * Fornece vibração/feedback tátil para ações importantes
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { logger } from './logger';

/**
 * Tipos de feedback háptico disponíveis
 */
export type HapticType =
    | 'light'      // Ação leve (tap, seleção)
    | 'medium'     // Ação moderada (submit, confirmar)
    | 'heavy'      // Ação forte (deletar, erro)
    | 'success'    // Sucesso (salvo, enviado)
    | 'warning'    // Alerta (atenção)
    | 'error';     // Erro (falha)

/**
 * Dispara feedback háptico baseado no tipo
 */
export async function triggerHaptic(type: HapticType = 'medium'): Promise<void> {
    // Haptics não funciona na web
    if (Platform.OS === 'web') return;

    try {
        switch (type) {
            case 'light':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
            case 'medium':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
            case 'heavy':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                break;
            case 'success':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;
            case 'warning':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                break;
            case 'error':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                break;
        }
    } catch (error) {
        // Falha silenciosa - haptics é opcional
        logger.debug('[Haptics] Erro ao disparar feedback:', error);
    }
}

/**
 * Atalhos para tipos comuns
 */
export const haptics = {
    /** Feedback leve para taps e seleções */
    light: () => triggerHaptic('light'),

    /** Feedback médio para ações normais */
    medium: () => triggerHaptic('medium'),

    /** Feedback forte para ações destrutivas */
    heavy: () => triggerHaptic('heavy'),

    /** Vibração de sucesso */
    success: () => triggerHaptic('success'),

    /** Vibração de alerta */
    warning: () => triggerHaptic('warning'),

    /** Vibração de erro */
    error: () => triggerHaptic('error'),

    /** Vibração para notificação recebida */
    notification: () => triggerHaptic('success'),
};
