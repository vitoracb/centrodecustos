/**
 * Constantes usadas no módulo Financeiro
 */

import { ExpenseStatus } from '../../context/FinancialContext';

export const CATEGORY_LABELS: Record<string, string> = {
    manutencao: 'Manutenção',
    funcionario: 'Funcionário',
    gestor: 'Gestor',
    terceirizados: 'Terceirizados',
    diversos: 'Diversos',
    equipamentos: 'Equipamentos',
    impostos: 'Impostos',
};

export const SECTOR_LABELS: Record<string, string> = {
    now: 'Now',
    felipe_viatransportes: 'Felipe Viatransportes',
    terceirizados: 'Funcionário Particular',
    gestao: 'Gestão',
    ronaldo: 'Ronaldo',
    particular: 'Locação Particular',
};

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
    confirmar: 'A Confirmar',
    confirmado: 'Confirmado',
    a_pagar: 'A Pagar',
    pago: 'Pago',
};

export const STATUS_STYLES: Record<ExpenseStatus, { backgroundColor: string; color: string }> = {
    confirmar: { backgroundColor: '#FFF3D6', color: '#FF9500' },
    confirmado: { backgroundColor: '#E9FAF0', color: '#34C759' },
    a_pagar: { backgroundColor: '#FDECEC', color: '#FF3B30' },
    pago: { backgroundColor: '#E6FEEA', color: '#1B8A2F' },
};

export const CENTER_LABELS: Record<string, string> = {
    valenca: 'Valença',
    cna: 'CNA',
    cabralia: 'Cabrália',
};

export const EXPENSES_PAGE_SIZE = 12;

export const TABS = ['Recebimentos', 'Despesas', 'Fechamento'] as const;
export type TabType = typeof TABS[number];
