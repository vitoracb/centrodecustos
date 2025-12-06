import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Expense, Receipt } from '../context/FinancialContext';
import { CostCenter } from '../context/CostCenterContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

// Função para obter o nome do centro de custo
// Como CostCenter agora é string, mantemos um mapeamento padrão
// mas pode ser expandido dinamicamente
const getCenterLabel = (center: CostCenter): string => {
  const defaultLabels: Record<string, string> = {
    valenca: 'Valença',
    cna: 'CNA',
    cabralia: 'Cabrália',
  };
  return defaultLabels[center] || center;
};

const CATEGORY_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestor: 'Gestor',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
  equipamentos: 'Equipamentos',
  impostos: 'Impostos',
};

const STATUS_LABELS: Record<string, string> = {
  a_confirmar: 'A Confirmar',
  confirmado: 'Confirmado',
  a_pagar: 'A Pagar',
  pago: 'Pago',
};

const SECTOR_LABELS: Record<string, string> = {
  now: 'Now',
  felipe_viatransportes: 'Felipe Viatransportes',
  terceirizados: 'Funcionário Particular',
  gestao: 'Gestão',
  ronaldo: 'Ronaldo',
  variavel: 'Variável',
  parcela_patrol_ronaldo: 'Parcela Patrol Ronaldo',
  particular: 'Locação Particular',
  imposto: 'Imposto',
};

const SECTOR_COLORS: Record<string, string> = {
  now: '#0A84FF',
  felipe_viatransportes: '#34C759',
  terceirizados: '#FF9500',
  gestao: '#AF52DE',
  ronaldo: '#FF3B30',
  variavel: '#00C7BE',
  parcela_patrol_ronaldo: '#FF2D55',
  particular: '#FFD60A',
  imposto: '#8E8E93',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const CHART_COLORS = ['#0A84FF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5E5CE6', '#FFD60A'];

const formatDate = (date: string): string => {
  return date; // Já vem no formato DD/MM/YYYY
};

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export interface ReportData {
  expenses: Expense[];
  receipts: Receipt[];
  period: { month?: number; year: number };
  center?: CostCenter;
}

export const buildReportHTML = (data: ReportData): string => {
  const { expenses, receipts, period, center } = data;
    
  const periodLabel = period.month !== undefined
    ? `${capitalize(dayjs().month(period.month).format('MMMM'))} de ${period.year}`
    : `Ano ${period.year}`;

  const centerLabel = center ? getCenterLabel(center) : 'Todos os Centros';

  // Calcular totais
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const totalReceipts = receipts.reduce((sum, r) => sum + r.value, 0);
  const balance = totalReceipts - totalExpenses;

  // Debug: Log dos valores
  console.log('📊 [RELATÓRIO] Total de despesas:', totalExpenses);
  console.log('📊 [RELATÓRIO] Número de despesas:', expenses.length);
  console.log('📊 [RELATÓRIO] Primeiras 3 despesas:', expenses.slice(0, 3).map(e => ({ name: e.name, value: e.value })));

  // Helper para decidir se uma despesa deve ser considerada no agrupamento por setor
  const shouldIncludeExpenseInSector = (expense: Expense, allExpenses: Expense[]): boolean => {
    if (!expense.sector) return false;

    // Parcelas geradas: sempre incluem (isFixed = false com installmentNumber)
    if (expense.installmentNumber != null && !expense.isFixed) {
      return true;
    }

    // Template fixo (isFixed = true): inclui apenas se NÃO houver parcelas geradas no mesmo mês/ano
    if (expense.isFixed) {
      const templateDate = dayjs(expense.date, 'DD/MM/YYYY', true);
      if (!templateDate.isValid()) return false;

      const hasGeneratedInstallmentsInSameMonth = allExpenses.some((other) => {
        if (other.id === expense.id) return false;
        if (!other.sector) return false;
        if (other.name !== expense.name) return false;
        if (other.center !== expense.center) return false;
        if (other.sector !== expense.sector) return false;
        if (other.installmentNumber == null || other.isFixed) return false;

        const otherDate = dayjs(other.date, 'DD/MM/YYYY', true);
        if (!otherDate.isValid()) return false;

        return (
          otherDate.year() === templateDate.year() &&
          otherDate.month() === templateDate.month()
        );
      });

      return !hasGeneratedInstallmentsInSameMonth;
    }

    return false;
  };

  // Agrupar recebimentos por origem (nome) para gráfico de pizza
  const receiptsBySource: Record<string, number> = {};
  receipts.forEach((receipt) => {
    const source = receipt.name && receipt.name.trim() !== '' ? receipt.name : 'Sem descrição';
    receiptsBySource[source] = (receiptsBySource[source] || 0) + receipt.value;
  });

  let receiptsGradientStops = '';
  let receiptsCurrentPercent = 0;
  const totalReceiptsForPie = Object.values(receiptsBySource).reduce((sum, value) => sum + value, 0);
  Object.entries(receiptsBySource).forEach(([_, value], index) => {
    const percentValue = totalReceiptsForPie === 0 ? 0 : (value / totalReceiptsForPie) * 100;
    const nextPercent = receiptsCurrentPercent + percentValue;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    receiptsGradientStops += `${color} ${receiptsCurrentPercent.toFixed(2)}% ${nextPercent.toFixed(2)}%, `;
    receiptsCurrentPercent = nextPercent;
  });
  if (!receiptsGradientStops) {
    receiptsGradientStops = '#E5E5EA 0% 100%, ';
  }
  receiptsGradientStops = receiptsGradientStops.slice(0, -2);

  // Agrupar despesas por categoria
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((expense) => {
    // Garante que categorias desconhecidas (ex: 'teste') sejam tratadas como 'Diversos'
    const rawCategory = expense.category && CATEGORY_LABELS[expense.category] ? expense.category : 'diversos';
    const category = CATEGORY_LABELS[rawCategory] || 'Diversos';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.value;
  });

  // Agrupar despesas por status
  const expensesByStatus: Record<string, number> = {};
  expenses.forEach((expense) => {
    const status = expense.status ? (STATUS_LABELS[expense.status] || expense.status) : 'Sem status';
    expensesByStatus[status] = (expensesByStatus[status] || 0) + expense.value;
  });

  // Agrupar despesas fixas por setor, alinhado com o gráfico do app
  const expensesForSector = expenses.filter((expense) =>
    shouldIncludeExpenseInSector(expense, expenses)
  );

  const expensesBySector: Record<string, number> = {};
  expensesForSector.forEach((expense) => {
    const sector = expense.sector ? (SECTOR_LABELS[expense.sector] || expense.sector) : 'Sem setor';
    expensesBySector[sector] = (expensesBySector[sector] || 0) + expense.value;
  });

  // Dados para gráfico de pizza (categorias)
  const totalCategories = Object.values(expensesByCategory).reduce((sum, value) => sum + value, 0);
  let categoryGradientStops = '';
  let currentPercent = 0;
  Object.entries(expensesByCategory).forEach(([category, value], index) => {
    const percentValue = totalCategories === 0 ? 0 : (value / totalCategories) * 100;
    const nextPercent = currentPercent + percentValue;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    categoryGradientStops += `${color} ${currentPercent.toFixed(2)}% ${nextPercent.toFixed(2)}%, `;
    currentPercent = nextPercent;
  });
  if (!categoryGradientStops) {
    categoryGradientStops = '#E5E5EA 0% 100%, ';
  }
  categoryGradientStops = categoryGradientStops.slice(0, -2);

  // Dados para gráfico de pizza (status)
  const totalStatus = Object.values(expensesByStatus).reduce((sum, value) => sum + value, 0);
  let statusGradientStops = '';
  currentPercent = 0;
  Object.entries(expensesByStatus).forEach(([status, value], index) => {
    const percentValue = totalStatus === 0 ? 0 : (value / totalStatus) * 100;
    const nextPercent = currentPercent + percentValue;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    statusGradientStops += `${color} ${currentPercent.toFixed(2)}% ${nextPercent.toFixed(2)}%, `;
    currentPercent = nextPercent;
  });
  if (!statusGradientStops) {
    statusGradientStops = '#E5E5EA 0% 100%, ';
  }
  statusGradientStops = statusGradientStops.slice(0, -2);

  // Dados para gráfico de pizza (setores)
  const totalSectors = Object.values(expensesBySector).reduce((sum, value) => sum + value, 0);
  let sectorGradientStops = '';
  currentPercent = 0;
  Object.entries(expensesBySector).forEach(([sector, value]) => {
    const percentValue = totalSectors === 0 ? 0 : (value / totalSectors) * 100;
    const nextPercent = currentPercent + percentValue;
    // Usa a cor específica do setor se disponível, senão usa do array
    const sectorKey = Object.keys(SECTOR_LABELS).find(key => SECTOR_LABELS[key] === sector);
    const color = sectorKey && SECTOR_COLORS[sectorKey] ? SECTOR_COLORS[sectorKey] : CHART_COLORS[Object.keys(expensesBySector).indexOf(sector) % CHART_COLORS.length];
    sectorGradientStops += `${color} ${currentPercent.toFixed(2)}% ${nextPercent.toFixed(2)}%, `;
    currentPercent = nextPercent;
  });
  if (!sectorGradientStops) {
    sectorGradientStops = '#E5E5EA 0% 100%, ';
  }
  sectorGradientStops = sectorGradientStops.slice(0, -2);

  // Dados para gráfico de barras (despesas mensais do ano selecionado)
  const expensesByMonth = Array(12).fill(0);
  expenses.forEach((expense) => {
    const date = dayjs(expense.date, 'DD/MM/YYYY', true);
    if (!date.isValid()) return;
    if (date.year() === period.year) {
      expensesByMonth[date.month()] += expense.value;
    }
  });
  const maxMonthlyExpense = Math.max(...expensesByMonth, 1);

  // Gerar HTML
  return `
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
    .header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0A84FF;
    }
    .logo {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #0A84FF;
      margin: 0;
      line-height: 1.2;
    }
    .report-title {
      font-size: 16px;
      color: #6C6C70;
      margin: 5px 0 0 0;
      font-weight: normal;
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
    .chart-section {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
      margin: 20px 0;
    }
    .pie-chart {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .chart-legend {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
    }
    .chart-legend li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .legend-color {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      display: inline-block;
    }
    .bar-chart {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      height: 180px;
      padding: 10px 0;
    }
    .bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      text-align: center;
      font-size: 10px;
      color: #6C6C70;
      height: 100%;
      gap: 4px;
    }
    .bar-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bar-fill {
      width: 100%;
      border-radius: 8px 8px 0 0;
      background: linear-gradient(180deg, #0A84FF 0%, #4AA6FF 100%);
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0A84FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4AA6FF;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#logoGradient)"/>
      <path d="M30 35 L70 35 L70 40 L30 40 Z" fill="white" opacity="0.9"/>
      <path d="M30 50 L70 50 L70 55 L30 55 Z" fill="white" opacity="0.7"/>
      <path d="M30 65 L55 65 L55 70 L30 70 Z" fill="white" opacity="0.5"/>
      <circle cx="65" cy="67.5" r="7" fill="#34C759"/>
      <path d="M62 67.5 L64 69.5 L68 65.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="company-info">
      <h1 class="company-name">Now Trading</h1>
      <p class="report-title">Relatório Financeiro</p>
    </div>
  </div>
  
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
            <td>${receipt.name || ''}</td>
            <td>${formatCurrency(receipt.value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>

  ${Object.keys(receiptsBySource).length > 1 ? `
  <h2>Recebimentos</h2>
  <div class="chart-section">
    <div class="pie-chart" style="background: conic-gradient(${receiptsGradientStops});"></div>
    <ul class="chart-legend">
      ${Object.entries(receiptsBySource)
        .map(([source, value], index) => {
          const percentValue = totalReceiptsForPie === 0 ? 0 : (value / totalReceiptsForPie) * 100;
          const percentLabel = percentValue > 0 && percentValue < 1 ? '&lt;1' : percentValue.toFixed(0);
          return `
          <li>
            <span class="legend-color" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
            <span>${source} (${percentLabel}%) — ${formatCurrency(value)}</span>
          </li>
        `;
        })
        .join('')}
    </ul>
  </div>
  ` : ''}

  <h2>Despesas por Categoria</h2>
  ${Object.keys(expensesByCategory).length > 1 ? `
  <div class="chart-section">
    <div class="pie-chart" style="background: conic-gradient(${categoryGradientStops});"></div>
    <ul class="chart-legend">
      ${Object.entries(expensesByCategory)
        .map(([category, value], index) => {
          const percentValue = totalCategories === 0 ? 0 : (value / totalCategories) * 100;
          const percentLabel = percentValue > 0 && percentValue < 1 ? '&lt;1' : percentValue.toFixed(0);
          return `
          <li>
            <span class="legend-color" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
            <span>${category} (${percentLabel}%) — ${formatCurrency(value)}</span>
          </li>
        `;
        })
        .join('')}
    </ul>
  </div>
  ` : ''}
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
  ${Object.keys(expensesByStatus).length > 1 ? `
  <div class="chart-section">
    <div class="pie-chart" style="background: conic-gradient(${statusGradientStops});"></div>
    <ul class="chart-legend">
      ${Object.entries(expensesByStatus)
        .map(([status, value], index) => {
          const percentValue = totalStatus === 0 ? 0 : (value / totalStatus) * 100;
          const percentLabel = percentValue > 0 && percentValue < 1 ? '&lt;1' : percentValue.toFixed(0);
          return `
          <li>
            <span class="legend-color" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
            <span>${status} (${percentLabel}%) — ${formatCurrency(value)}</span>
          </li>
        `;
        })
        .join('')}
    </ul>
  </div>
  ` : ''}
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

  ${Object.keys(expensesBySector).length > 0 ? `
  <h2>Despesas por Setor</h2>
  ${Object.keys(expensesBySector).length > 1 ? `
  <div class="chart-section">
    <div class="pie-chart" style="background: conic-gradient(${sectorGradientStops});"></div>
    <ul class="chart-legend">
      ${Object.entries(expensesBySector)
        .map(([sector, value]) => {
          const percentValue = totalSectors === 0 ? 0 : (value / totalSectors) * 100;
          const percentLabel = percentValue > 0 && percentValue < 1 ? '&lt;1' : percentValue.toFixed(0);
          const sectorKey = Object.keys(SECTOR_LABELS).find(key => SECTOR_LABELS[key] === sector);
          const color = sectorKey && SECTOR_COLORS[sectorKey] ? SECTOR_COLORS[sectorKey] : CHART_COLORS[Object.keys(expensesBySector).indexOf(sector) % CHART_COLORS.length];
          return `
          <li>
            <span class="legend-color" style="background:${color}"></span>
            <span>${sector} (${percentLabel}%) — ${formatCurrency(value)}</span>
          </li>
        `;
        })
        .join('')}
    </ul>
  </div>
  ` : ''}
  <table class="category-table">
    <thead>
      <tr>
        <th>Setor</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(expensesBySector)
        .map(([sector, value]) => `
          <tr>
            <td>${sector}</td>
            <td>${formatCurrency(value)}</td>
          </tr>
        `)
        .join('')}
    </tbody>
  </table>
  ` : ''}

  <h2>Gráfico de Despesas Mensais - ${period.year}</h2>
  <div class="bar-chart">
    ${expensesByMonth
      .map((value, month) => {
        const heightPercent = (value / maxMonthlyExpense) * 100;
        return `
          <div class="bar">
            <div class="bar-fill" style="height:${heightPercent}%"></div>
            <div class="bar-labels">
              <span>${dayjs().month(month).format('MMM')}</span>
              <span>${formatCurrency(value)}</span>
            </div>
      </div>
    `;
      })
      .join('')}
  </div>

  ${Object.keys(expensesBySector).length > 0 ? `
  <h2>Detalhamento por Setor de Despesas Fixas</h2>
  ${(() => {
    const expensesBySectorDetail: Record<string, Expense[]> = {};
    expensesForSector.forEach((expense) => {
      const sector = expense.sector ? (SECTOR_LABELS[expense.sector] || expense.sector) : 'Sem setor';
      if (!expensesBySectorDetail[sector]) {
        expensesBySectorDetail[sector] = [];
      }
      expensesBySectorDetail[sector].push(expense);
    });

    const sortedSectors = Object.keys(expensesBySectorDetail).sort((a, b) => {
      const totalA = expensesBySectorDetail[a].reduce((sum, exp) => sum + exp.value, 0);
      const totalB = expensesBySectorDetail[b].reduce((sum, exp) => sum + exp.value, 0);
      return totalB - totalA;
    });

    return sortedSectors.map((sector) => {
      const sectorExpenses = expensesBySectorDetail[sector];
      const sectorTotal = sectorExpenses.reduce((sum, exp) => sum + exp.value, 0);
      
      const expensesByCategoryFixed: Record<string, Expense[]> = {};
      sectorExpenses.forEach((expense) => {
        const rawCategory = expense.category && CATEGORY_LABELS[expense.category] ? expense.category : 'diversos';
        const category = CATEGORY_LABELS[rawCategory] || 'Diversos';
        if (!expensesByCategoryFixed[category]) {
          expensesByCategoryFixed[category] = [];
        }
        expensesByCategoryFixed[category].push(expense);
      });

      const sortedCategoriesFixed = Object.keys(expensesByCategoryFixed).sort();
      
      return `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #0A84FF; margin-bottom: 10px; border-bottom: 2px solid #E5E5EA; padding-bottom: 5px;">
            ${sector} — Total: ${formatCurrency(sectorTotal)}
          </h3>
          <table class="category-table">
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
              ${sortedCategoriesFixed.map((category) => {
                const categoryExpenses = expensesByCategoryFixed[category];
                return categoryExpenses
                  .sort((a, b) => {
                    const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
                    const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
                    if (!dateA.isValid() || !dateB.isValid()) return 0;
                    return dateB.valueOf() - dateA.valueOf();
                  })
                  .map((expense) => `
                    <tr>
                      <td>${formatDate(expense.date)}</td>
                      <td>${expense.name || ''}</td>
                      <td>${category}</td>
                      <td>${expense.status ? (STATUS_LABELS[expense.status] || expense.status) : ''}</td>
                      <td>${formatCurrency(expense.value)}</td>
                    </tr>
                  `)
                  .join('');
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  })()}
  ` : ''}

  <p style="margin-top: 40px; color: #6C6C70; font-size: 12px;">
    Relatório gerado em ${dayjs().format('DD/MM/YYYY [às] HH:mm')}
  </p>
</body>
</html>
  `;
};

export const exportToPDF = async (data: ReportData): Promise<string> => {
  try {
    const html = buildReportHTML(data);
    const timestamp = Date.now();
    const periodLabel = data.period.month !== undefined
      ? `${capitalize(dayjs().month(data.period.month).format('MMMM'))}_${data.period.year}`
      : `Ano_${data.period.year}`;
    const centerLabel = data.center ? getCenterLabel(data.center).replace(/\s+/g, '_') : 'Todos_Centros';
    
    // Salvar HTML temporariamente
    const fileUri = `${FileSystem.documentDirectory}relatorio_${periodLabel}_${centerLabel}_${timestamp}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });

    return fileUri;
  } catch (error: any) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error(`Erro ao exportar PDF: ${error.message}`);
  }
};

export const exportToExcel = async (data: ReportData): Promise<string> => {
  try {
    const { expenses, receipts, period, center } = data;
    
    const periodLabel = period.month !== undefined
      ? `${capitalize(dayjs().month(period.month).format('MMMM'))}_${period.year}`
      : `Ano_${period.year}`;

    const centerLabel = center ? getCenterLabel(center).replace(/\s+/g, '_') : 'Todos_Centros';

    // Calcular totais
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalReceipts = receipts.reduce((sum, r) => sum + r.value, 0);
    const balance = totalReceipts - totalExpenses;

    // Gerar CSV
    let csv = '\uFEFF'; // BOM para UTF-8 (Excel)
    
    // Cabeçalho
    csv += 'RELATÓRIO FINANCEIRO\n';
    csv += `Período: ${period.month !== undefined ? `${dayjs().month(period.month).format('MMMM')} de ${period.year}` : `Ano ${period.year}`}\n`;
    csv += `Centro de Custo: ${center ? getCenterLabel(center) : 'Todos os Centros'}\n`;
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
      const rawCategory = expense.category && CATEGORY_LABELS[expense.category] ? expense.category : 'diversos';
      const label = CATEGORY_LABELS[rawCategory] || 'Diversos';
      expensesByCategory[label] = (expensesByCategory[label] || 0) + expense.value;
    });
    csv += 'DESPESAS POR CATEGORIA\n';
    csv += 'Categoria,Valor\n';
    Object.entries(expensesByCategory).forEach(([category, value]) => {
      const label = CATEGORY_LABELS[category] || CATEGORY_LABELS['diversos'] || category;
      csv += `${label},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Despesas por Status
    const expensesByStatus: Record<string, number> = {};
    expenses.forEach((expense) => {
      const status = expense.status || 'Sem status';
      expensesByStatus[status] = (expensesByStatus[status] || 0) + expense.value;
    });
    csv += 'DESPESAS POR STATUS\n';
    csv += 'Status,Valor\n';
    Object.entries(expensesByStatus).forEach(([status, value]) => {
      csv += `${STATUS_LABELS[status] || status},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Despesas por Setor (apenas parcelas geradas, não templates)
    const expensesBySectorExcel: Record<string, number> = {};
    expenses.forEach((expense) => {
      // Inclui apenas parcelas geradas (is_fixed=false e tem installmentNumber)
      // Não inclui templates (is_fixed=true) para evitar duplicação
      if (expense.sector && expense.installmentNumber && !expense.isFixed) {
        const sector = SECTOR_LABELS[expense.sector] || expense.sector;
        expensesBySectorExcel[sector] = (expensesBySectorExcel[sector] || 0) + expense.value;
      }
    });
    if (Object.keys(expensesBySectorExcel).length > 0) {
      csv += 'DESPESAS POR SETOR\n';
      csv += 'Setor,Valor\n';
      Object.entries(expensesBySectorExcel).forEach(([sector, value]) => {
        csv += `${sector},${value.toFixed(2)}\n`;
      });
      csv += '\n';
    }

    // Detalhamento de Despesas
    csv += 'DETALHAMENTO DE DESPESAS\n';
    csv += 'Data,Descrição,Categoria,Status,Valor\n';
    expenses.forEach((expense) => {
      const description = (expense.name || '').replace(/"/g, '""');
      const category = expense.category ? (CATEGORY_LABELS[expense.category] || expense.category) : 'Sem categoria';
      const status = expense.status ? (STATUS_LABELS[expense.status] || expense.status) : 'Sem status';
      csv += `${expense.date},"${description}",${category},${status},${expense.value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Detalhamento de Recebimentos
    csv += 'DETALHAMENTO DE RECEBIMENTOS\n';
    csv += 'Data,Descrição,Valor\n';
    receipts.forEach((receipt) => {
      const description = (receipt.name || '').replace(/"/g, '""');
      csv += `${receipt.date},"${description}",${receipt.value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Dados para gráfico de pizza (categorias)
    csv += 'DADOS GRÁFICO PIZZA (DESPESAS POR CATEGORIA)\n';
    csv += 'Categoria,Valor\n';
    Object.entries(expensesByCategory).forEach(([category, value]) => {
      csv += `${CATEGORY_LABELS[category] || category},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Dados para gráfico de pizza (setores) - apenas se houver despesas por setor
    if (Object.keys(expensesBySectorExcel).length > 0) {
      csv += 'DADOS GRÁFICO PIZZA (DESPESAS POR SETOR)\n';
      csv += 'Setor,Valor\n';
      Object.entries(expensesBySectorExcel).forEach(([sector, value]) => {
        csv += `${sector},${value.toFixed(2)}\n`;
      });
      csv += '\n';
    }

    // Dados para gráfico de pizza (status)
    csv += 'DADOS GRÁFICO PIZZA (DESPESAS POR STATUS)\n';
    csv += 'Status,Valor\n';
    Object.entries(expensesByStatus).forEach(([status, value]) => {
      csv += `${STATUS_LABELS[status] || status},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Dados para gráfico de barras
    const expensesByMonthForCsv = Array(12).fill(0);
    expenses.forEach((expense) => {
      const date = dayjs(expense.date, 'DD/MM/YYYY', true);
      if (!date.isValid()) return;
      if (date.year() === period.year) {
        expensesByMonthForCsv[date.month()] += expense.value;
      }
    });
    csv += 'DADOS GRÁFICO BARRA (DESPESAS MENSAIS)\n';
    csv += 'Mês,Valor\n';
    expensesByMonthForCsv.forEach((value, month) => {
      csv += `${dayjs().month(month).format('MMMM')},${value.toFixed(2)}\n`;
    });
    csv += '\n';

    // Detalhamento por Setor de Despesas Fixas (após gráfico de barras mensais)
    if (Object.keys(expensesBySectorExcel).length > 0) {
      const expensesBySectorDetail: Record<string, Expense[]> = {};
      expenses.forEach((expense) => {
        // Inclui apenas parcelas geradas (is_fixed=false e tem installmentNumber)
        // Não inclui templates (is_fixed=true) para evitar duplicação
        if (expense.sector && expense.installmentNumber && !expense.isFixed) {
          const sector = SECTOR_LABELS[expense.sector] || expense.sector;
          if (!expensesBySectorDetail[sector]) {
            expensesBySectorDetail[sector] = [];
          }
          expensesBySectorDetail[sector].push(expense);
        }
      });

      // Ordena os setores pelo total de valor (decrescente)
      const sortedSectors = Object.keys(expensesBySectorDetail).sort((a, b) => {
        const totalA = expensesBySectorDetail[a].reduce((sum, exp) => sum + exp.value, 0);
        const totalB = expensesBySectorDetail[b].reduce((sum, exp) => sum + exp.value, 0);
        return totalB - totalA;
      });

      sortedSectors.forEach((sector) => {
        const sectorExpenses = expensesBySectorDetail[sector];
        const sectorTotal = sectorExpenses.reduce((sum, exp) => sum + exp.value, 0);
        
        csv += `DETALHAMENTO POR SETOR - ${sector}\n`;
        csv += `Total do Setor,${sectorTotal.toFixed(2)}\n`;
        csv += 'Data,Descrição,Categoria,Status,Valor\n';
        
        // Agrupa despesas deste setor por categoria
        const expensesByCategory: Record<string, Expense[]> = {};
        sectorExpenses.forEach((expense) => {
          const category = expense.category ? (CATEGORY_LABELS[expense.category] || expense.category) : 'Sem categoria';
          if (!expensesByCategory[category]) {
            expensesByCategory[category] = [];
          }
          expensesByCategory[category].push(expense);
        });

        // Ordena categorias por nome
        const sortedCategories = Object.keys(expensesByCategory).sort();
        
        // Para cada categoria, lista as despesas
        sortedCategories.forEach((category) => {
          const categoryExpenses = expensesByCategory[category];
          categoryExpenses
            .sort((a, b) => {
              // Ordena por data (mais recente primeiro)
              const dateA = dayjs(a.date, 'DD/MM/YYYY', true);
              const dateB = dayjs(b.date, 'DD/MM/YYYY', true);
              if (!dateA.isValid() || !dateB.isValid()) return 0;
              return dateB.valueOf() - dateA.valueOf();
            })
            .forEach((expense) => {
              const description = (expense.name || '').replace(/"/g, '""');
              const cat = expense.category ? (CATEGORY_LABELS[expense.category] || expense.category) : 'Sem categoria';
              const stat = expense.status ? (STATUS_LABELS[expense.status] || expense.status) : 'Sem status';
              csv += `${expense.date},"${description}",${cat},${stat},${expense.value.toFixed(2)}\n`;
            });
        });
        
        csv += '\n';
      });
    }

    // Salvar CSV
    const timestamp = Date.now();
    const fileUri = `${FileSystem.documentDirectory}relatorio_${periodLabel}_${centerLabel}_${timestamp}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    return fileUri;
  } catch (error: any) {
    console.error('Erro ao exportar Excel:', error);
    throw new Error(`Erro ao exportar Excel: ${error.message}`);
  }
};

