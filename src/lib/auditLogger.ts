/**
 * Sistema de Audit Logging para operações financeiras críticas
 */

import { supabase } from './supabaseClient';
import { logger } from './logger';

export interface AuditLogEntry {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'EXPENSE' | 'RECEIPT' | 'CONTRACT' | 'EQUIPMENT';
  entityId: string;
  costCenterId: string;
  oldValues?: any;
  newValues?: any;
  metadata?: {
    userAgent?: string;
    ip?: string;
    timestamp: string;
  };
}

/**
 * Registra uma operação crítica no log de auditoria
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const auditEntry = {
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entity,
      entity_id: entry.entityId,
      cost_center_id: entry.costCenterId,
      old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      logger.error('[AuditLog] Erro ao registrar evento:', error);
    } else {
      logger.info(`[AuditLog] ${entry.action} ${entry.entity} registrado: ${entry.entityId}`);
    }
  } catch (error) {
    logger.error('[AuditLog] Erro inesperado:', error);
  }
}

/**
 * Função helper para operações financeiras
 */
export async function logFinancialOperation(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  type: 'EXPENSE' | 'RECEIPT',
  transactionId: string,
  costCenterId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    entity: type,
    entityId: transactionId,
    costCenterId,
    oldValues: oldData,
    newValues: newData,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Função helper para operações de equipamentos
 */
export async function logEquipmentOperation(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  equipmentId: string,
  costCenterId: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    entity: 'EQUIPMENT',
    entityId: equipmentId,
    costCenterId,
    oldValues: oldData,
    newValues: newData,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Hook customizado para usar audit logging em contextos React
 */
export function useAuditLogger() {
  return {
    logFinancialOperation,
    logEquipmentOperation,
    logAuditEvent,
  };
}