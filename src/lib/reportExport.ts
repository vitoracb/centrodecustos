import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Expense, Receipt } from '../context/FinancialContext';
import { CostCenter } from '../context/CostCenterContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const CENTER_LABELS: Record<CostCenter, string> = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const CATEGORY_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
};

const STATUS_LABELS: Record<string, string> = {
  a_confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_pagar: 'A Pagar',
  pago: 'Pago',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: string): string => {
  return date; // Já vem no formato DD/MM/YYYY
};

interface ReportData {
  expenses: Expense[];
  receipts: Receipt[];
  period: { month?: number; year: number };
  center?: CostCenter;
}

export const exportToPDF = async (data: ReportData): Promise<void> => {
  try {
    const { expenses, receipts, period, center } = data;
    
    const periodLabel = period.month !== undefined
      ? `${dayjs().month(period.month).format('MMMM')} de ${period.year}`
      : `Ano ${period.year}`;

    const centerLabel = center ? CENTER_LABELS[center] : 'Todos os Centros';

    // Calcular totais
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.value, 0);
    const balance = totalReceipts - totalExpenses;

    // Agrupar despesas por categoria
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((expense) => {
      const category = CATEGORY_LABELS[expense.category] || expense.category;
      expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.value;
    });

    // Agrupar despesas por status
    const expensesByStatus: Record<string, number> = {};
    expenses.forEach((expense) => {
      const status = STATUS_LABELS[expense.status] || expense.status;
      expensesByStatus[status] = (expensesByStatus[status] || 0) + expense.value;
    });

    // Gerar HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Financeiro</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #1C1C1E;
    }
    h1 {
      color: #0A84FF;
      border-bottom: 2px solid #0A84FF;
      padding-bottom: 10px;
    }
    h2 {
      color: #1C1C1E;
      margin-top: 30px;
      border-bottom: 1px solid #E5E5EA;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #E5E5EA;
    }
    th {
      background-color: #F5F5F7;
      font-weight: 600;
    }
    .summary {
      background-color: #F5F5F7;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 16px;
    }
    .summary-label {
      font-weight: 600;
    }
    .positive {
      color: #34C759;
    }
    .negative {
      color: #FF3B30;
    }
    .category-table {
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Relatório Financeiro</h1>
  
  <div class="summary">
    <div class="summary-item">
      <span class="summary-label">Período:</span>
      <span>${periodLabel}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Centro de Custo:</span>
      <span>${centerLabel}</span>
    </div>
  </div>

  <h2>Resumo</h2>
  <div class="summary">
    <div class="summary-item">
      <span class="summary-label">Total de Recebimentos:</span>
      <span class="positive">${formatCurrency(totalReceipts)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Total de Despesas:</span>
      <span class="negative">${formatCurrency(totalExpenses)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Saldo:</span>
      <span class="${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance)}</span>
    </div>
  </div>

  <h2>Despesas por Categoria</h2>
  <table class="category-table">
    <thead>
      <tr>
        <th>Categoria</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(expensesByCategory)
        .map(([category, value]) => `
          <tr>
            <td>${category}</td>
            <td>${formatCurrency(value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>

  <h2>Despesas por Status</h2>
  <table class="category-table">
    <thead>
      <tr>
        <th>Status</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(expensesByStatus)
        .map(([status, value]) => `
          <tr>
            <td>${status}</td>
            <td>${formatCurrency(value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>

  <h2>Detalhamento de Despesas</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Status</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${expenses
        .map((expense) => `
          <tr>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.description || expense.name || ''}</td>
            <td>${CATEGORY_LABELS[expense.category] || expense.category}</td>
            <td>${STATUS_LABELS[expense.status] || expense.status}</td>
            <td>${formatCurrency(expense.value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>

  <h2>Detalhamento de Recebimentos</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${receipts
        .map((receipt) => `
          <tr>
            <td>${formatDate(receipt.date)}</td>
            <td>${receipt.description || receipt.name || ''}</td>
            <td>${formatCurrency(receipt.value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>

  <p style="margin-top: 40px; color: #6C6C70; font-size: 12px;">
    Relatório gerado em ${dayjs().format('DD/MM/YYYY [às] HH:mm')}
  </p>
</body>
</html>
    `;

    // Salvar HTML temporariamente
    const fileUri = `${FileSystem.cacheDirectory}relatorio_${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });

    // Compartilhar o arquivo (o usuário pode escolher como abrir, incluindo como PDF)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Exportar Relatório',
      });
    } else {
      throw new Error('Compartilhamento não disponível neste dispositivo');
    }
  } catch (error: any) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error(`Erro ao exportar PDF: ${error.message}`);
  }
};

export const exportToExcel = async (data: ReportData): Promise<void> => {
  try {
    const { expenses, receipts, period, center } = data;
    
    const periodLabel = period.month !== undefined
      ? `${dayjs().month(period.month).format('MMMM')}_${period.year}`
      : `Ano_${period.year}`;

    const centerLabel = center ? CENTER_LABELS[center].replace(/\s+/g, '_') : 'Todos_Centros';

    // Calcular totais
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.value, 0);
    const balance = totalReceipts - totalExpenses;

    // Gerar CSV
    let csv = '\uFEFF'; // BOM para UTF-8 (Excel)
    
    // Cabeçalho
    csv += 'RELATÓRIO FINANCEIRO\n';
    csv += `Período: ${period.month !== undefined ? `${dayjs().month(period.month).format('MMMM')} de ${period.year}` : `Ano ${period.year}`}\n`;
    csv += `Centro de Custo: ${center ? CENTER_LABELS[center] : 'Todos os Centros'}\n`;
    csv += `Data de Geração: ${dayjs().format('DD/MM/YYYY [às] HH:mm')}\n\n`;

    // Resumo
    csv += 'RESUMO\n';
    csv += 'Item,Valor\n';
    csv += `Total de Recebimentos,${totalReceipts.toFixed(2)}\n`;
    csv += `Total de Despesas,${totalExpenses.toFixed(2)}\n`;
    csv += `Saldo,${balance.toFixed(2)}\n\n`;

    // Despesas por Categoria
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((expense) => {
      expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.value;
    });
    csv += 'DESPESAS POR CATEGORIA\n';
    csv += 'Categoria,Valor\n';
    Object.entries(expensesByCategory).forEach(([category, value]) => {
      csv += `${CATEGORY_LABELS[category] || category},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Despesas por Status
    const expensesByStatus: Record<string, number> = {};
    expenses.forEach((expense) => {
      expensesByStatus[expense.status] = (expensesByStatus[expense.status] || 0) + expense.value;
    });
    csv += 'DESPESAS POR STATUS\n';
    csv += 'Status,Valor\n';
    Object.entries(expensesByStatus).forEach(([status, value]) => {
      csv += `${STATUS_LABELS[status] || status},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Detalhamento de Despesas
    csv += 'DETALHAMENTO DE DESPESAS\n';
    csv += 'Data,Descrição,Categoria,Status,Valor\n';
    expenses.forEach((expense) => {
      const description = (expense.description || expense.name || '').replace(/"/g, '""');
      csv += `${expense.date},"${description}",${CATEGORY_LABELS[expense.category] || expense.category},${STATUS_LABELS[expense.status] || expense.status},${expense.value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Detalhamento de Recebimentos
    csv += 'DETALHAMENTO DE RECEBIMENTOS\n';
    csv += 'Data,Descrição,Valor\n';
    receipts.forEach((receipt) => {
      const description = (receipt.description || receipt.name || '').replace(/"/g, '""');
      csv += `${receipt.date},"${description}",${receipt.value.toFixed(2)}\n`;
    });

    // Salvar CSV
    const fileUri = `${FileSystem.cacheDirectory}relatorio_${periodLabel}_${centerLabel}_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    // Compartilhar o arquivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Relatório Excel',
      });
    } else {
      throw new Error('Compartilhamento não disponível neste dispositivo');
    }
  } catch (error: any) {
    console.error('Erro ao exportar Excel:', error);
    throw new Error(`Erro ao exportar Excel: ${error.message}`);
  }
};

