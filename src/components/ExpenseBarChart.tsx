import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';
import { Expense } from '../context/FinancialContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface ExpenseBarChartProps {
  expenses: Expense[];
}

const MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const ExpenseBarChart = ({ expenses }: ExpenseBarChartProps) => {
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  const chartData = useMemo(() => {
    const totalsByMonth: Record<number, number> = {};

    // Inicializar todos os meses com 0
    for (let i = 0; i < 12; i++) {
      totalsByMonth[i] = 0;
    }

    expenses.forEach((expense) => {
      const [day, month, year] = expense.date.split('/').map(Number);
      if (month && month >= 1 && month <= 12 && year === selectedYear) {
        const monthIndex = month - 1; // Converter para índice 0-11
        totalsByMonth[monthIndex] += expense.value;
      }
    });

    const values = Object.values(totalsByMonth);
    const maxValue = Math.max(...values, 1); // Mínimo de 1 para evitar divisão por zero

    return {
      data: Object.entries(totalsByMonth).map(([monthIndex, value]) => ({
        month: Number(monthIndex),
        value,
        percentage: (value / maxValue) * 100,
      })),
      maxValue,
    };
  }, [expenses, selectedYear]);

  const chartWidth = 350;
  const chartHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const barWidth = (chartWidth - paddingLeft - paddingRight) / 12 - 2;
  const maxBarHeight = chartHeight - paddingTop - paddingBottom;

  const formatCurrency = (value: number): string => {
    if (value === 0) return 'R$ 0';
    if (value < 1000) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calcular valores para o eixo Y (5 marcas)
  const yAxisSteps = 5;
  const yAxisValues: number[] = [];
  for (let i = 0; i <= yAxisSteps; i++) {
    yAxisValues.push((chartData.maxValue / yAxisSteps) * i);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Despesas por Mês</Text>
        <View style={styles.yearNavigator}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setSelectedYear((prev) => prev - 1)}
          >
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.yearValue}>{selectedYear}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setSelectedYear((prev) => prev + 1)}
          >
            <Text style={styles.navButtonText}>→</Text>
          </TouchableOpacity>
        </View>
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
            {chartData.data.map((item, index) => {
              const barHeight = (item.percentage / 100) * maxBarHeight;
              const x = paddingLeft + index * (barWidth + 2);
              const y = paddingTop + maxBarHeight - barHeight;

              return (
                <G key={`bar-${item.month}`}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="#0A84FF"
                    rx="4"
                  />
                  {/* Valor acima da barra se for maior que 0 */}
                  {item.value > 0 && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 4}
                      fontSize="9"
                      fill="#1C1C1E"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {formatCurrency(item.value)}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {/* Eixo X - Meses */}
            {chartData.data.map((item, index) => {
              const x = paddingLeft + index * (barWidth + 2) + barWidth / 2;
              return (
                <SvgText
                  key={`x-label-${item.month}`}
                  x={x}
                  y={chartHeight - paddingBottom + 20}
                  fontSize="10"
                  fill="#6C6C70"
                  textAnchor="middle"
                >
                  {MONTHS[item.month]}
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
  yearNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navButton: {
    padding: 4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A84FF',
  },
  yearValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    minWidth: 50,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});

