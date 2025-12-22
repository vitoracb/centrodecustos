/**
 * Funções helpers puras usadas no módulo Financeiro
 */

import dayjs from 'dayjs';
import { Receipt, Expense, ExpenseDocument } from '../../context/FinancialContext';

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(value);
};

/**
 * Calcula informações de recebimento fixo (parcela atual e total)
 */
export const getReceiptFixedInfo = (
    receipt: Receipt,
    allReceipts: Receipt[]
): { isFixed: boolean; installment?: string } => {
    // Busca o recebimento template (isFixed = true) com a mesma descrição e centro
    const template = allReceipts.find(
        (r) => r.isFixed && r.name === receipt.name && r.center === receipt.center
    );

    // Se não encontrou template, não é fixo
    if (!template || !template.fixedDurationMonths) {
        return { isFixed: false };
    }

    // Se tem installmentNumber, usa ele diretamente
    if (receipt.installmentNumber && template.fixedDurationMonths) {
        return {
            isFixed: true,
            installment: `${receipt.installmentNumber}/${template.fixedDurationMonths}`,
        };
    }

    // Se este é o template, mostra como primeira parcela
    if (receipt.isFixed && receipt.id === template.id) {
        return {
            isFixed: true,
            installment: `1/${template.fixedDurationMonths}`,
        };
    }

    // Se não é o template, calcula a parcela baseado na diferença de meses
    const templateDate = dayjs(template.date, 'DD/MM/YYYY');
    const receiptDate = dayjs(receipt.date, 'DD/MM/YYYY');

    if (!templateDate.isValid() || !receiptDate.isValid()) {
        return { isFixed: false };
    }

    const monthsDiff = receiptDate.diff(templateDate, 'month');
    const installment = monthsDiff + 1; // +1 porque a primeira parcela é 1, não 0

    // Verifica se está dentro do range válido
    if (installment < 1 || installment > template.fixedDurationMonths) {
        return { isFixed: false };
    }

    return {
        isFixed: true,
        installment: `${installment}/${template.fixedDurationMonths}`,
    };
};

/**
 * Calcula informações de despesa parcelada (não fixa)
 */
export const getExpenseInstallmentInfo = (
    expense: Expense,
    allExpenses: Expense[]
): { isInstallment: boolean; label?: string } => {
    if (expense.installmentNumber == null) {
        return { isInstallment: false };
    }

    // Se existir um template de despesa fixa com mesmo nome/centro, tratamos este grupo como despesa fixa,
    // não como parcelamento manual. Nesse caso, não exibimos o badge de "Parcela", apenas o de "Despesa fixa".
    const hasFixedTemplate = allExpenses.some(
        (e) =>
            e.isFixed &&
            e.name === expense.name &&
            e.center === expense.center &&
            e.fixedDurationMonths != null &&
            e.fixedDurationMonths > 0
    );

    if (hasFixedTemplate) {
        return { isInstallment: false };
    }

    // Considera todas as despesas com mesmo nome/centro que tenham número de parcela
    const siblings = allExpenses.filter(
        (e) =>
            e.center === expense.center &&
            e.name === expense.name &&
            e.installmentNumber != null
    );

    if (siblings.length === 0) {
        return { isInstallment: true, label: `${expense.installmentNumber}` };
    }

    const totalInstallments = siblings.reduce((max, e) => {
        const n = e.installmentNumber ?? 0;
        return n > max ? n : max;
    }, 0);

    if (!totalInstallments) {
        return { isInstallment: true, label: `${expense.installmentNumber}` };
    }

    return {
        isInstallment: true,
        label: `${expense.installmentNumber}/${totalInstallments}`,
    };
};

/**
 * Obtém documentos compartilhados entre parcelas da mesma despesa
 */
export const getSharedExpenseDocuments = (
    expense: Expense,
    allExpenses: Expense[]
): ExpenseDocument[] => {
    // Se não é parcela, usa apenas os documentos da própria despesa
    if (expense.installmentNumber == null) {
        return expense.documents ?? [];
    }

    const siblings = allExpenses.filter(
        (e) =>
            e.center === expense.center &&
            e.name === expense.name &&
            e.installmentNumber != null
    );

    const docs: ExpenseDocument[] = [];
    siblings.forEach((e) => {
        if (e.documents && e.documents.length > 0) {
            docs.push(...e.documents);
        }
    });

    // Se por algum motivo não encontrou nada entre as parcelas, retorna os documentos da própria despesa
    if (docs.length === 0) {
        return expense.documents ?? [];
    }

    return docs;
};

/**
 * Calcula informações de despesa fixa (parcela atual e total)
 */
export const getExpenseFixedInfo = (
    expense: Expense,
    allExpenses: Expense[]
): { isFixed: boolean; installment?: string } => {
    // Busca a despesa template (isFixed = true) com a mesma descrição e centro
    const template = allExpenses.find(
        (e) => e.isFixed && e.name === expense.name && e.center === expense.center
    );

    // Se não encontrou template, não é fixo
    if (!template || !template.fixedDurationMonths) {
        return { isFixed: false };
    }

    // Se esta é o template, mostra como primeira parcela
    if (expense.isFixed && expense.id === template.id) {
        return {
            isFixed: true,
            installment: `1/${template.fixedDurationMonths}`,
        };
    }

    // Se não é o template, calcula a parcela baseado na diferença de meses
    const templateDate = dayjs(template.date, 'DD/MM/YYYY');
    const expenseDate = dayjs(expense.date, 'DD/MM/YYYY');

    if (!templateDate.isValid() || !expenseDate.isValid()) {
        return { isFixed: false };
    }

    // Calcula a diferença de meses de forma mais precisa
    const templateYear = templateDate.year();
    const templateMonth = templateDate.month();
    const expenseYear = expenseDate.year();
    const expenseMonth = expenseDate.month();

    const monthsDiff = (expenseYear - templateYear) * 12 + (expenseMonth - templateMonth);
    const installment = monthsDiff + 1; // +1 porque a primeira parcela é 1, não 0

    // Verifica se está dentro do range válido
    if (installment < 1 || installment > template.fixedDurationMonths) {
        return { isFixed: false };
    }

    return {
        isFixed: true,
        installment: `${installment}/${template.fixedDurationMonths}`,
    };
};
