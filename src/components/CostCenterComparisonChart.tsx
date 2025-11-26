import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';
import { Expense, Receipt } from '../context/FinancialContext';
import { CostCenter } from '../context/CostCenterContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const CENTER_COLORS: Record<CostCenter, string> = {
  valenca: '#0A84FF', // Azul
  cna: '#34C759', // Verde
  cabralia: '#FFD700', // Amarelo
};

const CENTER_LABELS: Record<CostCenter, string> = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

interface CostCenterComparisonChartProps {
  expenses: Expense[];
  receipts: Receipt[];
  mode: 'expenses' | 'receipts' | 'balance';
  period: { month?: number; year: number };
}

export const CostCenterComparisonChart = ({
  expenses,
  receipts,
  mode,
  period,
}: CostCenterComparisonChartProps) => {
  const chartData = useMemo(() => {
    const centers: CostCenter[] = ['valenca', 'cna', 'cabralia'];
    const data: Array<{ center: CostCenter; expenses: number; receipts: number; balance: number }> = [];

    centers.forEach((center) => {
      let centerExpenses = 0;
      let centerReceipts = 0;

      // Calcular despesas do centro
      expenses.forEach((expense) => {
        if (expense.center !== center) return;
        
        const [day, month, year] = expense.date.split('/').map(Number);
        if (month && year) {
          const expenseMonth = month - 1;
          if (period.month !== undefined) {
            if (expenseMonth === period.month && year === period.year) {
              centerExpenses += expense.value;
            }
          } else {
            if (year === period.year) {
              centerExpenses += expense.value;
            }
          }
        }
      });

      // Calcular recebimentos do centro
      receipts.forEach((receipt) => {
        if (receipt.center !== center) return;
        
        const [day, month, year] = receipt.date.split('/').map(Number);
        if (month && year) {
          const receiptMonth = month - 1;
          if (period.month !== undefined) {
            if (receiptMonth === period.month && year === period.year) {
              centerReceipts += receipt.value;
            }
          } else {
            if (year === period.year) {
              centerReceipts += receipt.value;
            }
          }
        }
      });

      data.push({
        center,
        expenses: centerExpenses,
        receipts: centerReceipts,
        balance: centerReceipts - centerExpenses,
      });
    });

    return data;
  }, [expenses, receipts, period]);

  const chartWidth = 350;
  const chartHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const barWidth = (chartWidth - paddingLeft - paddingRight) / 3 - 8;
  const maxBarHeight = chartHeight - paddingTop - paddingBottom;

  const formatCurrency = (value: number): string => {
    if (value === 0) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Determinar valores para o eixo Y
  const values = chartData.map((d) => {
    if (mode === 'expenses') return d.expenses;
    if (mode === 'receipts') return d.receipts;
    return Math.abs(d.balance);
  });
  const maxValue = Math.max(...values, 1);
  const minValue = mode === 'balance' ? Math.min(...values.map(v => -Math.abs(v)), 0) : 0;

  // Calcular valores para o eixo Y (5 marcas)
  const yAxisSteps = 5;
  const yAxisValues: number[] = [];
  const range = maxValue - minValue;
  for (let i = 0; i <= yAxisSteps; i++) {
    yAxisValues.push(minValue + (range / yAxisSteps) * i);
  }

  const getBarData = (item: typeof chartData[0]) => {
    // Usar a cor específica do centro de custo
    const centerColor = CENTER_COLORS[item.center];
    
    if (mode === 'expenses') {
      return { value: item.expenses, color: centerColor };
    }
    if (mode === 'receipts') {
      return { value: item.receipts, color: centerColor };
    }
    // Balance: usar cor do centro, mas escurecer se negativo
    return {
      value: item.balance,
      color: item.balance >= 0 ? centerColor : '#FF3B30', // Vermelho se negativo
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'expenses' 
            ? 'Despesas por Centro' 
            : mode === 'receipts' 
            ? 'Recebimentos por Centro' 
            : 'Saldo por Centro'}
        </Text>
      </View>
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <G>
            {/* Linhas de grade horizontais */}
            {yAxisValues.map((value, index) => {
              const y = paddingTop + (maxBarHeight / yAxisSteps) * (yAxisSteps - index);
              return (
                <Line
                  key={`grid-${index}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#E5E5EA"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Linha zero para balance */}
            {mode === 'balance' && (
              <Line
                x1={paddingLeft}
                y1={paddingTop + maxBarHeight / 2}
                x2={chartWidth - paddingRight}
                y2={paddingTop + maxBarHeight / 2}
                stroke="#1C1C1E"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}

            {/* Valores do eixo Y */}
            {yAxisValues.map((value, index) => {
              const y = paddingTop + (maxBarHeight / yAxisSteps) * (yAxisSteps - index);
              return (
                <SvgText
                  key={`y-label-${index}`}
                  x={paddingLeft - 8}
                  y={y + 4}
                  fontSize="10"
                  fill="#6C6C70"
                  textAnchor="end"
                >
                  {formatCurrency(value)}
                </SvgText>
              );
            })}

            {/* Barras */}
            {chartData.map((item, index) => {
              const barData = getBarData(item);
              const barValue = mode === 'balance' ? Math.abs(barData.value) : barData.value;
              const barHeight = (barValue / maxValue) * maxBarHeight;
              
              let y: number;
              if (mode === 'balance') {
                // Para balance, barras positivas sobem, negativas descem
                const zeroY = paddingTop + maxBarHeight / 2;
                if (barData.value >= 0) {
                  y = zeroY - barHeight;
                } else {
                  y = zeroY;
                }
              } else {
                y = paddingTop + maxBarHeight - barHeight;
              }

              const x = paddingLeft + index * (barWidth + 8) + 4;

              return (
                <G key={item.center}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={barData.color}
                    rx="4"
                  />
                  {/* Valor acima/abaixo da barra */}
                  {barValue > 0 && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={mode === 'balance' && barData.value < 0 ? y + barHeight + 14 : y - 4}
                      fontSize="9"
                      fill="#1C1C1E"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {formatCurrency(barData.value)}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {/* Eixo X - Centros */}
            {chartData.map((item, index) => {
              const x = paddingLeft + index * (barWidth + 8) + 4 + barWidth / 2;
              return (
                <SvgText
                  key={`x-label-${item.center}`}
                  x={x}
                  y={chartHeight - paddingBottom + 20}
                  fontSize="10"
                  fill="#6C6C70"
                  textAnchor="middle"
                >
                  {CENTER_LABELS[item.center]}
                </SvgText>
              );
            })}

            {/* Linha do eixo X */}
            <Line
              x1={paddingLeft}
              y1={paddingTop + maxBarHeight}
              x2={chartWidth - paddingRight}
              y2={paddingTop + maxBarHeight}
              stroke="#1C1C1E"
              strokeWidth="2"
            />

            {/* Linha do eixo Y */}
            <Line
              x1={paddingLeft}
              y1={paddingTop}
              x2={paddingLeft}
              y2={paddingTop + maxBarHeight}
              stroke="#1C1C1E"
              strokeWidth="2"
            />
          </G>
        </Svg>
      </View>
      <View style={styles.legend}>
        {chartData.map((item) => {
          const barData = getBarData(item);
          return (
            <View key={item.center} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: barData.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel}>{CENTER_LABELS[item.center]}</Text>
                <Text style={styles.legendValue}>{formatCurrency(barData.value)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  legend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

