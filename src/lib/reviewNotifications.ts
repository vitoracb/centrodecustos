/**
 * Sistema de Notificações de Revisão
 * 
 * Verifica periodicamente as datas de revisão dos equipamentos
 * e envia notificações quando faltar 7 dias, 1 dia ou no dia da revisão
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { logger } from './logger';
import { notificationService } from './notifications';

dayjs.extend(customParseFormat);

interface Equipment {
  id: string;
  name: string;
  nextReview: string; // 'DD/MM/YYYY' ou ''
  status: 'ativo' | 'inativo';
}

interface NotificationRecord {
  equipmentId: string;
  reviewDate: string;
  daysUntil: number;
  notifiedAt: string; // ISO date
}

const STORAGE_KEY = '@review_notifications';
const NOTIFICATION_INTERVALS = [7, 1, 0]; // 7 dias, 1 dia, no dia

/**
 * Converte data BR (DD/MM/YYYY) para objeto Date
 */
function parseBrDate(dateStr: string): dayjs.Dayjs | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parsed = dayjs(dateStr, 'DD/MM/YYYY', true);
  return parsed.isValid() ? parsed : null;
}

/**
 * Calcula dias até a data de revisão
 */
function daysUntilReview(reviewDate: dayjs.Dayjs): number {
  const today = dayjs().startOf('day');
  const review = reviewDate.startOf('day');
  return review.diff(today, 'day');
}

/**
 * Carrega histórico de notificações enviadas do banco de dados
 * Fallback para AsyncStorage se o banco falhar
 */
async function loadNotificationHistory(): Promise<NotificationRecord[]> {
  try {
    // Tenta carregar do banco de dados
    const today = dayjs().startOf('day').toISOString();
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();

    const { data, error } = await supabase
      .from('review_notifications')
      .select('equipment_id, review_date, days_until, notified_at')
      .gte('notified_at', thirtyDaysAgo)
      .order('notified_at', { ascending: false });

    if (!error && data) {
      // Converte formato do banco para formato local
      return data.map((row) => ({
        equipmentId: row.equipment_id,
        reviewDate: row.review_date,
        daysUntil: row.days_until,
        notifiedAt: row.notified_at,
      }));
    }

    // Fallback para AsyncStorage
    logger.debug('Usando AsyncStorage como fallback para histórico de notificações');
    const localData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!localData) return [];
    return JSON.parse(localData);
  } catch (error) {
    logger.error('Erro ao carregar histórico de notificações:', error);
    // Fallback para AsyncStorage em caso de erro
    try {
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!localData) return [];
      return JSON.parse(localData);
    } catch {
      return [];
    }
  }
}

/**
 * Salva notificação no histórico (banco de dados + AsyncStorage como backup)
 */
async function saveNotification(
  equipmentId: string,
  reviewDate: string,
  daysUntil: number
): Promise<void> {
  const notifiedAt = new Date().toISOString();
  
  try {
    // Tenta salvar no banco de dados
    const notifiedDate = dayjs().format('YYYY-MM-DD'); // Data sem hora para constraint UNIQUE
    
    const { error: dbError } = await supabase
      .from('review_notifications')
      .insert({
        equipment_id: equipmentId,
        review_date: reviewDate,
        days_until: daysUntil,
        notified_at: notifiedAt,
        notified_date: notifiedDate, // Data sem hora para constraint UNIQUE
      });

    if (dbError) {
      // Se der erro (ex: tabela não existe), usa apenas AsyncStorage
      logger.debug('Erro ao salvar no banco, usando AsyncStorage:', dbError);
      throw dbError;
    }

    // Também salva localmente como backup
    const record: NotificationRecord = {
      equipmentId,
      reviewDate,
      daysUntil,
      notifiedAt,
    };
    const history = await loadNotificationHistory();
    history.push(record);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    // Fallback: salva apenas no AsyncStorage
    try {
      const history = await loadNotificationHistory();
      const record: NotificationRecord = {
        equipmentId,
        reviewDate,
        daysUntil,
        notifiedAt,
      };
      history.push(record);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      logger.debug('Notificação salva apenas no AsyncStorage (fallback)');
    } catch (localError) {
      logger.error('Erro ao salvar notificação no histórico:', localError);
    }
  }
}

/**
 * Verifica se já foi notificado para este equipamento nesta data e intervalo
 * Verifica primeiro no banco, depois no AsyncStorage
 */
async function wasNotified(
  equipmentId: string,
  reviewDate: string,
  daysUntil: number
): Promise<boolean> {
  try {
    // Tenta verificar no banco de dados primeiro
    const today = dayjs().format('YYYY-MM-DD'); // Data sem hora

    const { data, error } = await supabase
      .from('review_notifications')
      .select('id')
      .eq('equipment_id', equipmentId)
      .eq('review_date', reviewDate)
      .eq('days_until', daysUntil)
      .eq('notified_date', today) // Usa o campo notified_date para comparação
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }

    // Fallback: verifica no AsyncStorage
    const history = await loadNotificationHistory();
    return history.some(
      (record) =>
        record.equipmentId === equipmentId &&
        record.reviewDate === reviewDate &&
        record.daysUntil === daysUntil &&
        dayjs(record.notifiedAt).startOf('day').isSame(today)
    );
  } catch (error) {
    logger.error('Erro ao verificar histórico de notificações:', error);
    // Em caso de erro, assume que não foi notificado (permite envio)
    return false;
  }
}

/**
 * Limpa notificações antigas do histórico (mais de 30 dias)
 * Limpa do banco de dados e do AsyncStorage
 */
async function cleanOldNotifications(): Promise<void> {
  try {
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();

    // Limpa do banco de dados
    const { error: dbError } = await supabase
      .from('review_notifications')
      .delete()
      .lt('notified_at', thirtyDaysAgo);

    if (dbError) {
      logger.debug('Erro ao limpar banco de dados (pode não existir tabela):', dbError);
    }

    // Limpa do AsyncStorage também
    const history = await loadNotificationHistory();
    const filtered = history.filter((record) =>
      dayjs(record.notifiedAt).isAfter(thirtyDaysAgo)
    );
    
    if (filtered.length !== history.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      logger.debug(`Limpeza de histórico local: ${history.length - filtered.length} registros removidos`);
    }
  } catch (error) {
    logger.error('Erro ao limpar histórico de notificações:', error);
  }
}

/**
 * Verifica e envia notificações de revisão para um equipamento
 */
async function checkEquipmentReview(equipment: Equipment): Promise<void> {
  // Apenas equipamentos ativos
  if (equipment.status !== 'ativo') return;

  // Verifica se tem data de revisão
  const reviewDate = parseBrDate(equipment.nextReview);
  if (!reviewDate) return;

  const daysUntil = daysUntilReview(reviewDate);

  // Verifica se está em um dos intervalos de notificação
  if (!NOTIFICATION_INTERVALS.includes(daysUntil)) return;

  // Verifica se já foi notificado hoje para este intervalo
  const alreadyNotified = await wasNotified(
    equipment.id,
    equipment.nextReview,
    daysUntil
  );

  if (alreadyNotified) {
    logger.debug(
      `Notificação já enviada hoje para ${equipment.name} (${daysUntil} dias)`
    );
    return;
  }

  // Envia notificação
  try {
    await notificationService.notifyReviewUpcoming(
      equipment.name,
      daysUntil,
      equipment.nextReview
    );

    // Salva no histórico
    await saveNotification(equipment.id, equipment.nextReview, daysUntil);

    logger.debug(
      `Notificação de revisão enviada: ${equipment.name} (${daysUntil} dias)`
    );
  } catch (error) {
    logger.error('Erro ao enviar notificação de revisão:', error);
  }
}

/**
 * Verifica todos os equipamentos e envia notificações quando necessário
 */
export async function checkReviewNotifications(
  equipments: Equipment[]
): Promise<void> {
  try {
    // Limpa histórico antigo
    await cleanOldNotifications();

    // Verifica cada equipamento
    const promises = equipments.map((equipment) =>
      checkEquipmentReview(equipment)
    );

    await Promise.all(promises);

    logger.debug(`Verificação de revisões concluída para ${equipments.length} equipamentos`);
  } catch (error) {
    logger.error('Erro ao verificar notificações de revisão:', error);
  }
}

