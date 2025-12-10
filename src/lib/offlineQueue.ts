/**
 * Fila de operações offline
 * 
 * Armazena operações pendentes quando offline e sincroniza
 * automaticamente quando a conexão é restaurada.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const QUEUE_KEY = '@offline_queue';

export interface QueuedOperation {
    id: string;
    type: 'expense' | 'receipt' | 'order' | 'equipment';
    action: 'create' | 'update' | 'delete';
    payload: any;
    timestamp: string;
    retries: number;
}

/**
 * Adiciona operação à fila offline
 */
export async function enqueueOperation(
    type: QueuedOperation['type'],
    action: QueuedOperation['action'],
    payload: any
): Promise<void> {
    try {
        const queue = await getQueue();

        const operation: QueuedOperation = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            action,
            payload,
            timestamp: new Date().toISOString(),
            retries: 0,
        };

        queue.push(operation);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

        logger.info(`📦 Operação enfileirada: ${type}/${action}`, { id: operation.id });
    } catch (error) {
        logger.error('Erro ao enfileirar operação:', error);
    }
}

/**
 * Obtém a fila de operações pendentes
 */
export async function getQueue(): Promise<QueuedOperation[]> {
    try {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        logger.error('Erro ao ler fila offline:', error);
        return [];
    }
}

/**
 * Remove operação da fila
 */
export async function dequeueOperation(operationId: string): Promise<void> {
    try {
        const queue = await getQueue();
        const filtered = queue.filter(op => op.id !== operationId);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
        logger.info(`✅ Operação removida da fila: ${operationId}`);
    } catch (error) {
        logger.error('Erro ao remover operação da fila:', error);
    }
}

/**
 * Incrementa contador de retries
 */
export async function incrementRetry(operationId: string): Promise<void> {
    try {
        const queue = await getQueue();
        const updated = queue.map(op =>
            op.id === operationId ? { ...op, retries: op.retries + 1 } : op
        );
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    } catch (error) {
        logger.error('Erro ao incrementar retry:', error);
    }
}

/**
 * Limpa toda a fila
 */
export async function clearQueue(): Promise<void> {
    try {
        await AsyncStorage.removeItem(QUEUE_KEY);
        logger.info('🗑️ Fila offline limpa');
    } catch (error) {
        logger.error('Erro ao limpar fila offline:', error);
    }
}

/**
 * Retorna o número de operações pendentes
 */
export async function getPendingCount(): Promise<number> {
    const queue = await getQueue();
    return queue.length;
}

export const offlineQueue = {
    enqueue: enqueueOperation,
    dequeue: dequeueOperation,
    getQueue,
    incrementRetry,
    clearQueue,
    getPendingCount,
};

export default offlineQueue;
