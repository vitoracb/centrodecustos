import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
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
  // Se não houver rótulo fixo, capitaliza o código para exibir de forma mais amigável
  return defaultLabels[center] || capitalize(String(center));
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

// Gera um gráfico de pizza em SVG (compatível com PDF via expo-print)
const generatePieChartSVG = (
  data: Array<{ label: string; value: number; color: string }>,
  size: number = 180,
): string => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Gráfico vazio se não houver dados
  if (total === 0 || data.length === 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#E5E5EA" stroke="#D1D1D6" stroke-width="1"/>
    </svg>`;
  }

  // Caso especial: apenas uma fatia com valor > 0
  if (data.length === 1 && data[0].value > 0) {
    const color = data[0].color;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
    </svg>`;
  }

  const radius = size / 2 - 2;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90; // Começa no topo
  const paths: string[] = [];

  data.forEach((item) => {
    const percentage = (item.value / total) * 100;
    // Ignora fatias muito pequenas (<0.1%) para evitar artefatos visuais
    if (percentage < 0.1) return;

    const angle = (percentage / 100) * 360;
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + angle) * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      'Z',
    ].join(' ');

    paths.push(
      `<path d="${pathData}" fill="${item.color}" stroke="#FFFFFF" stroke-width="2"/>`,
    );

    currentAngle += angle;
  });

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${paths.join('\n    ')}
  </svg>`;
};

const REPORT_LOGO_URL =
  'https://foffmjqekmeogsldehbr.supabase.co/storage/v1/object/public/app-assets/logonoworiginal.png';

const REPORT_LOGO_CACHE_PATH = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}report_logo_nowtranding_dataurl.txt`;

export interface ReportData {
  expenses: Expense[];
  receipts: Receipt[];
  period: { month?: number; year: number };
  center?: CostCenter;
}

export const buildReportHTML = (data: ReportData, logoSrcOverride?: string): string => {
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

  const totalReceiptsForPie = Object.values(receiptsBySource).reduce(
    (sum, value) => sum + value,
    0,
  );

  // Dados SVG para gráfico de pizza de recebimentos
  const receiptsPieData = Object.entries(receiptsBySource).map(
    ([source, value], index) => ({
      label: source,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }),
  );
  const receiptsPieSVG = generatePieChartSVG(receiptsPieData);

  // Agrupar despesas por categoria
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((expense) => {
    // Garante que categorias desconhecidas (ex: 'teste') sejam tratadas como 'Diversos'
    const rawCategory = expense.category && CATEGORY_LABELS[expense.category] ? expense.category : 'diversos';
    const category = CATEGORY_LABELS[rawCategory] || 'Diversos';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.value;
  });

  // Agrupar despesas por status (sempre exibindo com inicial maiúscula)
  const expensesByStatus: Record<string, number> = {};
  expenses.forEach((expense) => {
    const rawStatus = expense.status
      ? (STATUS_LABELS[expense.status] || expense.status)
      : 'Sem status';
    const status = capitalize(rawStatus);
    expensesByStatus[status] = (expensesByStatus[status] || 0) + expense.value;
  });

  // Agrupar despesas por setor: usa todas as despesas que possuem setor,
  // para que o total por setor possa bater com o total por categoria
  const expensesForSector = expenses.filter((expense) => !!expense.sector);

  const expensesBySector: Record<string, number> = {};
  expensesForSector.forEach((expense) => {
    const sector = expense.sector ? (SECTOR_LABELS[expense.sector] || expense.sector) : 'Sem setor';
    expensesBySector[sector] = (expensesBySector[sector] || 0) + expense.value;
  });

  // Dados para gráfico de pizza (categorias)
  const totalCategories = Object.values(expensesByCategory).reduce(
    (sum, value) => sum + value,
    0,
  );
  const categoryPieData = Object.entries(expensesByCategory).map(
    ([category, value], index) => ({
      label: category,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }),
  );
  const categoryPieSVG = generatePieChartSVG(categoryPieData);

  // Dados para gráfico de pizza (status)
  const totalStatus = Object.values(expensesByStatus).reduce(
    (sum, value) => sum + value,
    0,
  );
  const statusPieData = Object.entries(expensesByStatus).map(
    ([status, value], index) => ({
      label: status,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }),
  );
  const statusPieSVG = generatePieChartSVG(statusPieData);

  // Dados para gráfico de pizza (setores)
  const totalSectors = Object.values(expensesBySector).reduce(
    (sum, value) => sum + value,
    0,
  );
  const sectorPieData = Object.entries(expensesBySector).map(([sector, value]) => {
    const sectorKey = Object.keys(SECTOR_LABELS).find(
      key => SECTOR_LABELS[key] === sector,
    );
    const color =
      sectorKey && SECTOR_COLORS[sectorKey]
        ? SECTOR_COLORS[sectorKey]
        : CHART_COLORS[
            Object.keys(expensesBySector).indexOf(sector) % CHART_COLORS.length
          ];
    return { label: sector, value, color };
  });
  const sectorPieSVG = generatePieChartSVG(sectorPieData);

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

  // Define a origem do logo (padrão: URL remota, mas pode ser sobrescrita por data URL base64)
  const logoSrc = logoSrcOverride || REPORT_LOGO_URL;

  // Gerar HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Financeiro</title>
  <style>
    @page {
      margin: 20px 15px 40px 15px;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 10px 0;
      color: #1C1C1E;
      background-color: #FFFFFF;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #000000;
    }
    .logo {
      width: 60px !important;
      height: 60px !important;
      max-width: 60px !important;
      max-height: 60px !important;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: block;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #000000;
      margin: 0;
      line-height: 1.2;
    }
    .report-title {
      font-size: 16px;
      color: #000000;
      margin: 5px 0 0 0;
      font-weight: normal;
    }
    h1 {
      color: #000000;
      border-bottom: 2px solid #000000;
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
      padding: 9px;
      text-align: left;
      border-bottom: 1px solid #E5E5EA;
      font-size: 12px;
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
      border: 1px solid #E5E5EA;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 14px;
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
    .chart-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .chart-section {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
      margin: 20px 0;
    }
    .pie-chart-container {
      width: 160px;
      height: 160px;
      flex-shrink: 0;
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
      font-size: 12px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid #D1D1D6;
    }
    .bar-chart {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      height: 160px;
      padding: 8px 0;
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
    <img src="${logoSrc}" alt="Now Tranding" class="logo">
    <div class="company-info">
      <h1 class="company-name">Now Tranding</h1>
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
  <div class="chart-block">
    <h2>Recebimentos</h2>
    <div class="chart-section">
      <div class="pie-chart-container">${receiptsPieSVG}</div>
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
  </div>
  ` : ''}

  <div class="chart-block">
    <h2>Despesas por Categoria</h2>
    ${Object.keys(expensesByCategory).length > 0 ? `
    <div class="chart-section">
      <div class="pie-chart-container">${categoryPieSVG}</div>
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
  </div>
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

  <div class="chart-block">
    <h2>Despesas por Status</h2>
    ${Object.keys(expensesByStatus).length > 0 ? `
    <div class="chart-section">
      <div class="pie-chart-container">${statusPieSVG}</div>
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
  </div>
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
  <div class="chart-block">
    <h2>Despesas por Setor</h2>
    ${Object.keys(expensesBySector).length > 0 ? `
    <div class="chart-section">
      <div class="pie-chart-container">${sectorPieSVG}</div>
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

  <div class="chart-block">
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

// Obtém o logo em formato data URL (base64) para ser embutido no HTML compartilhado
// Usa cache local para evitar baixar/recodificar a cada exportação
const getReportLogoDataUrl = async (): Promise<string | null> => {
  try {
    // 1) Tenta ler do cache
    const info = await FileSystem.getInfoAsync(REPORT_LOGO_CACHE_PATH);
    if (info.exists) {
      const cached = await FileSystem.readAsStringAsync(REPORT_LOGO_CACHE_PATH, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (cached && cached.startsWith('data:image/')) {
        return cached;
      }
    }

    // 2) Baixa o arquivo de imagem do Supabase
    const downloadDest = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}report_logo_nowtranding.png`;
    const downloadResult = await FileSystem.downloadAsync(REPORT_LOGO_URL, downloadDest);

    // 3) Lê como base64
    const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const dataUrl = `data:image/png;base64,${base64}`;

    // 4) Salva no cache para próximas vezes
    await FileSystem.writeAsStringAsync(REPORT_LOGO_CACHE_PATH, dataUrl, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return dataUrl;
  } catch (error) {
    console.warn('⚠️ Não foi possível gerar data URL do logo do relatório, usando URL remota como fallback:', error);
    return null;
  }
};

export const exportToPDF = async (data: ReportData): Promise<string> => {
  try {
    console.log('📄 [exportToPDF] Iniciando geração de PDF...');

    // 1) Gera HTML com logo embutido (base64) para evitar problemas em visualizadores externos
    const logoDataUrl = await getReportLogoDataUrl();
    const html = buildReportHTML(data, logoDataUrl ?? undefined);

    console.log('✅ [exportToPDF] HTML gerado, convertendo para PDF...');

    // 2) Converte HTML -> PDF usando expo-print (gera PDF temporário)
    const { uri: tempPdfUri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('✅ [exportToPDF] PDF temporário criado:', tempPdfUri);

    // 3) Monta nome final do arquivo com período e centro de custo
    const timestamp = Date.now();
    const periodLabel = data.period.month !== undefined
      ? `${capitalize(dayjs().month(data.period.month).format('MMMM'))}_${data.period.year}`
      : `Ano_${data.period.year}`;
    const centerLabel = data.center ? getCenterLabel(data.center).replace(/\s+/g, '_') : 'Todos_Centros';

    const finalPdfPath = `${FileSystem.documentDirectory}relatorio_${periodLabel}_${centerLabel}_${timestamp}.pdf`;

    // 4) Move o PDF temporário para o caminho definitivo com nome descritivo
    await FileSystem.moveAsync({
      from: tempPdfUri,
      to: finalPdfPath,
    });

    console.log('✅ [exportToPDF] PDF final salvo em:', finalPdfPath);

    return finalPdfPath;
  } catch (error: any) {
    console.error('❌ [exportToPDF] Erro ao exportar PDF:', error);
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

