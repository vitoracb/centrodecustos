/**
 * Hook para enviar notificações push após eventos do app
 * 
 * Encapsula a lógica de envio de push para manter os contextos limpos.
 */

import { useCallback } from 'react';
import { sendPushNotification } from './pushTokenService';
import { logger } from './logger';

// Formata valor em moeda
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Hook que retorna funções para enviar notificações de eventos
 */
export function usePushEvents() {
    /**
     * Notifica sobre nova despesa criada
     */
    const notifyNewExpense = useCallback(async (
        expenseName: string,
        value: number,
        category: string,
        costCenter: string
    ) => {
        try {
            await sendPushNotification(
                'new_expense',
                'Nova Despesa Adicionada',
                `${expenseName} - ${formatCurrency(value)} (${category})`,
                ['admin', 'editor'],
                {
                    screen: 'financeiro',
                    tab: 'Despesas',
                    costCenter,
                }
            );
            logger.debug('[Push] Notificação de nova despesa enviada');
        } catch (error) {
            // Falha silenciosa - não deve afetar fluxo principal
            logger.warn('[Push] Erro ao notificar nova despesa:', error);
        }
    }, []);

    /**
     * Notifica sobre orçamento aprovado
     */
    const notifyBudgetApproved = useCallback(async (
        orderName: string,
        costCenter: string
    ) => {
        try {
            await sendPushNotification(
                'budget_approved',
                'Orçamento Aprovado ✅',
                `${orderName} foi aprovado`,
                ['admin', 'editor'],
                {
                    screen: 'pedidos',
                    costCenter,
                }
            );
            logger.debug('[Push] Notificação de orçamento aprovado enviada');
        } catch (error) {
            logger.warn('[Push] Erro ao notificar orçamento aprovado:', error);
        }
    }, []);

    /**
     * Notifica sobre orçamento rejeitado
     */
    const notifyBudgetRejected = useCallback(async (
        orderName: string,
        costCenter: string
    ) => {
        try {
            await sendPushNotification(
                'budget_rejected',
                'Orçamento Rejeitado ❌',
                `${orderName} foi rejeitado`,
                ['admin', 'editor'],
                {
                    screen: 'pedidos',
                    costCenter,
                }
            );
            logger.debug('[Push] Notificação de orçamento rejeitado enviada');
        } catch (error) {
            logger.warn('[Push] Erro ao notificar orçamento rejeitado:', error);
        }
    }, []);

    /**
     * Notifica sobre novo pedido criado
     */
    const notifyNewOrder = useCallback(async (
        orderName: string,
        costCenter: string
    ) => {
        try {
            await sendPushNotification(
                'new_order',
                'Novo Pedido de Orçamento',
                `${orderName} - ${costCenter}`,
                ['admin', 'editor'],
                {
                    screen: 'pedidos',
                    costCenter,
                }
            );
            logger.debug('[Push] Notificação de novo pedido enviada');
        } catch (error) {
            logger.warn('[Push] Erro ao notificar novo pedido:', error);
        }
    }, []);

    return {
        notifyNewExpense,
        notifyBudgetApproved,
        notifyBudgetRejected,
        notifyNewOrder,
    };
}

/**
 * Funções standalone para uso fora de componentes React
 */
export const pushEvents = {
    notifyNewExpense: async (
        expenseName: string,
        value: number,
        category: string,
        costCenter: string
    ) => {
        try {
            await sendPushNotification(
                'new_expense',
                'Nova Despesa Adicionada',
                `${expenseName} - ${formatCurrency(value)} (${category})`,
                ['admin', 'editor'],
                { screen: 'financeiro', tab: 'Despesas', costCenter }
            );
        } catch (error) {
            logger.warn('[Push] Erro ao notificar nova despesa:', error);
        }
    },

    notifyBudgetApproved: async (orderName: string, costCenter: string) => {
        try {
            await sendPushNotification(
                'budget_approved',
                'Orçamento Aprovado ✅',
                `${orderName} foi aprovado`,
                ['admin', 'editor'],
                { screen: 'pedidos', costCenter }
            );
        } catch (error) {
            logger.warn('[Push] Erro ao notificar orçamento aprovado:', error);
        }
    },

    notifyBudgetRejected: async (orderName: string, costCenter: string) => {
        try {
            await sendPushNotification(
                'budget_rejected',
                'Orçamento Rejeitado ❌',
                `${orderName} foi rejeitado`,
                ['admin', 'editor'],
                { screen: 'pedidos', costCenter }
            );
        } catch (error) {
            logger.warn('[Push] Erro ao notificar orçamento rejeitado:', error);
        }
    },

    notifyNewOrder: async (orderName: string, costCenter: string) => {
        try {
            await sendPushNotification(
                'new_order',
                'Novo Pedido de Orçamento',
                `${orderName} - ${costCenter}`,
                ['admin', 'editor'],
                { screen: 'pedidos', costCenter }
            );
        } catch (error) {
            logger.warn('[Push] Erro ao notificar novo pedido:', error);
        }
    },
};
